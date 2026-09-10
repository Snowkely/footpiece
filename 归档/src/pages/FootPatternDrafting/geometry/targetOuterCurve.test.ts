import footPieceSampleJson from '../data/footPieceSample.json';
import type {
    DraftingParameters,
    DraftPoint,
    FootPieceSample,
    TargetReferenceArcGeometry,
} from '../types';
import { buildBackPiece } from './backPiece';
import { polylineLength } from './curveUtils';
import { alignFootPieceToFrontPiece } from './footPiece';
import { buildFrontPiece } from './frontPiece';
import { distance, VALIDATION_TOLERANCE_CM } from './geometryUtils';
import { deriveTargetAnkleIntersections } from './targetAnkle';
import {
    evaluateTargetOuterCurveCandidate,
    evaluateTargetOuterCurveLength,
    evaluateTargetOuterCurveSpatialChecks,
    sampleTargetOuterCurve,
    TARGET_OUTER_CURVE_SAMPLE_SEGMENTS,
} from './targetOuterCurve';
import { deriveTargetReferenceArc } from './targetReferenceArc';
import { deriveTargetUtConstruction } from './targetUt';
import { deriveTargetWPrime } from './targetWPrime';

const sample = footPieceSampleJson as FootPieceSample;
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

function point(id: string, x: number, y: number): DraftPoint {
    return { id, x, y };
}

function rotate(pointToRotate: DraftPoint, radians: number): DraftPoint {
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    return {
        ...pointToRotate,
        x: pointToRotate.x * cosine - pointToRotate.y * sine,
        y: pointToRotate.x * sine + pointToRotate.y * cosine,
    };
}

function translate(pointToTranslate: DraftPoint, x: number, y: number): DraftPoint {
    return {
        ...pointToTranslate,
        x: pointToTranslate.x + x,
        y: pointToTranslate.y + y,
    };
}

function createStepFiveGeometry(alpha = 0.5, wPrimeOffsetCm = 1) {
    const backPiece = buildBackPiece(parameters).geometry!;
    const frontPiece = buildFrontPiece(parameters, 'adult', backPiece.x, backPiece.z).geometry!;
    const footPiece = alignFootPieceToFrontPiece(sample, frontPiece, parameters.r!).geometry!;
    const targetAnkle = deriveTargetAnkleIntersections(footPiece, frontPiece).geometry!;
    const targetReference = deriveTargetReferenceArc(footPiece, targetAnkle, sample).geometry!;
    const targetUt = deriveTargetUtConstruction(
        footPiece.alignedLandmarks.P,
        footPiece.alignedLandmarks.Q,
        parameters.a,
        alpha,
    ).geometry!;
    const targetWPrime = deriveTargetWPrime(
        footPiece.automaticPositioning!.alignedSourceSecondToe,
        frontPiece.points.MPrime,
        frontPiece.points.O,
        wPrimeOffsetCm,
    ).geometry!;
    return { frontPiece, footPiece, targetAnkle, targetReference, targetUt, targetWPrime };
}

const interpolationAnchors = [
    point('L', -6, 0),
    point('U', -5, -4),
    point("W'", 0, -8),
    point('T', 5, -4),
    point("G'", 6, 0),
];

const referenceArc = [
    point('R*', 2, 0),
    point('Q', 2, -2),
    point('W', 0, -4),
    point('P', -2, -2),
    point('S*', -2, 0),
];

describe('target outer curve sampling', () => {
    it("starts at L, ends at G', and interpolates U/W'/T", () => {
        const sampled = sampleTargetOuterCurve(interpolationAnchors).geometry!;

        expect(sampled[0]).toEqual(interpolationAnchors[0]);
        expect(sampled.at(-1)).toEqual(interpolationAnchors.at(-1));
        interpolationAnchors.slice(1, -1).forEach((anchor) => {
            expect(Math.min(...sampled.map((candidate) => distance(candidate, anchor)))).toBe(0);
        });
    });

    it('returns finite points with a deterministic sample count and result', () => {
        const first = sampleTargetOuterCurve(interpolationAnchors).geometry!;
        const second = sampleTargetOuterCurve(interpolationAnchors).geometry!;

        expect(first).toHaveLength(TARGET_OUTER_CURVE_SAMPLE_SEGMENTS + 1);
        expect(
            first.every(
                (candidate) => Number.isFinite(candidate.x) && Number.isFinite(candidate.y),
            ),
        ).toBe(true);
        expect(second).toEqual(first);
    });

    it('fails closed for repeated or malformed anchors', () => {
        const repeated = [...interpolationAnchors];
        repeated[1] = { ...repeated[0], id: 'U' };

        expect(sampleTargetOuterCurve(repeated).errors[0].code).toBe(
            'TARGET_OUTER_CURVE_DEGENERATE',
        );
        expect(sampleTargetOuterCurve(interpolationAnchors.slice(0, 4)).errors[0].code).toBe(
            'TARGET_OUTER_CURVE_INPUT_INVALID',
        );
    });
});

