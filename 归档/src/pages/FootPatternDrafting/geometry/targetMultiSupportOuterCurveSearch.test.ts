import sampleJson from '../data/footPieceSample.json';
import type {
    DraftingParameters,
    FootPieceSample,
    TargetMultiSupportOuterCurveCandidate,
} from '../types';
import { buildBackPiece } from './backPiece';
import { alignFootPieceToFrontPiece } from './footPiece';
import { buildFrontPiece } from './frontPiece';
import { deriveTargetAnkleIntersections } from './targetAnkle';
import { evaluateTargetMultiSupportOuterCurveCandidate } from './targetMultiSupportOuterCurve';
import type {
    NearbyMultiSupportSearchConfig,
    NearbyMultiSupportSearchDependencies,
    NearbyMultiSupportSearchInputs,
    NearbyMultiSupportSearchSeed,
} from './targetMultiSupportOuterCurveSearch';
import {
    buildNearbyMultiSupportSearchPlan,
    createNearbyMultiSupportSearchSession,
    DEFAULT_NEARBY_MULTI_SUPPORT_SEARCH_CONFIG,
    expandNearbyMultiSupportSearchConfig,
    fitSearchConfigToEvaluationLimit,
    MAX_NEARBY_SEARCH_EVALUATIONS,
    nearbySearchDistance,
    searchNearbyMultiSupportCandidates,
} from './targetMultiSupportOuterCurveSearch';
import { runNearbyMultiSupportSearchSession } from './targetMultiSupportOuterCurveSearchRunner';
import { deriveTargetReferenceArc } from './targetReferenceArc';
import { deriveTargetUtConstruction } from './targetUt';
import { deriveTargetWPrime } from './targetWPrime';
import { deriveToeRadialOuterSupports } from './toeRadialOuterSupports';
import { deriveToeRadialReferences } from './toeRadialReferences';

const sample = sampleJson as FootPieceSample;
const draftingParameters: DraftingParameters = {
    a: 14.6,
    b: 18,
    c: 18.8,
    d: 16,
    e: 11.2,
    f: 11.2,
    g: 5,
    r: 16.8,
};
const defaultSeed: NearbyMultiSupportSearchSeed = {
    alpha: 0.5,
    thetaDeg: 10,
    lambdaCm: 1,
};
const smallConfig: NearbyMultiSupportSearchConfig = {
    alphaRadius: 0.02,
    alphaStep: 0.02,
    thetaRadiusDeg: 0,
    thetaStepDeg: 0.5,
    lambdaRadiusCm: 0.1,
    lambdaStepCm: 0.1,
};

function createInputs(): NearbyMultiSupportSearchInputs {
    const backPiece = buildBackPiece(draftingParameters).geometry!;
    const frontPiece = buildFrontPiece(draftingParameters, 'adult', backPiece.x, backPiece.z)
        .geometry!;
    const footPiece = alignFootPieceToFrontPiece(sample, frontPiece, draftingParameters.r!)
        .geometry!;
    const targetAnkle = deriveTargetAnkleIntersections(footPiece, frontPiece).geometry!;
    const targetReferenceArc = deriveTargetReferenceArc(footPiece, targetAnkle, sample).geometry!;
    const automatic = footPiece.automaticPositioning!;
    return {
        frontPiece,
        targetReferenceArc,
        P: footPiece.alignedLandmarks.P,
        Q: footPiece.alignedLandmarks.Q,
        draftingA: draftingParameters.a,
        Ms: automatic.alignedSourceMs,
        W: automatic.alignedSourceSecondToe,
        MPrime: frontPiece.points.MPrime,
        O: frontPiece.points.O,
    };
}

const realDependencies: NearbyMultiSupportSearchDependencies = {
    deriveUt: deriveTargetUtConstruction,
    deriveWPrime: deriveTargetWPrime,
    deriveToeReferences: deriveToeRadialReferences,
    deriveOuterSupports: deriveToeRadialOuterSupports,
    evaluateCandidate: evaluateTargetMultiSupportOuterCurveCandidate,
};

