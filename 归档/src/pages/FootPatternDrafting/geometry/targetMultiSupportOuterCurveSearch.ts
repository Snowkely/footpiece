import type {
    DraftPoint,
    FrontPieceGeometry,
    GeometryBuildResult,
    GeometryValidationError,
    TargetMultiSupportOuterCurveCandidate,
    TargetOuterCurveRejectionReason,
    TargetReferenceArcGeometry,
    TargetUtGeometry,
    TargetWPrimeGeometry,
    ToeRadialOuterSupportGeometry,
    ToeRadialReferenceGeometry,
} from '../types';
import { evaluateTargetMultiSupportOuterCurveCandidate } from './targetMultiSupportOuterCurve';
import { deriveTargetUtConstruction } from './targetUt';
import { deriveTargetWPrime } from './targetWPrime';
import { deriveToeRadialOuterSupports } from './toeRadialOuterSupports';
import {
    deriveToeRadialReferences,
    TOE_RADIAL_ANGLE_MAX_DEG,
    TOE_RADIAL_ANGLE_MIN_DEG,
} from './toeRadialReferences';

export const DEFAULT_NEARBY_MULTI_SUPPORT_SEARCH_CONFIG = {
    alphaRadius: 0.15,
    alphaStep: 0.02,
    thetaRadiusDeg: 3,
    thetaStepDeg: 0.5,
    lambdaRadiusCm: 1,
    lambdaStepCm: 0.1,
} as const;

export const NEARBY_SEARCH_ALPHA_MIN = 0;
export const NEARBY_SEARCH_ALPHA_MAX = 1;
export const NEARBY_SEARCH_LAMBDA_MIN_CM = 0;
export const NEARBY_SEARCH_LAMBDA_MAX_CM = 8;
export const MAX_NEARBY_SEARCH_EVALUATIONS = 20_000;
export const NEARBY_SEARCH_STEP_ADJUSTMENT_FACTOR = 1.25;
export const MAX_NEARBY_SEARCH_STEP_ADJUSTMENT_ROUNDS = 24;

const GRID_QUANTIZATION_DIGITS = 10;
const GRID_EPSILON = 1e-10;

export interface NearbyMultiSupportSearchSeed {
    alpha: number;
    thetaDeg: number;
    lambdaCm: number;
}

export interface NearbyMultiSupportSearchConfig {
    alphaRadius: number;
    alphaStep: number;
    thetaRadiusDeg: number;
    thetaStepDeg: number;
    lambdaRadiusCm: number;
    lambdaStepCm: number;
}

export interface NearbyMultiSupportSearchInputs {
    frontPiece: FrontPieceGeometry;
    targetReferenceArc: TargetReferenceArcGeometry;
    P: DraftPoint;
    Q: DraftPoint;
    draftingA: number;
    Ms: DraftPoint;
    W: DraftPoint;
    MPrime: DraftPoint;
    O: DraftPoint;
}

export interface NearbyMultiSupportSearchTuple extends NearbyMultiSupportSearchSeed {
    key: string;
    distanceFromSeed: number;
}

export interface NearbyMultiSupportSearchPlan {
    seed: NearbyMultiSupportSearchSeed;
    config: NearbyMultiSupportSearchConfig;
    alphaCount: number;
    thetaCount: number;
    lambdaCount: number;
    tuples: NearbyMultiSupportSearchTuple[];
}

export interface NearbyMultiSupportSearchConfigFit {
    requestedConfig: NearbyMultiSupportSearchConfig;
    config: NearbyMultiSupportSearchConfig;
    requestedEstimatedCount: number;
    estimatedCount: number;
    adjusted: boolean;
    stepMultiplier: number;
    adjustmentRounds: number;
}

export interface NearbyMultiSupportSearchCandidateSummary extends NearbyMultiSupportSearchSeed {
    id: number;
    distanceFromSeed: number;
    referenceLengthCm: number;
    outerLengthCm: number;
    extraLengthCm: number;
    diagnostics: TargetMultiSupportOuterCurveCandidate['diagnostics'];
}