describe('target outer curve length evaluation', () => {
    it('calculates extra length and rejects candidates below 1 cm', () => {
        const evaluation = evaluateTargetOuterCurveLength(10.5, 10);

        expect(evaluation.extraLengthCm).toBeCloseTo(0.5, 12);
        expect(evaluation.pass).toBe(false);
        expect(evaluation.rejectionReason).toBe('OUTER_CURVE_TOO_SHORT');
    });

    it('accepts the complete 1–2 cm range including tolerance boundaries', () => {
        expect(evaluateTargetOuterCurveLength(11, 10).pass).toBe(true);
        expect(evaluateTargetOuterCurveLength(12, 10).pass).toBe(true);
        expect(evaluateTargetOuterCurveLength(11 - VALIDATION_TOLERANCE_CM / 2, 10).pass).toBe(
            true,
        );
        expect(evaluateTargetOuterCurveLength(12 + VALIDATION_TOLERANCE_CM / 2, 10).pass).toBe(
            true,
        );
    });

    it('rejects candidates above 2 cm', () => {
        const evaluation = evaluateTargetOuterCurveLength(12.5, 10);

        expect(evaluation.pass).toBe(false);
        expect(evaluation.rejectionReason).toBe('OUTER_CURVE_TOO_LONG');
    });
});

describe('target outer curve spatial evaluation', () => {
    it('accepts a fully outside candidate', () => {
        const candidate = [point('a', -3, 1), point('b', 3, 1)];
        const result = evaluateTargetOuterCurveSpatialChecks(candidate, referenceArc);

        expect(result.outsideReference).toBe(true);
        expect(result.noReferenceIntersection).toBe(true);
        expect(result.noSelfIntersection).toBe(true);
    });

    it('detects a candidate entering the reference polygon', () => {
        const candidate = [point('a', -3, -2), point('b', 0, -2), point('c', 3, -2)];
        const result = evaluateTargetOuterCurveSpatialChecks(candidate, referenceArc);

        expect(result.insidePointCount).toBeGreaterThan(0);
        expect(result.outsideReference).toBe(false);
    });

    it('detects a crossing of the actual target reference arc', () => {
        const candidate = [point('a', -3, -1), point('b', 3, -1)];
        const result = evaluateTargetOuterCurveSpatialChecks(candidate, referenceArc);

        expect(result.referenceIntersectionCount).toBeGreaterThan(0);
        expect(result.noReferenceIntersection).toBe(false);
    });

    it('detects non-adjacent self-intersections', () => {
        const candidate = [
            point('a', -3, 1),
            point('b', 3, -5),
            point('c', -3, -5),
            point('d', 3, 1),
        ];
        const distantReference = referenceArc.map((candidatePoint) =>
            translate(candidatePoint, 30, 0),
        );
        const result = evaluateTargetOuterCurveSpatialChecks(candidate, distantReference);

        expect(result.selfIntersectionCount).toBeGreaterThan(0);
        expect(result.noSelfIntersection).toBe(false);
    });

    it('does not treat the synthetic S*→R* polygon closure as a reference-arc intersection', () => {
        const closureTouch = [point('a', 0, 1), point('b', 0, 0)];
        const result = evaluateTargetOuterCurveSpatialChecks(closureTouch, referenceArc);

        expect(result.boundaryPointCount).toBe(1);
        expect(result.referenceIntersectionCount).toBe(0);
        expect(result.noReferenceIntersection).toBe(true);
    });

    it('is rotation and translation invariant', () => {
        const candidate = [point('a', -3, -1), point('b', 3, -1)];
        const base = evaluateTargetOuterCurveSpatialChecks(candidate, referenceArc);
        const radians = Math.PI * 0.31;
        const transformedCandidate = candidate.map((candidatePoint) =>
            translate(rotate(candidatePoint, radians), 12, -7),
        );
        const transformedReference = referenceArc.map((candidatePoint) =>
            translate(rotate(candidatePoint, radians), 12, -7),
        );
        const transformed = evaluateTargetOuterCurveSpatialChecks(
            transformedCandidate,
            transformedReference,
        );

        expect(transformed.insidePointCount).toBe(base.insidePointCount);
        expect(transformed.referenceIntersectionCount).toBe(base.referenceIntersectionCount);
        expect(transformed.selfIntersectionCount).toBe(base.selfIntersectionCount);
    });
});

