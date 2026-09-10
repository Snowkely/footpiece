import sampleJson from '../data/footPieceSample.json';
import type { DraftingParameters, FootPieceSample } from '../types';
import { buildBackPiece } from './backPiece';
import {
    BROAD_SEARCH_ALPHA_MAX,
    BROAD_SEARCH_ALPHA_MIN,
    BROAD_SEARCH_LAMBDA_MAX_CM,
    BROAD_SEARCH_LAMBDA_MIN_CM,
    BROAD_SEARCH_THETA_MAX_DEG,
    BROAD_SEARCH_THETA_MIN_DEG,
    buildBroadMultiSupportSearchPlan,
    createBroadMultiSupportSearchSession,
    DEFAULT_BROAD_MULTI_SUPPORT_SEARCH_CONFIG,
    fitBroadSearchConfigToEvaluationLimit,
    MAX_BROAD_SEARCH_EVALUATIONS,
    searchBroadMultiSupportCandidates,
    type BroadMultiSupportSearchConfig,
} from './broadMultiSupportSearch';
import { alignFootPieceToFrontPiece } from './footPiece';
import { buildFrontPiece } from './frontPiece';
import { deriveTargetAnkleIntersections } from './targetAnkle';
import { evaluateTargetMultiSupportOuterCurveCandidate } from './targetMultiSupportOuterCurve';
import type {
    NearbyMultiSupportSearchDependencies,
    NearbyMultiSupportSearchInputs,
    NearbyMultiSupportSearchSeed,
} from './targetMultiSupportOuterCurveSearch';
import { runChunkedSearchSession } from './targetMultiSupportOuterCurveSearchRunner';
import { deriveTargetReferenceArc } from './targetReferenceArc';
import { deriveTargetUtConstruction } from './targetUt';
import { deriveTargetWPrime } from './targetWPrime';
import { deriveToeRadialOuterSupports } from './toeRadialOuterSupports';
import { deriveToeRadialReferences } from './toeRadialReferences';

const sample = sampleJson as FootPieceSample;
const parameters: DraftingParameters = {
    a: 14.6,
    b: 18,
    c: 18.8,
    d: 16,
    e: 11.2,
    f: 11.2,
    g: 5,
    r: 16.8,
};

