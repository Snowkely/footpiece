import type {
    GeometryBuildResult,
    GeometryValidationError,
    TargetMultiSupportOuterCurveCandidate,
} from '../types';
import type {
    NearbyMultiSupportSearchCacheStats,
    NearbyMultiSupportSearchCandidateSummary,
    NearbyMultiSupportSearchConfig,
    NearbyMultiSupportSearchDependencies,
    NearbyMultiSupportSearchEvaluation,
    NearbyMultiSupportSearchInputs,
    NearbyMultiSupportSearchPlan,
    NearbyMultiSupportSearchRejectionStats,
    NearbyMultiSupportSearchSeed,
    NearbyMultiSupportSearchTuple,
} from './targetMultiSupportOuterCurveSearch';
import {
    NearbyMultiSupportSearchSession,
    nearbySearchTupleKey,
    rebuildNearbyMultiSupportSearchCandidate,
} from './targetMultiSupportOuterCurveSearch';
import { TOE_RADIAL_ANGLE_MAX_DEG, TOE_RADIAL_ANGLE_MIN_DEG } from './toeRadialReferences';

export const BROAD_SEARCH_ALPHA_MIN = 0;
export const BROAD_SEARCH_ALPHA_MAX = 1;
export const BROAD_SEARCH_THETA_MIN_DEG = TOE_RADIAL_ANGLE_MIN_DEG;
export const BROAD_SEARCH_THETA_MAX_DEG = TOE_RADIAL_ANGLE_MAX_DEG;
export const BROAD_SEARCH_LAMBDA_MIN_CM = 0;
export const BROAD_SEARCH_LAMBDA_MAX_CM = 8;
export const MAX_BROAD_SEARCH_EVALUATIONS = 20_000;
export const BROAD_SEARCH_STEP_ADJUSTMENT_FACTOR = 1.25;
export const MAX_BROAD_SEARCH_STEP_ADJUSTMENT_ROUNDS = 24;

const GRID_QUANTIZATION_DIGITS = 10;
const GRID_EPSILON = 1e-10;

export interface BroadMultiSupportSearchConfig {
    alphaMin: number;
    alphaMax: number;
    alphaStep: number;
    thetaMinDeg: number;
    thetaMaxDeg: number;
    thetaStepDeg: number;
    lambdaMinCm: number;
    lambdaMaxCm: number;
    lambdaStepCm: number;
}

export const DEFAULT_BROAD_MULTI_SUPPORT_SEARCH_CONFIG: BroadMultiSupportSearchConfig = {
    alphaMin: BROAD_SEARCH_ALPHA_MIN,
    alphaMax: BROAD_SEARCH_ALPHA_MAX,
    alphaStep: 0.05,
    thetaMinDeg: BROAD_SEARCH_THETA_MIN_DEG,
    thetaMaxDeg: BROAD_SEARCH_THETA_MAX_DEG,
    thetaStepDeg: 1,
    lambdaMinCm: BROAD_SEARCH_LAMBDA_MIN_CM,
    lambdaMaxCm: BROAD_SEARCH_LAMBDA_MAX_CM,
    lambdaStepCm: 0.2,
};

export interface BroadMultiSupportSearchConfigFit {
    requestedConfig: BroadMultiSupportSearchConfig;
    config: BroadMultiSupportSearchConfig;
    requestedEstimatedCount: number;
    estimatedCount: number;
    adjusted: boolean;
    stepMultiplier: number;
    adjustmentRounds: number;
}

export interface BroadMultiSupportSearchTuple extends NearbyMultiSupportSearchSeed {
    key: string;
}

export interface BroadMultiSupportSearchPlan {
    fit: BroadMultiSupportSearchConfigFit;
    alphaCount: number;
    thetaCount: number;
    lambdaCount: number;
    tuples: BroadMultiSupportSearchTuple[];
}

export type BroadMultiSupportSearchCandidateSummary = Omit<
    NearbyMultiSupportSearchCandidateSummary,
    'distanceFromSeed'
>;

export interface BroadMultiSupportSearchResult {
    requestedConfig: BroadMultiSupportSearchConfig;
    config: BroadMultiSupportSearchConfig;
    requestedEstimatedCount: number;
    totalCandidateCount: number;
    evaluatedCandidateCount: number;
    validCandidateCount: number;
    invalidCandidateCount: number;
    validCandidates: BroadMultiSupportSearchCandidateSummary[];
    rejectionStats: NearbyMultiSupportSearchRejectionStats;
    cacheStats: NearbyMultiSupportSearchCacheStats;
    invalidThetaSkippedCandidates: number;
    resolutionAdjusted: boolean;
    stepMultiplier: number;
    adjustmentRounds: number;
}