describe('current target outer curve candidate', () => {
    it('returns deterministic evaluated geometry even when the current candidate is rejected', () => {
        const geometry = createStepFiveGeometry();
        const input = {
            frontPiece: geometry.frontPiece,
            targetReferenceArc: geometry.targetReference,
            targetUt: geometry.targetUt,
            targetWPrime: geometry.targetWPrime,
        };
        const first = evaluateTargetOuterCurveCandidate(input);
        const second = evaluateTargetOuterCurveCandidate(input);

        expect(first.errors).toEqual([]);
        expect(first.geometry).toBeDefined();
        expect(second.geometry).toEqual(first.geometry);
        expect(first.geometry?.checks.anchorInterpolation.pass).toBe(true);
        expect(first.geometry?.polylinePoints).toHaveLength(TARGET_OUTER_CURVE_SAMPLE_SEGMENTS + 1);
        expect(first.geometry?.outerCurveLengthCm).toBeCloseTo(
            polylineLength(first.geometry!.polylinePoints),
            12,
        );
        expect(first.geometry?.extraLengthCm).toBeCloseTo(
            first.geometry!.outerCurveLengthCm - first.geometry!.referenceLengthCm,
            12,
        );
        expect(first.geometry?.valid).toBe(first.geometry?.rejectionReasons.length === 0);
    });

    it('keeps the current rejected candidate inspectable with specific rejection reasons', () => {
        const geometry = createStepFiveGeometry();
        const result = evaluateTargetOuterCurveCandidate({
            frontPiece: geometry.frontPiece,
            targetReferenceArc: geometry.targetReference,
            targetUt: geometry.targetUt,
            targetWPrime: geometry.targetWPrime,
        });

        expect(result.errors).toEqual([]);
        expect(result.geometry?.valid).toBe(false);
        expect(result.geometry?.rejectionReasons).toEqual(
            expect.arrayContaining([
                'OUTER_CURVE_TOO_SHORT',
                'OUTER_CURVE_INSIDE_REFERENCE',
                'OUTER_CURVE_REFERENCE_INTERSECTION',
            ]),
        );
        expect(result.geometry?.checks.noSelfIntersection.pass).toBe(true);
    });

    it('stores current alpha/offset and does not mutate any Step 1–5 input', () => {
        const geometry = createStepFiveGeometry(0.37, 2.4);
        const snapshots = {
            frontPiece: JSON.stringify(geometry.frontPiece),
            footPiece: JSON.stringify(geometry.footPiece),
            targetAnkle: JSON.stringify(geometry.targetAnkle),
            targetReference: JSON.stringify(geometry.targetReference),
            targetUt: JSON.stringify(geometry.targetUt),
            targetWPrime: JSON.stringify(geometry.targetWPrime),
        };
        const candidate = evaluateTargetOuterCurveCandidate({
            frontPiece: geometry.frontPiece,
            targetReferenceArc: geometry.targetReference,
            targetUt: geometry.targetUt,
            targetWPrime: geometry.targetWPrime,
        }).geometry!;

        expect(candidate.alpha).toBe(0.37);
        expect(candidate.wPrimeOffsetCm).toBe(2.4);
        expect(JSON.stringify(geometry.frontPiece)).toBe(snapshots.frontPiece);
        expect(JSON.stringify(geometry.footPiece)).toBe(snapshots.footPiece);
        expect(JSON.stringify(geometry.targetAnkle)).toBe(snapshots.targetAnkle);
        expect(JSON.stringify(geometry.targetReference)).toBe(snapshots.targetReference);
        expect(JSON.stringify(geometry.targetUt)).toBe(snapshots.targetUt);
        expect(JSON.stringify(geometry.targetWPrime)).toBe(snapshots.targetWPrime);
    });

    it("keeps alpha and W' offset independent while changing the resulting candidate", () => {
        const base = createStepFiveGeometry(0.5, 1);
        const alphaChanged = createStepFiveGeometry(0.7, 1);
        const offsetChanged = createStepFiveGeometry(0.5, 3);
        const evaluate = (geometry: ReturnType<typeof createStepFiveGeometry>) =>
            evaluateTargetOuterCurveCandidate({
                frontPiece: geometry.frontPiece,
                targetReferenceArc: geometry.targetReference,
                targetUt: geometry.targetUt,
                targetWPrime: geometry.targetWPrime,
            }).geometry!;
        const baseCandidate = evaluate(base);
        const alphaCandidate = evaluate(alphaChanged);
        const offsetCandidate = evaluate(offsetChanged);

        expect(alphaChanged.targetWPrime.WPrime).toEqual(base.targetWPrime.WPrime);
        expect(alphaChanged.targetUt.U).not.toEqual(base.targetUt.U);
        expect(alphaCandidate.polylinePoints).not.toEqual(baseCandidate.polylinePoints);
        expect(offsetChanged.targetUt).toEqual(base.targetUt);
        expect(offsetChanged.targetWPrime.WPrime).not.toEqual(base.targetWPrime.WPrime);
        expect(offsetCandidate.polylinePoints).not.toEqual(baseCandidate.polylinePoints);
    });

    it('returns a fatal build error for malformed reference input', () => {
        const geometry = createStepFiveGeometry();
        const malformedReference: TargetReferenceArcGeometry = {
            ...geometry.targetReference,
            targetReferenceArcLengthCm: Number.NaN,
        };
        const result = evaluateTargetOuterCurveCandidate({
            frontPiece: geometry.frontPiece,
            targetReferenceArc: malformedReference,
            targetUt: geometry.targetUt,
            targetWPrime: geometry.targetWPrime,
        });

        expect(result.geometry).toBeUndefined();
        expect(result.errors[0].code).toBe('TARGET_OUTER_CURVE_INPUT_INVALID');
    });
});