export interface NearbyMultiSupportSearchRejectionStats {
    tooShort: number;
    tooLong: number;
    insideReference: number;
    referenceIntersection: number;
    selfIntersection: number;
    utBuildError: number;
    toeReferenceBuildError: number;
    wPrimeBuildError: number;
    toeOuterSupportBuildError: number;
    outerCurveBuildError: number;
}

export interface NearbyMultiSupportSearchCacheStats {
    alpha: { builds: number; hits: number };
    theta: { builds: number; hits: number };
    lambda: { builds: number; hits: number };
    thetaLambda: { builds: number; hits: number };
}

export interface NearbyMultiSupportSearchResult {
    seed: NearbyMultiSupportSearchSeed;
    config: NearbyMultiSupportSearchConfig;
    totalCandidateCount: number;
    evaluatedCandidateCount: number;
    validCandidateCount: number;
    invalidCandidateCount: number;
    validCandidates: NearbyMultiSupportSearchCandidateSummary[];
    rejectionStats: NearbyMultiSupportSearchRejectionStats;
    cacheStats: NearbyMultiSupportSearchCacheStats;
    invalidThetaSkippedCandidates: number;
}

export interface NearbyMultiSupportSearchEvaluation {
    tuple: NearbyMultiSupportSearchTuple;
    candidate?: TargetMultiSupportOuterCurveCandidate;
    discoveredCandidate?: NearbyMultiSupportSearchCandidateSummary;
    buildStageError?:
        | 'STEP_4_UT'
        | 'STEP_5_WPRIME'
        | 'STEP_6A_TOE_REFERENCES'
        | 'STEP_6B_OUTER_SUPPORTS'
        | 'STEP_6C_OUTER_CURVE';
}

export interface NearbyMultiSupportSearchDependencies {
    deriveUt: typeof deriveTargetUtConstruction;
    deriveWPrime: typeof deriveTargetWPrime;
    deriveToeReferences: typeof deriveToeRadialReferences;
    deriveOuterSupports: typeof deriveToeRadialOuterSupports;
    evaluateCandidate: typeof evaluateTargetMultiSupportOuterCurveCandidate;
}

const defaultDependencies: NearbyMultiSupportSearchDependencies = {
    deriveUt: deriveTargetUtConstruction,
    deriveWPrime: deriveTargetWPrime,
    deriveToeReferences: deriveToeRadialReferences,
    deriveOuterSupports: deriveToeRadialOuterSupports,
    evaluateCandidate: evaluateTargetMultiSupportOuterCurveCandidate,
};

function quantize(value: number): number {
    return Number(value.toFixed(GRID_QUANTIZATION_DIGITS));
}

function cloneSeed(seed: NearbyMultiSupportSearchSeed): NearbyMultiSupportSearchSeed {
    return { ...seed };
}

function cloneConfig(config: NearbyMultiSupportSearchConfig): NearbyMultiSupportSearchConfig {
    return { ...config };
}

function invalidSearch(message: string): GeometryValidationError {
    return { code: 'NEARBY_SEARCH_CONFIG_INVALID', message };
}

function validateSeed(seed: NearbyMultiSupportSearchSeed): GeometryValidationError[] {
    if (
        !Number.isFinite(seed.alpha) ||
        !Number.isFinite(seed.thetaDeg) ||
        !Number.isFinite(seed.lambdaCm)
    ) {
        return [invalidSearch('Nearby search seed α, θ, and λ must all be finite.')];
    }
    if (seed.alpha < NEARBY_SEARCH_ALPHA_MIN || seed.alpha > NEARBY_SEARCH_ALPHA_MAX) {
        return [invalidSearch('Nearby search seed α must remain within [0, 1].')];
    }
    if (seed.thetaDeg < TOE_RADIAL_ANGLE_MIN_DEG || seed.thetaDeg > TOE_RADIAL_ANGLE_MAX_DEG) {
        return [
            invalidSearch(
                `Nearby search seed θ must remain within [${TOE_RADIAL_ANGLE_MIN_DEG}, ${TOE_RADIAL_ANGLE_MAX_DEG}] degrees.`,
            ),
        ];
    }
    if (
        seed.lambdaCm < NEARBY_SEARCH_LAMBDA_MIN_CM ||
        seed.lambdaCm > NEARBY_SEARCH_LAMBDA_MAX_CM
    ) {
        return [invalidSearch('Nearby search seed λ must remain within [0, 8] cm.')];
    }
    return [];
}

