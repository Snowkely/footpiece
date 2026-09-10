import type { GeometryBuildResult, GeometryValidationError } from '../types';
import type { BroadMultiSupportSearchCandidateSummary } from './broadMultiSupportSearch';
import {
    DEFAULT_SUGGESTED_CANDIDATE_RANKING_CONFIG,
    rankMultiSupportCandidatesBySoftScore,
    type SuggestedCandidateMetricWeights,
    type SuggestedCandidateRawMetrics,
} from './suggestedMultiSupportCandidates';

export interface MultiSupportQualityPoolConfig {
    fraction: number;
    minPoolSize: number;
}

export const DEFAULT_MULTI_SUPPORT_QUALITY_POOL_CONFIG: MultiSupportQualityPoolConfig = {
    fraction: 0.25,
    minPoolSize: 20,
};

export const QUALITY_POOL_FRACTION_OPTIONS = [0.1, 0.2, 0.25, 0.3, 0.5] as const;

export interface QualityPoolCandidateSummary {
    sourceCandidateId: number;
    alpha: number;
    thetaDeg: number;
    lambdaCm: number;
    softScore: number;
    diagnostics: SuggestedCandidateRawMetrics;
    referenceLengthCm: number;
    outerLengthCm: number;
    extraLengthCm: number;
}

export interface MultiSupportQualityPoolResult {
    validPoolSize: number;
    requestedFraction: number;
    minPoolSize: number;
    targetPoolSize: number;
    actualPoolSize: number;
    candidates: QualityPoolCandidateSummary[];
    excludedDiagnosticsUnavailable: number;
    scoreMin?: number;
    scoreMax?: number;
    warnings: GeometryValidationError[];
}

export interface MultiSupportQualityPoolInput {
    validCandidates: readonly BroadMultiSupportSearchCandidateSummary[];
    qualityPoolConfig?: MultiSupportQualityPoolConfig;
    rankingWeights?: SuggestedCandidateMetricWeights;
}

function invalidConfig(message: string): GeometryValidationError {
    return { code: 'QUALITY_POOL_CONFIG_INVALID', message };
}

function validateConfig(config: MultiSupportQualityPoolConfig): GeometryValidationError[] {
    if (!Number.isFinite(config.fraction) || config.fraction <= 0 || config.fraction > 1) {
        return [invalidConfig('Quality Pool fraction must be finite and within (0, 1].')];
    }
    if (
        !Number.isFinite(config.minPoolSize) ||
        !Number.isInteger(config.minPoolSize) ||
        config.minPoolSize < 0
    ) {
        return [invalidConfig('Quality Pool minimum size must be a non-negative integer.')];
    }
    return [];
}

/**
 * Step 9B only ranks the supplied Broad VALID lightweight summaries. It reuses
 * the Step 8 soft-score pipeline and deliberately adds no parameter or shape
 * diversity preference.
 */
export function buildMultiSupportQualityPool({
    validCandidates,
    qualityPoolConfig = DEFAULT_MULTI_SUPPORT_QUALITY_POOL_CONFIG,
    rankingWeights = DEFAULT_SUGGESTED_CANDIDATE_RANKING_CONFIG.weights,
}: MultiSupportQualityPoolInput): GeometryBuildResult<MultiSupportQualityPoolResult> {
    const errors = validateConfig(qualityPoolConfig);
    if (errors.length) {
        return { errors };
    }

    const rankingResult = rankMultiSupportCandidatesBySoftScore(validCandidates, rankingWeights);
    if (!rankingResult.geometry) {
        return { errors: rankingResult.errors };
    }

    const validPoolSize = validCandidates.length;
    const targetPoolSize = Math.min(
        validPoolSize,
        Math.max(
            Math.ceil(validPoolSize * qualityPoolConfig.fraction),
            qualityPoolConfig.minPoolSize,
        ),
    );
    const selected = rankingResult.geometry.candidates.slice(0, targetPoolSize);
    const candidates = selected.map(
        (candidate): QualityPoolCandidateSummary => ({
            sourceCandidateId: candidate.source.id,
            alpha: candidate.source.alpha,
            thetaDeg: candidate.source.thetaDeg,
            lambdaCm: candidate.source.lambdaCm,
            softScore: candidate.softScore,
            diagnostics: { ...candidate.rawMetrics },
            referenceLengthCm: candidate.source.referenceLengthCm,
            outerLengthCm: candidate.source.outerLengthCm,
            extraLengthCm: candidate.source.extraLengthCm,
        }),
    );
    const scores = candidates.map((candidate) => candidate.softScore);
    const excludedDiagnosticsUnavailable =
        rankingResult.geometry.excludedBecauseDiagnosticsUnavailable;

    return {
        geometry: {
            validPoolSize,
            requestedFraction: qualityPoolConfig.fraction,
            minPoolSize: qualityPoolConfig.minPoolSize,
            targetPoolSize,
            actualPoolSize: candidates.length,
            candidates,
            excludedDiagnosticsUnavailable,
            scoreMin: scores.length ? Math.min(...scores) : undefined,
            scoreMax: scores.length ? Math.max(...scores) : undefined,
            warnings: excludedDiagnosticsUnavailable
                ? [
                      {
                          code: 'QUALITY_POOL_DIAGNOSTICS_UNAVAILABLE',
                          message: `${excludedDiagnosticsUnavailable} Broad VALID candidate(s) remain in history but were excluded from Quality Pool ranking because all weighted diagnostics were unavailable.`,
                      },
                  ]
                : [],
        },
        errors: [],
    };
}