export interface BroadMultiSupportSearchEvaluation {
    tuple: BroadMultiSupportSearchTuple;
    candidate?: TargetMultiSupportOuterCurveCandidate;
    discoveredCandidate?: BroadMultiSupportSearchCandidateSummary;
    buildStageError?: NearbyMultiSupportSearchEvaluation['buildStageError'];
}

function quantize(value: number): number {
    return Number(value.toFixed(GRID_QUANTIZATION_DIGITS));
}

function cloneConfig(config: BroadMultiSupportSearchConfig): BroadMultiSupportSearchConfig {
    return { ...config };
}

function invalidConfig(message: string): GeometryValidationError {
    return { code: 'BROAD_SEARCH_CONFIG_INVALID', message };
}

function validateConfig(config: BroadMultiSupportSearchConfig): GeometryValidationError[] {
    if (Object.values(config).some((value) => !Number.isFinite(value))) {
        return [invalidConfig('Every broad-search range and step must be finite.')];
    }
    if (
        config.alphaMin < BROAD_SEARCH_ALPHA_MIN ||
        config.alphaMax > BROAD_SEARCH_ALPHA_MAX ||
        config.alphaMin > config.alphaMax
    ) {
        return [invalidConfig('Broad-search alpha range must remain within [0, 1].')];
    }
    if (
        config.thetaMinDeg < BROAD_SEARCH_THETA_MIN_DEG ||
        config.thetaMaxDeg > BROAD_SEARCH_THETA_MAX_DEG ||
        config.thetaMinDeg > config.thetaMaxDeg
    ) {
        return [
            invalidConfig(
                `Broad-search theta range must remain within [${BROAD_SEARCH_THETA_MIN_DEG}, ${BROAD_SEARCH_THETA_MAX_DEG}] degrees.`,
            ),
        ];
    }
    if (
        config.lambdaMinCm < BROAD_SEARCH_LAMBDA_MIN_CM ||
        config.lambdaMaxCm > BROAD_SEARCH_LAMBDA_MAX_CM ||
        config.lambdaMinCm > config.lambdaMaxCm
    ) {
        return [invalidConfig('Broad-search lambda range must remain within [0, 8] cm.')];
    }
    if (config.alphaStep <= 0 || config.thetaStepDeg <= 0 || config.lambdaStepCm <= 0) {
        return [invalidConfig('Every broad-search step must be greater than zero.')];
    }
    return [];
}

function validateEvaluationLimit(maxEvaluations: number): GeometryValidationError[] {
    return Number.isFinite(maxEvaluations) && maxEvaluations >= 1
        ? []
        : [invalidConfig('Broad-search evaluation limit must be a positive finite number.')];
}

/** Integer-indexed axis construction that always includes both legal endpoints. */
export function buildBroadSearchAxisValues(
    minimum: number,
    maximum: number,
    step: number,
): number[] {
    const span = quantize(maximum - minimum);
    const intervalCount = Math.floor(span / step + GRID_EPSILON);
    const values = Array.from({ length: intervalCount + 1 }, (_, index) =>
        quantize(minimum + index * step),
    ).filter((value) => value <= maximum + GRID_EPSILON);
    const last = values[values.length - 1];
    if (last === undefined || Math.abs(last - maximum) > GRID_EPSILON) {
        values.push(quantize(maximum));
    } else {
        values[values.length - 1] = quantize(maximum);
    }
    return values;
}

function candidateCount(config: BroadMultiSupportSearchConfig): number {
    return (
        buildBroadSearchAxisValues(config.alphaMin, config.alphaMax, config.alphaStep).length *
        buildBroadSearchAxisValues(config.thetaMinDeg, config.thetaMaxDeg, config.thetaStepDeg)
            .length *
        buildBroadSearchAxisValues(config.lambdaMinCm, config.lambdaMaxCm, config.lambdaStepCm)
            .length
    );
}