function validateConfig(config: NearbyMultiSupportSearchConfig): GeometryValidationError[] {
    const values = Object.values(config);
    if (values.some((value) => !Number.isFinite(value))) {
        return [invalidSearch('Every nearby search radius and step must be finite.')];
    }
    if (config.alphaRadius < 0 || config.thetaRadiusDeg < 0 || config.lambdaRadiusCm < 0) {
        return [invalidSearch('Nearby search radii must be non-negative.')];
    }
    if (config.alphaStep <= 0 || config.thetaStepDeg <= 0 || config.lambdaStepCm <= 0) {
        return [invalidSearch('Nearby search steps must be greater than zero.')];
    }
    return [];
}

function validateEvaluationLimit(maxEvaluations: number): GeometryValidationError[] {
    if (!Number.isFinite(maxEvaluations) || maxEvaluations < 1) {
        return [invalidSearch('Nearby search evaluation limit must be a positive finite number.')];
    }
    return [];
}

function centeredAxisValues(
    seed: number,
    radius: number,
    step: number,
    globalMinimum: number,
    globalMaximum: number,
): number[] {
    const lower = quantize(Math.max(globalMinimum, seed - radius));
    const upper = quantize(Math.min(globalMaximum, seed + radius));
    const values = new Set<number>([quantize(seed), lower, upper]);
    const maximumIndex = Math.ceil(radius / step);

    for (let index = 1; index <= maximumIndex; index += 1) {
        const lowerValue = quantize(seed - index * step);
        const upperValue = quantize(seed + index * step);
        if (lowerValue >= lower - GRID_EPSILON) {
            values.add(Math.max(lower, lowerValue));
        }
        if (upperValue <= upper + GRID_EPSILON) {
            values.add(Math.min(upper, upperValue));
        }
    }

    return [...values].sort((first, second) => first - second);
}

function normalizedDelta(delta: number, radius: number): number {
    return radius <= GRID_EPSILON ? 0 : delta / radius;
}

function calculateNearbyMultiSupportSearchCandidateCount(
    seed: NearbyMultiSupportSearchSeed,
    config: NearbyMultiSupportSearchConfig,
): number {
    return (
        centeredAxisValues(
            seed.alpha,
            config.alphaRadius,
            config.alphaStep,
            NEARBY_SEARCH_ALPHA_MIN,
            NEARBY_SEARCH_ALPHA_MAX,
        ).length *
        centeredAxisValues(
            seed.thetaDeg,
            config.thetaRadiusDeg,
            config.thetaStepDeg,
            TOE_RADIAL_ANGLE_MIN_DEG,
            TOE_RADIAL_ANGLE_MAX_DEG,
        ).length *
        centeredAxisValues(
            seed.lambdaCm,
            config.lambdaRadiusCm,
            config.lambdaStepCm,
            NEARBY_SEARCH_LAMBDA_MIN_CM,
            NEARBY_SEARCH_LAMBDA_MAX_CM,
        ).length
    );
}

export function nearbySearchTupleKey(seed: NearbyMultiSupportSearchSeed): string {
    return [seed.alpha, seed.thetaDeg, seed.lambdaCm]
        .map((value) => quantize(value).toFixed(GRID_QUANTIZATION_DIGITS))
        .join('|');
}

export function nearbySearchDistance(
    seed: NearbyMultiSupportSearchSeed,
    tuple: NearbyMultiSupportSearchSeed,
    config: NearbyMultiSupportSearchConfig,
): number {
    const alphaDelta = normalizedDelta(tuple.alpha - seed.alpha, config.alphaRadius);
    const thetaDelta = normalizedDelta(tuple.thetaDeg - seed.thetaDeg, config.thetaRadiusDeg);
    const lambdaDelta = normalizedDelta(tuple.lambdaCm - seed.lambdaCm, config.lambdaRadiusCm);
    return Number(
        Math.hypot(alphaDelta, thetaDelta, lambdaDelta).toFixed(GRID_QUANTIZATION_DIGITS + 2),
    );
}

