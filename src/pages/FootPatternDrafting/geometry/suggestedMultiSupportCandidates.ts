import type { GeometryBuildResult, GeometryValidationError } from '../types';
import type {
    NearbyMultiSupportSearchCandidateSummary,
    NearbyMultiSupportSearchConfig,
} from './targetMultiSupportOuterCurveSearch';

export type SuggestedCandidateCount = 3 | 5 | 8;

export interface SuggestedCandidateMetricWeights {
    lEndpointMismatch: number;
    gPrimeEndpointMismatch: number;
    maxToeTurning: number;
    toeTurningVariation: number;
}

export interface SuggestedCandidateRankingConfig {
    resultCount: SuggestedCandidateCount;
    weights: SuggestedCandidateMetricWeights;
    diversityThreshold: number;
}

export interface SuggestedCandidateRawMetrics {
    lEndpointMismatchDeg?: number;
    gPrimeEndpointMismatchDeg?: number;
    maxToeTurningDeg?: number;
    toeTurningVariationDeg?: number;
}

export interface SuggestedCandidateNormalizedMetrics {
    lEndpointMismatch?: number;
    gPrimeEndpointMismatch?: number;
    maxToeTurning?: number;
    toeTurningVariation?: number;
}

export interface SuggestedMultiSupportCandidate {
    suggestionIndex: number;
    sourceCandidateId: number;
    alpha: number;
    thetaDeg: number;
    lambdaCm: number;
    softScore: number;
    rawMetrics: SuggestedCandidateRawMetrics;
    normalizedMetrics: SuggestedCandidateNormalizedMetrics;
    referenceLengthCm: number;
    outerLengthCm: number;
    extraLengthCm: number;
    minimumDistanceToOtherSelected?: number;
}

export interface SuggestedCandidateSelectionResult {
    requestedCount: number;
    actualCount: number;
    validPoolSize: number;
    suggestions: SuggestedMultiSupportCandidate[];
    requestedDiversityThreshold: number;
    usedDiversityThreshold: number;
    rankingConfig: SuggestedCandidateRankingConfig;
    excludedBecauseDiagnosticsUnavailable: number;
    warnings: GeometryValidationError[];
}

export interface SuggestedCandidateSelectionInput {
    validCandidates: readonly NearbyMultiSupportSearchCandidateSummary[];
    effectiveSearchConfig: NearbyMultiSupportSearchConfig;
    rankingConfig?: SuggestedCandidateRankingConfig;
}

export const DEFAULT_SUGGESTED_CANDIDATE_RANKING_CONFIG: SuggestedCandidateRankingConfig = {
    resultCount: 5,
    weights: {
        lEndpointMismatch: 0.25,
        gPrimeEndpointMismatch: 0.25,
        maxToeTurning: 0.25,
        toeTurningVariation: 0.25,
    },
    diversityThreshold: 0.15,
};

export const SUGGESTED_DIVERSITY_RELAXATION_STEP = 0.05;

const SUGGESTED_NUMERIC_EPSILON = 1e-10;
const SCORE_TIE_TOLERANCE = 1e-12;
const THRESHOLD_QUANTIZATION_DIGITS = 10;

type MetricKey = keyof SuggestedCandidateNormalizedMetrics;

const METRIC_KEYS: MetricKey[] = [
    'lEndpointMismatch',
    'gPrimeEndpointMismatch',
    'maxToeTurning',
    'toeTurningVariation',
];

interface RankableCandidate {
    source: NearbyMultiSupportSearchCandidateSummary;
    rawMetrics: SuggestedCandidateRawMetrics;
    normalizedMetrics: SuggestedCandidateNormalizedMetrics;
    softScore: number;
}

function invalidConfig(message: string): GeometryValidationError {
    return { code: 'SUGGESTED_CANDIDATE_CONFIG_INVALID', message };
}