export function fitBroadSearchConfigToEvaluationLimit(
    requestedConfig: BroadMultiSupportSearchConfig = DEFAULT_BROAD_MULTI_SUPPORT_SEARCH_CONFIG,
    maxEvaluations = MAX_BROAD_SEARCH_EVALUATIONS,
): GeometryBuildResult<BroadMultiSupportSearchConfigFit> {
    const errors = [...validateConfig(requestedConfig), ...validateEvaluationLimit(maxEvaluations)];
    if (errors.length) {
        return { errors };
    }

    const requestedEstimatedCount = candidateCount(requestedConfig);
    if (requestedEstimatedCount <= maxEvaluations) {
        return {
            geometry: {
                requestedConfig: cloneConfig(requestedConfig),
                config: cloneConfig(requestedConfig),
                requestedEstimatedCount,
                estimatedCount: requestedEstimatedCount,
                adjusted: false,
                stepMultiplier: 1,
                adjustmentRounds: 0,
            },
            errors: [],
        };
    }

    for (let round = 1; round <= MAX_BROAD_SEARCH_STEP_ADJUSTMENT_ROUNDS; round += 1) {
        const stepMultiplier = BROAD_SEARCH_STEP_ADJUSTMENT_FACTOR ** round;
        const config: BroadMultiSupportSearchConfig = {
            ...requestedConfig,
            alphaStep: quantize(requestedConfig.alphaStep * stepMultiplier),
            thetaStepDeg: quantize(requestedConfig.thetaStepDeg * stepMultiplier),
            lambdaStepCm: quantize(requestedConfig.lambdaStepCm * stepMultiplier),
        };
        const estimatedCount = candidateCount(config);
        if (estimatedCount <= maxEvaluations) {
            return {
                geometry: {
                    requestedConfig: cloneConfig(requestedConfig),
                    config,
                    requestedEstimatedCount,
                    estimatedCount,
                    adjusted: true,
                    stepMultiplier,
                    adjustmentRounds: round,
                },
                errors: [],
            };
        }
    }

    return {
        errors: [
            {
                code: 'BROAD_SEARCH_TOO_LARGE',
                message: `Broad search remains above ${maxEvaluations} tuples after ${MAX_BROAD_SEARCH_STEP_ADJUSTMENT_ROUNDS} deterministic step adjustments.`,
            },
        ],
    };
}

export function buildBroadMultiSupportSearchPlan(
    requestedConfig: BroadMultiSupportSearchConfig = DEFAULT_BROAD_MULTI_SUPPORT_SEARCH_CONFIG,
    maxEvaluations = MAX_BROAD_SEARCH_EVALUATIONS,
): GeometryBuildResult<BroadMultiSupportSearchPlan> {
    const fitResult = fitBroadSearchConfigToEvaluationLimit(requestedConfig, maxEvaluations);
    if (!fitResult.geometry) {
        return { errors: fitResult.errors };
    }
    const fit = fitResult.geometry;
    const alphaValues = buildBroadSearchAxisValues(
        fit.config.alphaMin,
        fit.config.alphaMax,
        fit.config.alphaStep,
    );
    const thetaValues = buildBroadSearchAxisValues(
        fit.config.thetaMinDeg,
        fit.config.thetaMaxDeg,
        fit.config.thetaStepDeg,
    );
    const lambdaValues = buildBroadSearchAxisValues(
        fit.config.lambdaMinCm,
        fit.config.lambdaMaxCm,
        fit.config.lambdaStepCm,
    );
    const tuples = alphaValues.flatMap((alpha) =>
        thetaValues.flatMap((thetaDeg) =>
            lambdaValues.map((lambdaCm) => {
                const tuple = { alpha, thetaDeg, lambdaCm };
                return { ...tuple, key: nearbySearchTupleKey(tuple) };
            }),
        ),
    );

    return {
        geometry: {
            fit,
            alphaCount: alphaValues.length,
            thetaCount: thetaValues.length,
            lambdaCount: lambdaValues.length,
            tuples,
        },
        errors: [],
    };
}

function internalNearbyPlan(plan: BroadMultiSupportSearchPlan): NearbyMultiSupportSearchPlan {
    const midpointSeed = {
        alpha: quantize((plan.fit.config.alphaMin + plan.fit.config.alphaMax) / 2),
        thetaDeg: quantize((plan.fit.config.thetaMinDeg + plan.fit.config.thetaMaxDeg) / 2),
        lambdaCm: quantize((plan.fit.config.lambdaMinCm + plan.fit.config.lambdaMaxCm) / 2),
    };
    const internalConfig: NearbyMultiSupportSearchConfig = {
        alphaRadius: 0,
        alphaStep: plan.fit.config.alphaStep,
        thetaRadiusDeg: 0,
        thetaStepDeg: plan.fit.config.thetaStepDeg,
        lambdaRadiusCm: 0,
        lambdaStepCm: plan.fit.config.lambdaStepCm,
    };
    const tuples: NearbyMultiSupportSearchTuple[] = plan.tuples.map((tuple) => ({
        ...tuple,
        distanceFromSeed: 0,
    }));
    return {
        seed: midpointSeed,
        config: internalConfig,
        alphaCount: plan.alphaCount,
        thetaCount: plan.thetaCount,
        lambdaCount: plan.lambdaCount,
        tuples,
    };
}

function broadSummary(
    candidate: NearbyMultiSupportSearchCandidateSummary,
): BroadMultiSupportSearchCandidateSummary {
    return {
        id: candidate.id,
        alpha: candidate.alpha,
        thetaDeg: candidate.thetaDeg,
        lambdaCm: candidate.lambdaCm,
        referenceLengthCm: candidate.referenceLengthCm,
        outerLengthCm: candidate.outerLengthCm,
        extraLengthCm: candidate.extraLengthCm,
        diagnostics: {
            ...candidate.diagnostics,
            supportChordTurningAnglesDeg: {
                ...candidate.diagnostics.supportChordTurningAnglesDeg,
            },
        },
    };
}