export function buildNearbyMultiSupportSearchPlan(
    seed: NearbyMultiSupportSearchSeed,
    config: NearbyMultiSupportSearchConfig = DEFAULT_NEARBY_MULTI_SUPPORT_SEARCH_CONFIG,
): GeometryBuildResult<NearbyMultiSupportSearchPlan> {
    const errors = [...validateSeed(seed), ...validateConfig(config)];
    if (errors.length) {
        return { errors };
    }

    const alphaValues = centeredAxisValues(
        seed.alpha,
        config.alphaRadius,
        config.alphaStep,
        NEARBY_SEARCH_ALPHA_MIN,
        NEARBY_SEARCH_ALPHA_MAX,
    );
    const thetaValues = centeredAxisValues(
        seed.thetaDeg,
        config.thetaRadiusDeg,
        config.thetaStepDeg,
        TOE_RADIAL_ANGLE_MIN_DEG,
        TOE_RADIAL_ANGLE_MAX_DEG,
    );
    const lambdaValues = centeredAxisValues(
        seed.lambdaCm,
        config.lambdaRadiusCm,
        config.lambdaStepCm,
        NEARBY_SEARCH_LAMBDA_MIN_CM,
        NEARBY_SEARCH_LAMBDA_MAX_CM,
    );
    const candidateCount = alphaValues.length * thetaValues.length * lambdaValues.length;
    if (candidateCount > MAX_NEARBY_SEARCH_EVALUATIONS) {
        return {
            errors: [
                {
                    code: 'NEARBY_SEARCH_TOO_LARGE',
                    message: `Nearby search contains ${candidateCount} tuples; reduce a radius or increase a step to stay within ${MAX_NEARBY_SEARCH_EVALUATIONS}.`,
                },
            ],
        };
    }

    const tuples = alphaValues.flatMap((alpha) =>
        thetaValues.flatMap((thetaDeg) =>
            lambdaValues.map((lambdaCm) => {
                const tuple = { alpha, thetaDeg, lambdaCm };
                return {
                    ...tuple,
                    key: nearbySearchTupleKey(tuple),
                    distanceFromSeed: nearbySearchDistance(seed, tuple, config),
                };
            }),
        ),
    );
    tuples.sort(
        (first, second) =>
            first.distanceFromSeed - second.distanceFromSeed ||
            first.alpha - second.alpha ||
            first.thetaDeg - second.thetaDeg ||
            first.lambdaCm - second.lambdaCm,
    );

    return {
        geometry: {
            seed: cloneSeed(seed),
            config: cloneConfig(config),
            alphaCount: alphaValues.length,
            thetaCount: thetaValues.length,
            lambdaCount: lambdaValues.length,
            tuples,
        },
        errors: [],
    };
}

export function estimateNearbyMultiSupportSearchCandidateCount(
    seed: NearbyMultiSupportSearchSeed,
    config: NearbyMultiSupportSearchConfig,
): GeometryBuildResult<number> {
    const errors = [...validateSeed(seed), ...validateConfig(config)];
    if (errors.length) {
        return { errors };
    }
    const candidateCount = calculateNearbyMultiSupportSearchCandidateCount(seed, config);
    if (candidateCount > MAX_NEARBY_SEARCH_EVALUATIONS) {
        return {
            errors: [
                {
                    code: 'NEARBY_SEARCH_TOO_LARGE',
                    message: `Nearby search contains ${candidateCount} tuples; reduce a radius or increase a step to stay within ${MAX_NEARBY_SEARCH_EVALUATIONS}.`,
                },
            ],
        };
    }
    return { geometry: candidateCount, errors: [] };
}