function forcedValidityDependencies(
    isValid: (alpha: number, thetaDeg: number, lambdaCm: number) => boolean,
    evaluated?: NearbyMultiSupportSearchSeed[],
    invalidReasons: TargetMultiSupportOuterCurveCandidate['rejectionReasons'] = [
        'OUTER_CURVE_TOO_SHORT',
    ],
): NearbyMultiSupportSearchDependencies {
    return {
        ...realDependencies,
        evaluateCandidate: (input) => {
            const result = evaluateTargetMultiSupportOuterCurveCandidate(input);
            if (!result.geometry) {
                return result;
            }
            const tuple = {
                alpha: input.targetUt.distribution,
                thetaDeg: input.toeRadialOuterSupports.thetaDeg,
                lambdaCm: input.toeRadialOuterSupports.outwardOffsetCm,
            };
            evaluated?.push(tuple);
            const valid = isValid(tuple.alpha, tuple.thetaDeg, tuple.lambdaCm);
            return {
                geometry: {
                    ...result.geometry,
                    valid,
                    rejectionReasons: valid ? [] : [...invalidReasons],
                },
                errors: [],
            };
        },
    };
}

describe('nearby multi-support search plan', () => {
    it('builds the default centered grid with all clamped endpoints', () => {
        const plan = buildNearbyMultiSupportSearchPlan(
            defaultSeed,
            DEFAULT_NEARBY_MULTI_SUPPORT_SEARCH_CONFIG,
        ).geometry!;

        expect(plan.alphaCount).toBe(17);
        expect(plan.thetaCount).toBe(13);
        expect(plan.lambdaCount).toBe(21);
        expect(plan.tuples).toHaveLength(4_641);
        expect(plan.tuples[0]).toMatchObject({ ...defaultSeed, distanceFromSeed: 0 });
        expect(plan.tuples.some((tuple) => tuple.alpha === 0.35)).toBe(true);
        expect(plan.tuples.some((tuple) => tuple.alpha === 0.65)).toBe(true);
        expect(plan.tuples.some((tuple) => tuple.thetaDeg === 7)).toBe(true);
        expect(plan.tuples.some((tuple) => tuple.thetaDeg === 13)).toBe(true);
        expect(plan.tuples.some((tuple) => tuple.lambdaCm === 0)).toBe(true);
        expect(plan.tuples.some((tuple) => tuple.lambdaCm === 2)).toBe(true);
    });

    it('freezes the seed snapshot independently of later manual-state changes', () => {
        const mutableSeed = { ...defaultSeed };
        const session = createNearbyMultiSupportSearchSession(
            createInputs(),
            mutableSeed,
            { ...smallConfig, alphaRadius: 0, lambdaRadiusCm: 0 },
            forcedValidityDependencies(() => false),
        ).geometry!;

        mutableSeed.alpha = 0.9;
        mutableSeed.thetaDeg = 20;
        mutableSeed.lambdaCm = 4;

        expect(session.getSnapshot().seed).toEqual(defaultSeed);
        expect(session.evaluateNext()?.tuple).toMatchObject(defaultSeed);
    });

    it('sorts outward from the seed by normalized distance with deterministic ties', () => {
        const plan = buildNearbyMultiSupportSearchPlan(defaultSeed, smallConfig).geometry!;
        const distances = plan.tuples.map((tuple) => tuple.distanceFromSeed);

        expect(
            distances.every((distance, index) => index === 0 || distance >= distances[index - 1]),
        ).toBe(true);
        expect(buildNearbyMultiSupportSearchPlan(defaultSeed, smallConfig).geometry).toEqual(plan);
        const equalDistance = plan.tuples.filter(
            (tuple) => Math.abs(tuple.distanceFromSeed - 1) < 1e-10,
        );
        expect(equalDistance).toEqual(
            [...equalDistance].sort(
                (first, second) =>
                    first.alpha - second.alpha ||
                    first.thetaDeg - second.thetaDeg ||
                    first.lambdaCm - second.lambdaCm,
            ),
        );
    });

    it('normalizes distance independently for alpha, theta, and lambda units', () => {
        expect(
            nearbySearchDistance(
                defaultSeed,
                { alpha: 0.65, thetaDeg: 13, lambdaCm: 2 },
                DEFAULT_NEARBY_MULTI_SUPPORT_SEARCH_CONFIG,
            ),
        ).toBeCloseTo(Math.sqrt(3), 12);
    });

    it('fails closed for invalid config and excessive candidate counts', () => {
        const invalid = buildNearbyMultiSupportSearchPlan(defaultSeed, {
            ...smallConfig,
            alphaStep: 0,
        });
        const excessive = buildNearbyMultiSupportSearchPlan(defaultSeed, {
            alphaRadius: 0.5,
            alphaStep: 0.001,
            thetaRadiusDeg: 10,
            thetaStepDeg: 0.1,
            lambdaRadiusCm: 4,
            lambdaStepCm: 0.01,
        });

        expect(invalid.errors[0].code).toBe('NEARBY_SEARCH_CONFIG_INVALID');
        expect(excessive.errors[0].code).toBe('NEARBY_SEARCH_TOO_LARGE');
        expect(MAX_NEARBY_SEARCH_EVALUATIONS).toBe(20_000);
    });

    it('preserves every requested step when an expanded region stays within the limit', () => {
        const requestedConfig = expandNearbyMultiSupportSearchConfig(
            DEFAULT_NEARBY_MULTI_SUPPORT_SEARCH_CONFIG,
        );
        const fit = fitSearchConfigToEvaluationLimit(defaultSeed, requestedConfig).geometry!;

        expect(fit.adjusted).toBe(false);
        expect(fit.config).toEqual(requestedConfig);
        expect(fit.estimatedCount).toBe(17_577);
        expect(fit.stepMultiplier).toBe(1);
        expect(fit.adjustmentRounds).toBe(0);
    });

    it('deterministically increases only steps when an expanded region exceeds the limit', () => {
        const firstExpansion = expandNearbyMultiSupportSearchConfig(
            DEFAULT_NEARBY_MULTI_SUPPORT_SEARCH_CONFIG,
        );
        const requestedConfig = expandNearbyMultiSupportSearchConfig(firstExpansion);
        const firstFit = fitSearchConfigToEvaluationLimit(defaultSeed, requestedConfig).geometry!;
        const secondFit = fitSearchConfigToEvaluationLimit(defaultSeed, requestedConfig).geometry!;

        expect(firstFit).toEqual(secondFit);
        expect(firstFit.requestedEstimatedCount).toBe(43_993);
        expect(firstFit.estimatedCount).toBe(13_300);
        expect(firstFit.adjusted).toBe(true);
        expect(firstFit.config.alphaRadius).toBe(requestedConfig.alphaRadius);
        expect(firstFit.config.thetaRadiusDeg).toBe(requestedConfig.thetaRadiusDeg);
        expect(firstFit.config.lambdaRadiusCm).toBe(requestedConfig.lambdaRadiusCm);
        expect(firstFit.config.alphaStep).toBeGreaterThan(requestedConfig.alphaStep);
        expect(firstFit.config.thetaStepDeg).toBeGreaterThan(requestedConfig.thetaStepDeg);
        expect(firstFit.config.lambdaStepCm).toBeGreaterThan(requestedConfig.lambdaStepCm);
        expect(firstFit.config).toEqual({
            ...requestedConfig,
            alphaStep: 0.03125,
            thetaStepDeg: 0.78125,
            lambdaStepCm: 0.15625,
        });
    });
});