/**
 * Broad orchestration intentionally composes the proven Nearby session so Step
 * 4/6A/6B/6C evaluation, caches, VALID rules, and lightweight storage stay identical.
 */
export class BroadMultiSupportSearchSession {
    private readonly inputs: NearbyMultiSupportSearchInputs;
    private readonly plan: BroadMultiSupportSearchPlan;
    private readonly dependencies?: NearbyMultiSupportSearchDependencies;
    private readonly internalSession: NearbyMultiSupportSearchSession;

    constructor(
        inputs: NearbyMultiSupportSearchInputs,
        plan: BroadMultiSupportSearchPlan,
        dependencies?: NearbyMultiSupportSearchDependencies,
    ) {
        this.inputs = inputs;
        this.plan = plan;
        this.dependencies = dependencies;
        this.internalSession = new NearbyMultiSupportSearchSession(
            inputs,
            internalNearbyPlan(plan),
            dependencies,
        );
    }

    hasPending(): boolean {
        return this.internalSession.hasPending();
    }

    evaluateNext(): BroadMultiSupportSearchEvaluation | undefined {
        const evaluation = this.internalSession.evaluateNext();
        if (!evaluation) {
            return undefined;
        }
        return {
            tuple: {
                alpha: evaluation.tuple.alpha,
                thetaDeg: evaluation.tuple.thetaDeg,
                lambdaCm: evaluation.tuple.lambdaCm,
                key: evaluation.tuple.key,
            },
            candidate: evaluation.candidate,
            discoveredCandidate: evaluation.discoveredCandidate
                ? broadSummary(evaluation.discoveredCandidate)
                : undefined,
            buildStageError: evaluation.buildStageError,
        };
    }

    rebuildCandidate(
        summary: BroadMultiSupportSearchCandidateSummary,
    ): GeometryBuildResult<TargetMultiSupportOuterCurveCandidate> {
        return rebuildNearbyMultiSupportSearchCandidate(this.inputs, summary, this.dependencies);
    }

    getSnapshot(): BroadMultiSupportSearchResult {
        const snapshot = this.internalSession.getSnapshot();
        return {
            requestedConfig: cloneConfig(this.plan.fit.requestedConfig),
            config: cloneConfig(this.plan.fit.config),
            requestedEstimatedCount: this.plan.fit.requestedEstimatedCount,
            totalCandidateCount: snapshot.totalCandidateCount,
            evaluatedCandidateCount: snapshot.evaluatedCandidateCount,
            validCandidateCount: snapshot.validCandidateCount,
            invalidCandidateCount: snapshot.invalidCandidateCount,
            validCandidates: snapshot.validCandidates.map(broadSummary),
            rejectionStats: { ...snapshot.rejectionStats },
            cacheStats: {
                alpha: { ...snapshot.cacheStats.alpha },
                theta: { ...snapshot.cacheStats.theta },
                lambda: { ...snapshot.cacheStats.lambda },
                thetaLambda: { ...snapshot.cacheStats.thetaLambda },
            },
            invalidThetaSkippedCandidates: snapshot.invalidThetaSkippedCandidates,
            resolutionAdjusted: this.plan.fit.adjusted,
            stepMultiplier: this.plan.fit.stepMultiplier,
            adjustmentRounds: this.plan.fit.adjustmentRounds,
        };
    }
}

export function createBroadMultiSupportSearchSession(
    inputs: NearbyMultiSupportSearchInputs,
    requestedConfig: BroadMultiSupportSearchConfig = DEFAULT_BROAD_MULTI_SUPPORT_SEARCH_CONFIG,
    dependencies?: NearbyMultiSupportSearchDependencies,
): GeometryBuildResult<BroadMultiSupportSearchSession> {
    const plan = buildBroadMultiSupportSearchPlan(requestedConfig);
    return plan.geometry
        ? {
              geometry: new BroadMultiSupportSearchSession(inputs, plan.geometry, dependencies),
              errors: [],
          }
        : { errors: plan.errors };
}

export function searchBroadMultiSupportCandidates(
    inputs: NearbyMultiSupportSearchInputs,
    requestedConfig: BroadMultiSupportSearchConfig = DEFAULT_BROAD_MULTI_SUPPORT_SEARCH_CONFIG,
    dependencies?: NearbyMultiSupportSearchDependencies,
): GeometryBuildResult<BroadMultiSupportSearchResult> {
    const session = createBroadMultiSupportSearchSession(inputs, requestedConfig, dependencies);
    if (!session.geometry) {
        return { errors: session.errors };
    }
    while (session.geometry.hasPending()) {
        session.geometry.evaluateNext();
    }
    return { geometry: session.geometry.getSnapshot(), errors: [] };
}