export function fitSearchConfigToEvaluationLimit(
    seed: NearbyMultiSupportSearchSeed,
    requestedConfig: NearbyMultiSupportSearchConfig,
    maxEvaluations = MAX_NEARBY_SEARCH_EVALUATIONS,
): GeometryBuildResult<NearbyMultiSupportSearchConfigFit> {
    const errors = [
        ...validateSeed(seed),
        ...validateConfig(requestedConfig),
        ...validateEvaluationLimit(maxEvaluations),
    ];
    if (errors.length) {
        return { errors };
    }

    const requestedEstimatedCount = calculateNearbyMultiSupportSearchCandidateCount(
        seed,
        requestedConfig,
    );
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

    for (let round = 1; round <= MAX_NEARBY_SEARCH_STEP_ADJUSTMENT_ROUNDS; round += 1) {
        const stepMultiplier = NEARBY_SEARCH_STEP_ADJUSTMENT_FACTOR ** round;
        const adjustedConfig: NearbyMultiSupportSearchConfig = {
            ...requestedConfig,
            alphaStep: quantize(requestedConfig.alphaStep * stepMultiplier),
            thetaStepDeg: quantize(requestedConfig.thetaStepDeg * stepMultiplier),
            lambdaStepCm: quantize(requestedConfig.lambdaStepCm * stepMultiplier),
        };
        const estimatedCount = calculateNearbyMultiSupportSearchCandidateCount(
            seed,
            adjustedConfig,
        );
        if (estimatedCount <= maxEvaluations) {
            return {
                geometry: {
                    requestedConfig: cloneConfig(requestedConfig),
                    config: adjustedConfig,
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
                code: 'NEARBY_SEARCH_TOO_LARGE',
                message: `Expanded nearby search remains above ${maxEvaluations} tuples after ${MAX_NEARBY_SEARCH_STEP_ADJUSTMENT_ROUNDS} deterministic step adjustments.`,
            },
        ],
    };
}

function emptyRejectionStats(): NearbyMultiSupportSearchRejectionStats {
    return {
        tooShort: 0,
        tooLong: 0,
        insideReference: 0,
        referenceIntersection: 0,
        selfIntersection: 0,
        utBuildError: 0,
        toeReferenceBuildError: 0,
        wPrimeBuildError: 0,
        toeOuterSupportBuildError: 0,
        outerCurveBuildError: 0,
    };
}

function emptyCacheStats(): NearbyMultiSupportSearchCacheStats {
    return {
        alpha: { builds: 0, hits: 0 },
        theta: { builds: 0, hits: 0 },
        lambda: { builds: 0, hits: 0 },
        thetaLambda: { builds: 0, hits: 0 },
    };
}

function incrementRejection(
    stats: NearbyMultiSupportSearchRejectionStats,
    reason: TargetOuterCurveRejectionReason,
): void {
    const keys: Record<
        TargetOuterCurveRejectionReason,
        keyof NearbyMultiSupportSearchRejectionStats
    > = {
        OUTER_CURVE_TOO_SHORT: 'tooShort',
        OUTER_CURVE_TOO_LONG: 'tooLong',
        OUTER_CURVE_INSIDE_REFERENCE: 'insideReference',
        OUTER_CURVE_REFERENCE_INTERSECTION: 'referenceIntersection',
        OUTER_CURVE_SELF_INTERSECTION: 'selfIntersection',
    };
    stats[keys[reason]] += 1;
}

function buildCandidateSummary(
    id: number,
    tuple: NearbyMultiSupportSearchTuple,
    candidate: TargetMultiSupportOuterCurveCandidate,
): NearbyMultiSupportSearchCandidateSummary {
    return {
        id,
        alpha: tuple.alpha,
        thetaDeg: tuple.thetaDeg,
        lambdaCm: tuple.lambdaCm,
        distanceFromSeed: tuple.distanceFromSeed,
        referenceLengthCm: candidate.referenceLengthCm,
        outerLengthCm: candidate.outerCurveLengthCm,
        extraLengthCm: candidate.extraLengthCm,
        diagnostics: {
            ...candidate.diagnostics,
            supportChordTurningAnglesDeg: {
                ...candidate.diagnostics.supportChordTurningAnglesDeg,
            },
        },
    };
}

export function rebuildNearbyMultiSupportSearchCandidate(
    inputs: NearbyMultiSupportSearchInputs,
    tuple: NearbyMultiSupportSearchSeed,
    dependencies: NearbyMultiSupportSearchDependencies = defaultDependencies,
): GeometryBuildResult<TargetMultiSupportOuterCurveCandidate> {
    const targetUt = dependencies.deriveUt(inputs.P, inputs.Q, inputs.draftingA, tuple.alpha);
    if (!targetUt.geometry) {
        return { errors: targetUt.errors };
    }
    const toeReferences = dependencies.deriveToeReferences({
        Ms: inputs.Ms,
        W: inputs.W,
        targetReferenceArc: inputs.targetReferenceArc,
        thetaDeg: tuple.thetaDeg,
    });
    if (!toeReferences.geometry) {
        return { errors: toeReferences.errors };
    }
    const targetWPrime = dependencies.deriveWPrime(
        inputs.W,
        inputs.MPrime,
        inputs.O,
        tuple.lambdaCm,
    );
    if (!targetWPrime.geometry) {
        return { errors: targetWPrime.errors };
    }
    const outerSupports = dependencies.deriveOuterSupports({
        Ms: inputs.Ms,
        toeRadialReferences: toeReferences.geometry,
        existingWPrime: targetWPrime.geometry.WPrime,
        outwardOffsetCm: tuple.lambdaCm,
    });
    if (!outerSupports.geometry) {
        return { errors: outerSupports.errors };
    }
    return dependencies.evaluateCandidate({
        frontPiece: inputs.frontPiece,
        targetReferenceArc: inputs.targetReferenceArc,
        targetUt: targetUt.geometry,
        toeRadialOuterSupports: outerSupports.geometry,
    });
}

export class NearbyMultiSupportSearchSession {
    private readonly inputs: NearbyMultiSupportSearchInputs;
    private readonly dependencies: NearbyMultiSupportSearchDependencies;
    private seed: NearbyMultiSupportSearchSeed;
    private config: NearbyMultiSupportSearchConfig;
    private pendingTuples: NearbyMultiSupportSearchTuple[];
    private cursor = 0;
    private readonly evaluatedTupleKeys = new Set<string>();
    private readonly validCandidates: NearbyMultiSupportSearchCandidateSummary[] = [];
    private evaluatedCandidateCount = 0;
    private invalidCandidateCount = 0;
    private invalidThetaSkippedCandidates = 0;
    private rejectionStats = emptyRejectionStats();
    private cacheStats = emptyCacheStats();
    private readonly utCache = new Map<string, GeometryBuildResult<TargetUtGeometry>>();
    private readonly toeReferenceCache = new Map<
        string,
        GeometryBuildResult<ToeRadialReferenceGeometry>
    >();
    private readonly wPrimeCache = new Map<string, GeometryBuildResult<TargetWPrimeGeometry>>();
    private readonly outerSupportCache = new Map<
        string,
        GeometryBuildResult<ToeRadialOuterSupportGeometry>
    >();

    constructor(
        inputs: NearbyMultiSupportSearchInputs,
        plan: NearbyMultiSupportSearchPlan,
        dependencies: NearbyMultiSupportSearchDependencies = defaultDependencies,
    ) {
        this.inputs = inputs;
        this.dependencies = dependencies;
        this.seed = cloneSeed(plan.seed);
        this.config = cloneConfig(plan.config);
        this.pendingTuples = [...plan.tuples];
    }

    hasPending(): boolean {
        return this.cursor < this.pendingTuples.length;
    }

    private cachedResult<T>(
        cache: Map<string, GeometryBuildResult<T>>,
        key: string,
        stats: { builds: number; hits: number },
        build: () => GeometryBuildResult<T>,
    ): GeometryBuildResult<T> {
        const cached = cache.get(key);
        if (cached) {
            stats.hits += 1;
            return cached;
        }
        const result = build();
        stats.builds += 1;
        cache.set(key, result);
        return result;
    }

    evaluateNext(): NearbyMultiSupportSearchEvaluation | undefined {
        const tuple = this.pendingTuples[this.cursor];
        if (!tuple) {
            return undefined;
        }
        this.cursor += 1;
        this.evaluatedTupleKeys.add(tuple.key);
        this.evaluatedCandidateCount += 1;

        const thetaKey = quantize(tuple.thetaDeg).toString();
        const toeReferences = this.cachedResult(
            this.toeReferenceCache,
            thetaKey,
            this.cacheStats.theta,
            () =>
                this.dependencies.deriveToeReferences({
                    Ms: this.inputs.Ms,
                    W: this.inputs.W,
                    targetReferenceArc: this.inputs.targetReferenceArc,
                    thetaDeg: tuple.thetaDeg,
                }),
        );
        if (!toeReferences.geometry) {
            this.invalidCandidateCount += 1;
            this.invalidThetaSkippedCandidates += 1;
            this.rejectionStats.toeReferenceBuildError += 1;
            return { tuple, buildStageError: 'STEP_6A_TOE_REFERENCES' };
        }

        const alphaKey = quantize(tuple.alpha).toString();
        const targetUt = this.cachedResult(this.utCache, alphaKey, this.cacheStats.alpha, () =>
            this.dependencies.deriveUt(
                this.inputs.P,
                this.inputs.Q,
                this.inputs.draftingA,
                tuple.alpha,
            ),
        );
        if (!targetUt.geometry) {
            this.invalidCandidateCount += 1;
            this.rejectionStats.utBuildError += 1;
            return { tuple, buildStageError: 'STEP_4_UT' };
        }

        const lambdaKey = quantize(tuple.lambdaCm).toString();
        const targetWPrime = this.cachedResult(
            this.wPrimeCache,
            lambdaKey,
            this.cacheStats.lambda,
            () =>
                this.dependencies.deriveWPrime(
                    this.inputs.W,
                    this.inputs.MPrime,
                    this.inputs.O,
                    tuple.lambdaCm,
                ),
        );
        if (!targetWPrime.geometry) {
            this.invalidCandidateCount += 1;
            this.rejectionStats.wPrimeBuildError += 1;
            return { tuple, buildStageError: 'STEP_5_WPRIME' };
        }

        const thetaLambdaKey = `${thetaKey}|${lambdaKey}`;
        const outerSupports = this.cachedResult(
            this.outerSupportCache,
            thetaLambdaKey,
            this.cacheStats.thetaLambda,
            () =>
                this.dependencies.deriveOuterSupports({
                    Ms: this.inputs.Ms,
                    toeRadialReferences: toeReferences.geometry!,
                    existingWPrime: targetWPrime.geometry!.WPrime,
                    outwardOffsetCm: tuple.lambdaCm,
                }),
        );
        if (!outerSupports.geometry) {
            this.invalidCandidateCount += 1;
            this.rejectionStats.toeOuterSupportBuildError += 1;
            return { tuple, buildStageError: 'STEP_6B_OUTER_SUPPORTS' };
        }

        const candidateResult = this.dependencies.evaluateCandidate({
            frontPiece: this.inputs.frontPiece,
            targetReferenceArc: this.inputs.targetReferenceArc,
            targetUt: targetUt.geometry,
            toeRadialOuterSupports: outerSupports.geometry,
        });
        if (!candidateResult.geometry) {
            this.invalidCandidateCount += 1;
            this.rejectionStats.outerCurveBuildError += 1;
            return { tuple, buildStageError: 'STEP_6C_OUTER_CURVE' };
        }

        const candidate = candidateResult.geometry;
        if (!candidate.valid) {
            this.invalidCandidateCount += 1;
            candidate.rejectionReasons.forEach((reason) =>
                incrementRejection(this.rejectionStats, reason),
            );
            return { tuple, candidate };
        }

        const discoveredCandidate = buildCandidateSummary(
            this.validCandidates.length + 1,
            tuple,
            candidate,
        );
        this.validCandidates.push(discoveredCandidate);
        return { tuple, candidate, discoveredCandidate };
    }

    extend(
        config: NearbyMultiSupportSearchConfig,
    ): GeometryBuildResult<NearbyMultiSupportSearchPlan> {
        const planResult = buildNearbyMultiSupportSearchPlan(this.seed, config);
        if (!planResult.geometry) {
            return planResult;
        }
        const queuedKeys = new Set(this.pendingTuples.slice(this.cursor).map((tuple) => tuple.key));
        const newTuples = planResult.geometry.tuples.filter(
            (tuple) => !this.evaluatedTupleKeys.has(tuple.key) && !queuedKeys.has(tuple.key),
        );
        this.pendingTuples = [...this.pendingTuples.slice(this.cursor), ...newTuples].sort(
            (first, second) =>
                first.distanceFromSeed - second.distanceFromSeed ||
                first.alpha - second.alpha ||
                first.thetaDeg - second.thetaDeg ||
                first.lambdaCm - second.lambdaCm,
        );
        this.cursor = 0;
        this.config = cloneConfig(config);
        return planResult;
    }

    rebuildCandidate(
        summary: NearbyMultiSupportSearchCandidateSummary,
    ): GeometryBuildResult<TargetMultiSupportOuterCurveCandidate> {
        return rebuildNearbyMultiSupportSearchCandidate(this.inputs, summary, this.dependencies);
    }

    getSnapshot(): NearbyMultiSupportSearchResult {
        return {
            seed: cloneSeed(this.seed),
            config: cloneConfig(this.config),
            totalCandidateCount:
                this.evaluatedTupleKeys.size + (this.pendingTuples.length - this.cursor),
            evaluatedCandidateCount: this.evaluatedCandidateCount,
            validCandidateCount: this.validCandidates.length,
            invalidCandidateCount: this.invalidCandidateCount,
            validCandidates: this.validCandidates.map((candidate) => ({
                ...candidate,
                diagnostics: {
                    ...candidate.diagnostics,
                    supportChordTurningAnglesDeg: {
                        ...candidate.diagnostics.supportChordTurningAnglesDeg,
                    },
                },
            })),
            rejectionStats: { ...this.rejectionStats },
            cacheStats: {
                alpha: { ...this.cacheStats.alpha },
                theta: { ...this.cacheStats.theta },
                lambda: { ...this.cacheStats.lambda },
                thetaLambda: { ...this.cacheStats.thetaLambda },
            },
            invalidThetaSkippedCandidates: this.invalidThetaSkippedCandidates,
        };
    }
}

export function createNearbyMultiSupportSearchSession(
    inputs: NearbyMultiSupportSearchInputs,
    seed: NearbyMultiSupportSearchSeed,
    config: NearbyMultiSupportSearchConfig = DEFAULT_NEARBY_MULTI_SUPPORT_SEARCH_CONFIG,
    dependencies: NearbyMultiSupportSearchDependencies = defaultDependencies,
): GeometryBuildResult<NearbyMultiSupportSearchSession> {
    const plan = buildNearbyMultiSupportSearchPlan(seed, config);
    return plan.geometry
        ? {
              geometry: new NearbyMultiSupportSearchSession(inputs, plan.geometry, dependencies),
              errors: [],
          }
        : { errors: plan.errors };
}

export function searchNearbyMultiSupportCandidates(
    inputs: NearbyMultiSupportSearchInputs,
    seed: NearbyMultiSupportSearchSeed,
    config: NearbyMultiSupportSearchConfig = DEFAULT_NEARBY_MULTI_SUPPORT_SEARCH_CONFIG,
    dependencies: NearbyMultiSupportSearchDependencies = defaultDependencies,
): GeometryBuildResult<NearbyMultiSupportSearchResult> {
    const sessionResult = createNearbyMultiSupportSearchSession(inputs, seed, config, dependencies);
    if (!sessionResult.geometry) {
        return { errors: sessionResult.errors };
    }
    while (sessionResult.geometry.hasPending()) {
        sessionResult.geometry.evaluateNext();
    }
    return { geometry: sessionResult.geometry.getSnapshot(), errors: [] };
}

export function expandNearbyMultiSupportSearchConfig(
    config: NearbyMultiSupportSearchConfig,
): NearbyMultiSupportSearchConfig {
    return {
        ...config,
        alphaRadius: quantize(config.alphaRadius + 0.1),
        thetaRadiusDeg: quantize(config.thetaRadiusDeg + 2),
        lambdaRadiusCm: quantize(config.lambdaRadiusCm + 1),
    };
}