function createInputs(): NearbyMultiSupportSearchInputs {
    const backPiece = buildBackPiece(parameters).geometry!;
    const frontPiece = buildFrontPiece(parameters, 'adult', backPiece.x, backPiece.z).geometry!;
    const footPiece = alignFootPieceToFrontPiece(sample, frontPiece, parameters.r!).geometry!;
    const targetAnkle = deriveTargetAnkleIntersections(footPiece, frontPiece).geometry!;
    const targetReferenceArc = deriveTargetReferenceArc(footPiece, targetAnkle, sample).geometry!;
    const automatic = footPiece.automaticPositioning!;
    return {
        frontPiece,
        targetReferenceArc,
        P: footPiece.alignedLandmarks.P,
        Q: footPiece.alignedLandmarks.Q,
        draftingA: parameters.a,
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
    isValid: (tuple: NearbyMultiSupportSearchSeed) => boolean,
): NearbyMultiSupportSearchDependencies {
    return {
        ...realDependencies,
        evaluateCandidate: (input) => {
            const result = evaluateTargetMultiSupportOuterCurveCandidate(input);
            if (!result.geometry) return result;
            const tuple = {
                alpha: input.targetUt.distribution,
                thetaDeg: input.toeRadialOuterSupports.thetaDeg,
                lambdaCm: input.toeRadialOuterSupports.outwardOffsetCm,
            };
            const valid = isValid(tuple);
            return {
                geometry: {
                    ...result.geometry,
                    valid,
                    rejectionReasons: valid
                        ? []
                        : ['OUTER_CURVE_TOO_SHORT', 'OUTER_CURVE_INSIDE_REFERENCE'],
                },
                errors: [],
            };
        },
    };
}

const smallConfig: BroadMultiSupportSearchConfig = {
    alphaMin: 0.5,
    alphaMax: 0.55,
    alphaStep: 0.05,
    thetaMinDeg: 10,
    thetaMaxDeg: 10,
    thetaStepDeg: 1,
    lambdaMinCm: 1,
    lambdaMaxCm: 1.2,
    lambdaStepCm: 0.1,
};

describe('broad multi-support search grid', () => {
    it('covers the full legal domain and deterministically coarsens the preferred default grid', () => {
        const fit = fitBroadSearchConfigToEvaluationLimit().geometry!;
        const plan = buildBroadMultiSupportSearchPlan().geometry!;

        expect(DEFAULT_BROAD_MULTI_SUPPORT_SEARCH_CONFIG).toEqual({
            alphaMin: BROAD_SEARCH_ALPHA_MIN,
            alphaMax: BROAD_SEARCH_ALPHA_MAX,
            alphaStep: 0.05,
            thetaMinDeg: BROAD_SEARCH_THETA_MIN_DEG,
            thetaMaxDeg: BROAD_SEARCH_THETA_MAX_DEG,
            thetaStepDeg: 1,
            lambdaMinCm: BROAD_SEARCH_LAMBDA_MIN_CM,
            lambdaMaxCm: BROAD_SEARCH_LAMBDA_MAX_CM,
            lambdaStepCm: 0.2,
        });
        expect(fit.requestedEstimatedCount).toBe(24_969);
        expect(fit.adjusted).toBe(true);
        expect(fit.config).toMatchObject({
            alphaStep: 0.0625,
            thetaStepDeg: 1.25,
            lambdaStepCm: 0.25,
        });
        expect(fit.estimatedCount).toBe(13_464);
        expect(fit.estimatedCount).toBeLessThanOrEqual(MAX_BROAD_SEARCH_EVALUATIONS);
        expect(plan.tuples).toHaveLength(13_464);
    });

    it('does not lower resolution when the requested grid already fits the limit', () => {
        const fit = fitBroadSearchConfigToEvaluationLimit(smallConfig).geometry!;

        expect(fit.adjusted).toBe(false);
        expect(fit.config).toEqual(smallConfig);
        expect(fit.requestedEstimatedCount).toBe(6);
        expect(fit.estimatedCount).toBe(6);
    });

    it('includes all domain boundaries without floating accumulation drift and keeps stable order', () => {
        const first = buildBroadMultiSupportSearchPlan().geometry!;
        const second = buildBroadMultiSupportSearchPlan().geometry!;

        expect(first).toEqual(second);
        expect(first.tuples[0]).toMatchObject({ alpha: 0, thetaDeg: 2, lambdaCm: 0 });
        expect(first.tuples.at(-1)).toMatchObject({ alpha: 1, thetaDeg: 30, lambdaCm: 8 });
        expect(
            first.tuples.every((tuple, index) => {
                if (index === 0) return true;
                const previous = first.tuples[index - 1];
                return (
                    tuple.alpha > previous.alpha ||
                    (tuple.alpha === previous.alpha && tuple.thetaDeg > previous.thetaDeg) ||
                    (tuple.alpha === previous.alpha &&
                        tuple.thetaDeg === previous.thetaDeg &&
                        tuple.lambdaCm > previous.lambdaCm)
                );
            }),
        ).toBe(true);
    });

    it('fails closed for invalid ranges, steps, and evaluation limits', () => {
        expect(
            fitBroadSearchConfigToEvaluationLimit({ ...smallConfig, alphaMin: -0.1 }).errors[0]
                .code,
        ).toBe('BROAD_SEARCH_CONFIG_INVALID');
        expect(
            fitBroadSearchConfigToEvaluationLimit({ ...smallConfig, thetaStepDeg: 0 }).errors[0]
                .code,
        ).toBe('BROAD_SEARCH_CONFIG_INVALID');
        expect(fitBroadSearchConfigToEvaluationLimit(smallConfig, 0).errors[0].code).toBe(
            'BROAD_SEARCH_CONFIG_INVALID',
        );
    });
});

describe('broad multi-support search orchestration', () => {
    const inputs = createInputs();

    it('reuses Step 6C validity and lightweight rejection summaries without storing polylines', () => {
        const before = JSON.stringify(inputs);
        const result = searchBroadMultiSupportCandidates(
            inputs,
            smallConfig,
            forcedValidityDependencies(({ alpha, lambdaCm }) => alpha === 0.5 && lambdaCm === 1.1),
        ).geometry!;

        expect(result.evaluatedCandidateCount).toBe(6);
        expect(result.validCandidateCount).toBe(1);
        expect(result.invalidCandidateCount).toBe(5);
        expect(result.validCandidates[0]).toMatchObject({
            id: 1,
            alpha: 0.5,
            thetaDeg: 10,
            lambdaCm: 1.1,
        });
        expect(result.rejectionStats.tooShort).toBe(5);
        expect(result.rejectionStats.insideReference).toBe(5);
        expect(JSON.stringify(result)).not.toContain('polylinePoints');
        expect(JSON.stringify(inputs)).toBe(before);
    });

    it('reuses alpha, theta, lambda, and theta-lambda caches', () => {
        const result = searchBroadMultiSupportCandidates(
            inputs,
            smallConfig,
            forcedValidityDependencies(() => false),
        ).geometry!;

        expect(result.cacheStats.alpha).toEqual({ builds: 2, hits: 4 });
        expect(result.cacheStats.theta).toEqual({ builds: 1, hits: 5 });
        expect(result.cacheStats.lambda).toEqual({ builds: 3, hits: 3 });
        expect(result.cacheStats.thetaLambda).toEqual({ builds: 3, hits: 3 });
    });

    it('fast-skips all dependent tuples for an invalid theta and continues the grid', () => {
        const deriveToeReferences = jest.fn(realDependencies.deriveToeReferences);
        deriveToeReferences.mockImplementation((input) =>
            input.thetaDeg === 10
                ? { errors: [{ code: 'TEST_THETA_INVALID', message: 'invalid theta' }] }
                : realDependencies.deriveToeReferences(input),
        );
        const config = { ...smallConfig, thetaMaxDeg: 11 };
        const result = searchBroadMultiSupportCandidates(inputs, config, {
            ...forcedValidityDependencies(() => false),
            deriveToeReferences,
        }).geometry!;

        expect(deriveToeReferences).toHaveBeenCalledTimes(2);
        expect(result.evaluatedCandidateCount).toBe(12);
        expect(result.invalidThetaSkippedCandidates).toBe(6);
        expect(result.rejectionStats.toeReferenceBuildError).toBe(6);
    });

    it('rebuilds a selected summary through the same Step 4/6A/6B/6C pipeline', () => {
        const session = createBroadMultiSupportSearchSession(
            inputs,
            { ...smallConfig, alphaMax: 0.5, lambdaMaxCm: 1 },
            forcedValidityDependencies(() => true),
        ).geometry!;
        const evaluation = session.evaluateNext()!;
        const preview = session.rebuildCandidate(evaluation.discoveredCandidate!).geometry!;

        expect(preview.outerCurveLengthCm).toBeCloseTo(
            evaluation.discoveredCandidate!.outerLengthCm,
            12,
        );
        expect(preview.extraLengthCm).toBeCloseTo(
            evaluation.discoveredCandidate!.extraLengthCm,
            12,
        );
    });

    it('uses the shared chunked runner and cancellation retains a partial independent history', async () => {
        const session = createBroadMultiSupportSearchSession(
            inputs,
            smallConfig,
            forcedValidityDependencies(() => true),
        ).geometry!;
        let cancel = false;
        const outcome = await runChunkedSearchSession(session, {
            chunkSize: 1,
            shouldCancel: () => cancel,
            onProgress: () => {
                cancel = true;
            },
            yieldControl: async () => undefined,
        });
        const snapshot = session.getSnapshot();

        expect(outcome).toBe('CANCELLED');
        expect(snapshot.evaluatedCandidateCount).toBe(1);
        expect(snapshot.validCandidateCount).toBe(1);
        expect(snapshot.totalCandidateCount).toBe(6);
    });
});