function finiteMetric(value: number | undefined): number | undefined {
    return value !== undefined && Number.isFinite(value) ? value : undefined;
}

function rawMetrics(
    candidate: NearbyMultiSupportSearchCandidateSummary,
): SuggestedCandidateRawMetrics {
    return {
        lEndpointMismatchDeg: finiteMetric(candidate.diagnostics.lEndpointTangentMismatchDeg),
        gPrimeEndpointMismatchDeg: finiteMetric(
            candidate.diagnostics.gPrimeEndpointTangentMismatchDeg,
        ),
        maxToeTurningDeg: finiteMetric(candidate.diagnostics.maxToeTurningDeg),
        toeTurningVariationDeg: finiteMetric(candidate.diagnostics.toeTurningVariationDeg),
    };
}

function rawMetricValue(metrics: SuggestedCandidateRawMetrics, key: MetricKey): number | undefined {
    const mapping: Record<MetricKey, keyof SuggestedCandidateRawMetrics> = {
        lEndpointMismatch: 'lEndpointMismatchDeg',
        gPrimeEndpointMismatch: 'gPrimeEndpointMismatchDeg',
        maxToeTurning: 'maxToeTurningDeg',
        toeTurningVariation: 'toeTurningVariationDeg',
    };
    return metrics[mapping[key]];
}

function validateRankingConfig(
    config: SuggestedCandidateRankingConfig,
    effectiveSearchConfig: NearbyMultiSupportSearchConfig,
): GeometryValidationError[] {
    if (![3, 5, 8].includes(config.resultCount)) {
        return [invalidConfig('Suggested result count must be 3, 5, or 8.')];
    }
    const weights = Object.values(config.weights);
    if (weights.some((weight) => !Number.isFinite(weight) || weight < 0)) {
        return [invalidConfig('Suggested-candidate weights must be finite and non-negative.')];
    }
    if (weights.reduce((total, weight) => total + weight, 0) <= SUGGESTED_NUMERIC_EPSILON) {
        return [invalidConfig('At least one suggested-candidate weight must be positive.')];
    }
    if (!Number.isFinite(config.diversityThreshold) || config.diversityThreshold < 0) {
        return [invalidConfig('Suggested-candidate diversity threshold must be non-negative.')];
    }
    const radii = [
        effectiveSearchConfig.alphaRadius,
        effectiveSearchConfig.thetaRadiusDeg,
        effectiveSearchConfig.lambdaRadiusCm,
    ];
    if (radii.some((radius) => !Number.isFinite(radius) || radius < 0)) {
        return [invalidConfig('Effective nearby-search radii must be finite and non-negative.')];
    }
    return [];
}

function normalizedWeights(
    weights: SuggestedCandidateMetricWeights,
): SuggestedCandidateMetricWeights {
    const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    return {
        lEndpointMismatch: weights.lEndpointMismatch / total,
        gPrimeEndpointMismatch: weights.gPrimeEndpointMismatch / total,
        maxToeTurning: weights.maxToeTurning / total,
        toeTurningVariation: weights.toeTurningVariation / total,
    };
}

function metricRanges(
    candidates: SuggestedCandidateRawMetrics[],
): Record<MetricKey, { minimum: number; maximum: number } | undefined> {
    return Object.fromEntries(
        METRIC_KEYS.map((key) => {
            const values = candidates
                .map((metrics) => rawMetricValue(metrics, key))
                .filter((value): value is number => value !== undefined);
            return [
                key,
                values.length
                    ? { minimum: Math.min(...values), maximum: Math.max(...values) }
                    : undefined,
            ];
        }),
    ) as Record<MetricKey, { minimum: number; maximum: number } | undefined>;
}