describe('nearby multi-support search orchestration', () => {
    const inputs = createInputs();

    it('builds and evaluates the real current-default seed through Steps 4/5/6A/6B/6C', () => {
        const session = createNearbyMultiSupportSearchSession(inputs, defaultSeed, {
            ...smallConfig,
            alphaRadius: 0,
            lambdaRadiusCm: 0,
        }).geometry!;
        const evaluation = session.evaluateNext()!;

        expect(evaluation.tuple).toMatchObject(defaultSeed);
        expect(evaluation.candidate).toBeDefined();
    });

    it('evaluates the seed first, streams it as Candidate #1 when valid, and continues', () => {
        const evaluated: NearbyMultiSupportSearchSeed[] = [];
        const dependencies = forcedValidityDependencies(
            (alpha, theta, lambda) => alpha === 0.5 && theta === 10 && lambda === 1,
            evaluated,
        );
        const result = searchNearbyMultiSupportCandidates(
            inputs,
            defaultSeed,
            smallConfig,
            dependencies,
        ).geometry!;

        expect(evaluated[0]).toEqual(defaultSeed);
        expect(result.validCandidates[0]).toMatchObject({ id: 1, ...defaultSeed });
        expect(result.evaluatedCandidateCount).toBe(9);
        expect(evaluated).toHaveLength(9);
        expect(result.validCandidateCount).toBe(1);
        expect(result.invalidCandidateCount).toBe(8);
    });

    it('does not add an invalid seed and discovers later valid tuples in distance order', () => {
        const dependencies = forcedValidityDependencies(
            (alpha, _theta, lambda) => alpha === 0.48 && lambda === 1,
        );
        const result = searchNearbyMultiSupportCandidates(
            inputs,
            defaultSeed,
            smallConfig,
            dependencies,
        ).geometry!;

        expect(result.validCandidates[0]).toMatchObject({ id: 1, alpha: 0.48, lambdaCm: 1 });
        expect(result.validCandidates.some((candidate) => candidate.distanceFromSeed === 0)).toBe(
            false,
        );
    });

    it('reuses alpha, theta, lambda, and theta-lambda caches', () => {
        const result = searchNearbyMultiSupportCandidates(
            inputs,
            defaultSeed,
            smallConfig,
            forcedValidityDependencies(() => false),
        ).geometry!;

        expect(result.cacheStats.alpha).toEqual({ builds: 3, hits: 6 });
        expect(result.cacheStats.theta).toEqual({ builds: 1, hits: 8 });
        expect(result.cacheStats.lambda).toEqual({ builds: 3, hits: 6 });
        expect(result.cacheStats.thetaLambda).toEqual({ builds: 3, hits: 6 });
    });

    it('counts every rejection reason without storing invalid polylines', () => {
        const result = searchNearbyMultiSupportCandidates(
            inputs,
            defaultSeed,
            { ...smallConfig, alphaRadius: 0, lambdaRadiusCm: 0 },
            forcedValidityDependencies(() => false, undefined, [
                'OUTER_CURVE_TOO_SHORT',
                'OUTER_CURVE_INSIDE_REFERENCE',
            ]),
        ).geometry!;

        expect(result.validCandidates).toEqual([]);
        expect(result.rejectionStats.tooShort).toBe(1);
        expect(result.rejectionStats.insideReference).toBe(1);
        expect(JSON.stringify(result)).not.toContain('polylinePoints');
    });

    it('fast-skips every dependent tuple for a failed theta and continues other theta values', () => {
        const deriveToeReferences = jest.fn(realDependencies.deriveToeReferences);
        deriveToeReferences.mockImplementation((input) =>
            input.thetaDeg === 10
                ? {
                      errors: [
                          {
                              code: 'TOE_RADIAL_W1_INTERSECTION_NOT_FOUND',
                              message: 'invalid theta',
                          },
                      ],
                  }
                : realDependencies.deriveToeReferences(input),
        );
        const config = {
            ...smallConfig,
            alphaRadius: 0,
            thetaRadiusDeg: 0.5,
            lambdaRadiusCm: 0.1,
        };
        const result = searchNearbyMultiSupportCandidates(inputs, defaultSeed, config, {
            ...forcedValidityDependencies(() => false),
            deriveToeReferences,
        }).geometry!;

        expect(deriveToeReferences).toHaveBeenCalledTimes(3);
        expect(result.invalidThetaSkippedCandidates).toBe(3);
        expect(result.rejectionStats.toeReferenceBuildError).toBe(3);
        expect(result.evaluatedCandidateCount).toBe(9);
    });

    it('continues after one tuple build error and does not mutate fixed inputs', () => {
        const before = JSON.stringify(inputs);
        const dependencies = forcedValidityDependencies(() => true);
        const deriveUt = jest.fn(realDependencies.deriveUt);
        deriveUt.mockImplementation((P, Q, a, alpha) =>
            alpha === 0.48
                ? { errors: [{ code: 'TEST_UT_ERROR', message: 'test build failure' }] }
                : realDependencies.deriveUt(P, Q, a, alpha),
        );
        const result = searchNearbyMultiSupportCandidates(inputs, defaultSeed, smallConfig, {
            ...dependencies,
            deriveUt,
        }).geometry!;

        expect(result.rejectionStats.utBuildError).toBe(3);
        expect(result.validCandidateCount).toBe(6);
        expect(result.evaluatedCandidateCount).toBe(9);
        expect(JSON.stringify(inputs)).toBe(before);
    });

    it('expands around the same seed without recomputing old tuples or clearing history', () => {
        const evaluated: NearbyMultiSupportSearchSeed[] = [];
        const dependencies = forcedValidityDependencies(() => true, evaluated);
        const session = createNearbyMultiSupportSearchSession(
            inputs,
            defaultSeed,
            { ...smallConfig, alphaRadius: 0, lambdaRadiusCm: 0 },
            dependencies,
        ).geometry!;
        while (session.hasPending()) session.evaluateNext();
        const firstSnapshot = session.getSnapshot();
        expect(expandNearbyMultiSupportSearchConfig(firstSnapshot.config)).toMatchObject({
            alphaRadius: 0.1,
            thetaRadiusDeg: 2,
            lambdaRadiusCm: 1,
        });
        const expandedConfig = {
            ...firstSnapshot.config,
            alphaRadius: 0.02,
            lambdaRadiusCm: 0.1,
        };
        expect(session.extend(expandedConfig).geometry?.seed).toEqual(defaultSeed);
        while (session.hasPending()) session.evaluateNext();
        const expandedSnapshot = session.getSnapshot();
        const evaluatedKeys = evaluated.map((tuple) => JSON.stringify(tuple));

        expect(new Set(evaluatedKeys).size).toBe(evaluatedKeys.length);
        expect(
            expandedSnapshot.validCandidates.slice(0, firstSnapshot.validCandidateCount),
        ).toEqual(firstSnapshot.validCandidates);
        expect(expandedSnapshot.evaluatedCandidateCount).toBeGreaterThan(
            firstSnapshot.evaluatedCandidateCount,
        );
    });

    it('recomputes a selected lightweight summary to matching candidate metrics', () => {
        const session = createNearbyMultiSupportSearchSession(
            inputs,
            defaultSeed,
            { ...smallConfig, alphaRadius: 0, lambdaRadiusCm: 0 },
            forcedValidityDependencies(() => true),
        ).geometry!;
        const evaluation = session.evaluateNext()!;
        const summary = evaluation.discoveredCandidate!;
        const preview = session.rebuildCandidate(summary).geometry!;

        expect(preview.outerCurveLengthCm).toBeCloseTo(summary.outerLengthCm, 12);
        expect(preview.extraLengthCm).toBeCloseTo(summary.extraLengthCm, 12);
        expect(preview.diagnostics).toEqual(summary.diagnostics);
        expect('polylinePoints' in summary).toBe(false);
    });
});