function normalizeMetrics(
    metrics: SuggestedCandidateRawMetrics,
    ranges: ReturnType<typeof metricRanges>,
): SuggestedCandidateNormalizedMetrics {
    return Object.fromEntries(
        METRIC_KEYS.flatMap((key) => {
            const value = rawMetricValue(metrics, key);
            const range = ranges[key];
            if (value === undefined || !range) {
                return [];
            }
            const span = range.maximum - range.minimum;
            return [[key, span <= SUGGESTED_NUMERIC_EPSILON ? 0 : (value - range.minimum) / span]];
        }),
    );
}

function calculateSoftScore(
    metrics: SuggestedCandidateNormalizedMetrics,
    weights: SuggestedCandidateMetricWeights,
): number | undefined {
    let weightedTotal = 0;
    let availableWeight = 0;
    METRIC_KEYS.forEach((key) => {
        const value = metrics[key];
        const weight = weights[key];
        if (value !== undefined && weight > 0) {
            weightedTotal += value * weight;
            availableWeight += weight;
        }
    });
    return availableWeight <= SUGGESTED_NUMERIC_EPSILON
        ? undefined
        : weightedTotal / availableWeight;
}

/** Parameter-space distance normalized by the effective nearby-search radii. */
export function suggestedCandidateParameterDistance(
    first: Pick<NearbyMultiSupportSearchCandidateSummary, 'alpha' | 'thetaDeg' | 'lambdaCm'>,
    second: Pick<NearbyMultiSupportSearchCandidateSummary, 'alpha' | 'thetaDeg' | 'lambdaCm'>,
    config: Pick<
        NearbyMultiSupportSearchConfig,
        'alphaRadius' | 'thetaRadiusDeg' | 'lambdaRadiusCm'
    >,
): number {
    const normalizedDifferences: number[] = [];
    if (config.alphaRadius > SUGGESTED_NUMERIC_EPSILON) {
        normalizedDifferences.push((first.alpha - second.alpha) / config.alphaRadius);
    }
    if (config.thetaRadiusDeg > SUGGESTED_NUMERIC_EPSILON) {
        normalizedDifferences.push((first.thetaDeg - second.thetaDeg) / config.thetaRadiusDeg);
    }
    if (config.lambdaRadiusCm > SUGGESTED_NUMERIC_EPSILON) {
        normalizedDifferences.push((first.lambdaCm - second.lambdaCm) / config.lambdaRadiusCm);
    }
    return Math.hypot(...normalizedDifferences);
}

export function buildSuggestedDiversityThresholdSequence(requestedThreshold: number): number[] {
    const values: number[] = [];
    for (
        let threshold = requestedThreshold;
        threshold > SUGGESTED_NUMERIC_EPSILON;
        threshold -= SUGGESTED_DIVERSITY_RELAXATION_STEP
    ) {
        values.push(Number(Math.max(0, threshold).toFixed(THRESHOLD_QUANTIZATION_DIGITS)));
    }
    if (!values.includes(0)) {
        values.push(0);
    }
    return [...new Set(values)];
}

function greedilySelect(
    ranked: RankableCandidate[],
    requestedCount: number,
    threshold: number,
    effectiveSearchConfig: NearbyMultiSupportSearchConfig,
): RankableCandidate[] {
    const selected: RankableCandidate[] = [];
    for (const candidate of ranked) {
        if (
            selected.every(
                (existing) =>
                    suggestedCandidateParameterDistance(
                        candidate.source,
                        existing.source,
                        effectiveSearchConfig,
                    ) +
                        SUGGESTED_NUMERIC_EPSILON >=
                    threshold,
            )
        ) {
            selected.push(candidate);
        }
        if (selected.length === requestedCount) {
            break;
        }
    }
    return selected;
}

/**
 * Ranks only the supplied VALID nearby-search summaries, then greedily removes
 * parameter-near duplicates. It is pure, deterministic, and stores no curve polylines.
 */
export function selectSuggestedMultiSupportCandidates({
    validCandidates,
    effectiveSearchConfig,
    rankingConfig = DEFAULT_SUGGESTED_CANDIDATE_RANKING_CONFIG,
}: SuggestedCandidateSelectionInput): GeometryBuildResult<SuggestedCandidateSelectionResult> {
    const errors = validateRankingConfig(rankingConfig, effectiveSearchConfig);
    if (errors.length) {
        return { errors };
    }

    const normalizedConfig: SuggestedCandidateRankingConfig = {
        resultCount: rankingConfig.resultCount,
        weights: normalizedWeights(rankingConfig.weights),
        diversityThreshold: rankingConfig.diversityThreshold,
    };
    const candidateMetrics = validCandidates.map((candidate) => rawMetrics(candidate));
    const ranges = metricRanges(candidateMetrics);
    const ranked = validCandidates
        .map((candidate, index): RankableCandidate | undefined => {
            const metrics = candidateMetrics[index];
            const normalized = normalizeMetrics(metrics, ranges);
            const softScore = calculateSoftScore(normalized, normalizedConfig.weights);
            return softScore === undefined
                ? undefined
                : {
                      source: candidate,
                      rawMetrics: metrics,
                      normalizedMetrics: normalized,
                      softScore,
                  };
        })
        .filter((candidate): candidate is RankableCandidate => candidate !== undefined)
        .sort((first, second) => {
            const scoreDifference = first.softScore - second.softScore;
            return Math.abs(scoreDifference) > SCORE_TIE_TOLERANCE
                ? scoreDifference
                : first.source.id - second.source.id;
        });

    const targetCount = Math.min(normalizedConfig.resultCount, ranked.length);
    const excludedBecauseDiagnosticsUnavailable = validCandidates.length - ranked.length;
    let selected: RankableCandidate[] = [];
    let usedThreshold = normalizedConfig.diversityThreshold;
    for (const threshold of buildSuggestedDiversityThresholdSequence(
        normalizedConfig.diversityThreshold,
    )) {
        selected = greedilySelect(ranked, targetCount, threshold, effectiveSearchConfig);
        usedThreshold = threshold;
        if (selected.length === targetCount) {
            break;
        }
    }

    const suggestions = selected.map((candidate, index): SuggestedMultiSupportCandidate => {
        const otherDistances = selected
            .filter((other) => other.source.id !== candidate.source.id)
            .map((other) =>
                suggestedCandidateParameterDistance(
                    candidate.source,
                    other.source,
                    effectiveSearchConfig,
                ),
            );
        return {
            suggestionIndex: index + 1,
            sourceCandidateId: candidate.source.id,
            alpha: candidate.source.alpha,
            thetaDeg: candidate.source.thetaDeg,
            lambdaCm: candidate.source.lambdaCm,
            softScore: candidate.softScore,
            rawMetrics: { ...candidate.rawMetrics },
            normalizedMetrics: { ...candidate.normalizedMetrics },
            referenceLengthCm: candidate.source.referenceLengthCm,
            outerLengthCm: candidate.source.outerLengthCm,
            extraLengthCm: candidate.source.extraLengthCm,
            minimumDistanceToOtherSelected: otherDistances.length
                ? Math.min(...otherDistances)
                : undefined,
        };
    });

    return {
        geometry: {
            requestedCount: normalizedConfig.resultCount,
            actualCount: suggestions.length,
            validPoolSize: validCandidates.length,
            suggestions,
            requestedDiversityThreshold: normalizedConfig.diversityThreshold,
            usedDiversityThreshold: usedThreshold,
            rankingConfig: normalizedConfig,
            excludedBecauseDiagnosticsUnavailable,
            warnings: excludedBecauseDiagnosticsUnavailable
                ? [
                      {
                          code: 'SUGGESTED_CANDIDATE_DIAGNOSTICS_UNAVAILABLE',
                          message: `${excludedBecauseDiagnosticsUnavailable} valid candidate(s) were excluded because no weighted soft diagnostic was available.`,
                      },
                  ]
                : [],
        },
        errors: [],
    };
}