describe('nearby multi-support async runner', () => {
    const inputs = createInputs();

    it('streams the first valid result and continues evaluating later chunks', async () => {
        const session = createNearbyMultiSupportSearchSession(
            inputs,
            defaultSeed,
            smallConfig,
            forcedValidityDependencies(() => true),
        ).geometry!;
        const streamedIds: number[] = [];
        const progress: number[] = [];
        const outcome = await runNearbyMultiSupportSearchSession(session, {
            chunkSize: 1,
            shouldCancel: () => false,
            onValidCandidate: (evaluation) => {
                streamedIds.push(evaluation.discoveredCandidate!.id);
            },
            onProgress: (snapshot) => {
                progress.push(snapshot.evaluatedCandidateCount);
            },
            yieldControl: async () => undefined,
        });

        expect(outcome).toBe('COMPLETED');
        expect(streamedIds[0]).toBe(1);
        expect(streamedIds).toHaveLength(9);
        expect(progress[progress.length - 1]).toBe(9);
    });

    it('cancels future evaluation without clearing discovered history', async () => {
        const session = createNearbyMultiSupportSearchSession(
            inputs,
            defaultSeed,
            smallConfig,
            forcedValidityDependencies(() => true),
        ).geometry!;
        let cancelled = false;
        const outcome = await runNearbyMultiSupportSearchSession(session, {
            chunkSize: 1,
            shouldCancel: () => cancelled,
            onProgress: () => {
                cancelled = true;
            },
            yieldControl: async () => undefined,
        });
        const snapshot = session.getSnapshot();

        expect(outcome).toBe('CANCELLED');
        expect(snapshot.evaluatedCandidateCount).toBe(1);
        expect(snapshot.validCandidateCount).toBe(1);
        expect(snapshot.validCandidates[0].id).toBe(1);
        expect(snapshot.evaluatedCandidateCount).toBeLessThan(snapshot.totalCandidateCount);
    });
});
