import sampleJson from '../data/footPieceSample.json';
import type { DraftingParameters, DraftPoint, FootPieceSample } from '../types';
import { buildBackPiece } from './backPiece';
import { polylineLength } from './curveUtils';
import { alignFootPieceToFrontPiece } from './footPiece';
import { buildFrontPiece } from './frontPiece';
import { distance } from './geometryUtils';
import { deriveTargetAnkleIntersections } from './targetAnkle';
import {
    evaluateTargetMultiSupportOuterCurveCandidate,
    sampleTargetMultiSupportOuterCurve,
    TARGET_MULTI_SUPPORT_OUTER_CURVE_ANCHOR_ORDER,
} from './targetMultiSupportOuterCurve';
import {
    evaluateTargetOuterCurveCandidate,
    evaluateTargetOuterCurveSpatialChecks,
    TARGET_OUTER_CURVE_SAMPLE_SEGMENTS,
} from './targetOuterCurve';
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

function point(id: string, x: number, y: number): DraftPoint {
    return { id, x, y };
}

function createGeometry(alpha = 0.5, thetaDeg = 10, outwardOffsetCm = 1) {
    const backPiece = buildBackPiece(parameters).geometry!;
    const frontPiece = buildFrontPiece(parameters, 'adult', backPiece.x, backPiece.z).geometry!;
    const footPiece = alignFootPieceToFrontPiece(sample, frontPiece, parameters.r!).geometry!;
    const targetAnkle = deriveTargetAnkleIntersections(footPiece, frontPiece).geometry!;
    const targetReferenceArc = deriveTargetReferenceArc(footPiece, targetAnkle, sample).geometry!;
    const targetUt = deriveTargetUtConstruction(
        footPiece.alignedLandmarks.P,
        footPiece.alignedLandmarks.Q,
        parameters.a,
        alpha,
    ).geometry!;
    const automatic = footPiece.automaticPositioning!;
    const targetWPrime = deriveTargetWPrime(
        automatic.alignedSourceSecondToe,
        frontPiece.points.MPrime,
        frontPiece.points.O,
        outwardOffsetCm,
    ).geometry!;
    const toeRadialReferences = deriveToeRadialReferences({
        Ms: automatic.alignedSourceMs,
        W: automatic.alignedSourceSecondToe,
        targetReferenceArc,
        thetaDeg,
    }).geometry!;
    const toeRadialOuterSupports = deriveToeRadialOuterSupports({
        Ms: automatic.alignedSourceMs,
        toeRadialReferences,
        existingWPrime: targetWPrime.WPrime,
        outwardOffsetCm,
    }).geometry!;
    const input = { frontPiece, targetReferenceArc, targetUt, toeRadialOuterSupports };
    const result = evaluateTargetMultiSupportOuterCurveCandidate(input);
    return {
        backPiece,
        frontPiece,
        footPiece,
        targetAnkle,
        targetReferenceArc,
        targetUt,
        targetWPrime,
        toeRadialReferences,
        toeRadialOuterSupports,
        input,
        result,
        candidate: result.geometry!,
    };
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
    return { ...pointToTranslate, x: pointToTranslate.x + x, y: pointToTranslate.y + y };
}

describe('multi-support anchor order and spline generation', () => {
    it("uses L-U-W4'-W3'-W'-W2'-W1'-T-G' in that exact order", () => {
        const { candidate, toeRadialOuterSupports } = createGeometry();

        expect(candidate.anchorOrder).toEqual(TARGET_MULTI_SUPPORT_OUTER_CURVE_ANCHOR_ORDER);
        expect(candidate.anchorOrder).not.toEqual([
            'L',
            'U',
            'W1Prime',
            'W2Prime',
            'WPrime',
            'W3Prime',
            'W4Prime',
            'T',
            'GPrime',
        ]);
        expect(candidate.anchors.W4Prime).toEqual(toeRadialOuterSupports.W4Prime.outerPoint);
        expect(candidate.anchors.W1Prime).toEqual(toeRadialOuterSupports.W1Prime.outerPoint);
    });

    it('starts at L, ends at GPrime, and exactly interpolates all nine anchors', () => {
        const { candidate } = createGeometry();
        const pointsPerInterval = TARGET_OUTER_CURVE_SAMPLE_SEGMENTS / 8;

        expect(candidate.polylinePoints[0]).toEqual(candidate.anchors.L);
        expect(candidate.polylinePoints.at(-1)).toEqual(candidate.anchors.GPrime);
        candidate.anchorOrder.forEach((id, index) => {
            expect(candidate.polylinePoints[index * pointsPerInterval]).toEqual(
                candidate.anchors[id],
            );
        });
        expect(candidate.checks.anchorInterpolation.pass).toBe(true);
    });

    it('uses one deterministic 400-segment centripetal Catmull-Rom spline', () => {
        const first = createGeometry();
        const second = evaluateTargetMultiSupportOuterCurveCandidate(first.input);

        expect(first.candidate.curveModel).toBe('centripetal-catmull-rom');
        expect(first.candidate.sampleSegments).toBe(400);
        expect(first.candidate.polylinePoints).toHaveLength(401);
        expect(first.candidate.polylinePoints.every((value) => Number.isFinite(value.x))).toBe(
            true,
        );
        expect(first.candidate.polylinePoints.every((value) => Number.isFinite(value.y))).toBe(
            true,
        );
        expect(first.candidate.diagnostics.toeTurningVariationDeg).toBeGreaterThanOrEqual(0);
        expect(second).toEqual(first.result);
    });

    it('fails closed for malformed or repeated anchor input', () => {
        const anchors = Array.from({ length: 9 }, (_, index) => point(`${index}`, index, index));
        anchors[4] = { ...anchors[3] };
        const repeated = sampleTargetMultiSupportOuterCurve(anchors);
        const malformed = sampleTargetMultiSupportOuterCurve(anchors.slice(0, 8));

        expect(repeated.errors[0].code).toBe('MULTI_OUTER_CURVE_DEGENERATE');
        expect(malformed.errors[0].code).toBe('MULTI_OUTER_CURVE_INPUT_INVALID');
    });

    it('is rotation and translation invariant', () => {
        const { candidate } = createGeometry();
        const anchors = candidate.anchorOrder.map((id) => candidate.anchors[id]);
        const radians = 0.67;
        const transformedAnchors = anchors.map((value) =>
            translate(rotate(value, radians), 8.4, -5.1),
        );
        const transformed = sampleTargetMultiSupportOuterCurve(transformedAnchors).geometry!;

        candidate.polylinePoints.forEach((value, index) => {
            expect(
                distance(
                    transformed.polylinePoints[index],
                    translate(rotate(value, radians), 8.4, -5.1),
                ),
            ).toBeLessThan(1e-7);
        });
    });
});

describe('multi-support candidate evaluation', () => {
    it('computes polyline length and extra length from the live Step 3 reference', () => {
        const { candidate, targetReferenceArc } = createGeometry();

        expect(candidate.outerCurveLengthCm).toBeCloseTo(
            polylineLength(candidate.polylinePoints),
            12,
        );
        expect(candidate.referenceLengthCm).toBe(targetReferenceArc.targetReferenceArcLengthCm);
        expect(candidate.extraLengthCm).toBeCloseTo(
            candidate.outerCurveLengthCm - candidate.referenceLengthCm,
            12,
        );
    });

    it.each([
        ['OUTER_CURVE_TOO_SHORT', 0.5, false],
        [undefined, 1.5, true],
        ['OUTER_CURVE_TOO_LONG', 2.5, false],
    ] as const)('evaluates the +1–2 cm length rule: %s', (reason, extra, expectedPass) => {
        const geometry = createGeometry();
        const targetReferenceArc = {
            ...geometry.targetReferenceArc,
            targetReferenceArcLengthCm: geometry.candidate.outerCurveLengthCm - extra,
        };
        const candidate = evaluateTargetMultiSupportOuterCurveCandidate({
            ...geometry.input,
            targetReferenceArc,
        }).geometry!;

        expect(candidate.checks.lengthRange.pass).toBe(expectedPass);
        expect(candidate.rejectionReasons.includes('OUTER_CURVE_TOO_SHORT')).toBe(
            reason === 'OUTER_CURVE_TOO_SHORT',
        );
        expect(candidate.rejectionReasons.includes('OUTER_CURVE_TOO_LONG')).toBe(
            reason === 'OUTER_CURVE_TOO_LONG',
        );
    });

    const referenceArc = [
        point('R*', -2, 0),
        point('Q', -2, 2),
        point('W', 0, 3),
        point('P', 2, 2),
        point('S*', 2, 0),
    ];

    it('rejects a curve inside the reference polygon', () => {
        const evaluation = evaluateTargetOuterCurveSpatialChecks(
            [point('a', -1, 1), point('b', 1, 1)],
            referenceArc,
        );
        expect(evaluation.outsideReference).toBe(false);
    });

    it('rejects a curve crossing the open reference arc', () => {
        const evaluation = evaluateTargetOuterCurveSpatialChecks(
            [point('a', -3, 1), point('b', 3, 1)],
            referenceArc,
        );
        expect(evaluation.noReferenceIntersection).toBe(false);
        expect(evaluation.referenceIntersectionCount).toBeGreaterThan(0);
    });

    it('rejects non-adjacent self-intersections', () => {
        const distantReference = referenceArc.map((value) => translate(value, 30, 0));
        const evaluation = evaluateTargetOuterCurveSpatialChecks(
            [point('a', -3, 1), point('b', 3, -5), point('c', -3, -5), point('d', 3, 1)],
            distantReference,
        );
        expect(evaluation.noSelfIntersection).toBe(false);
        expect(evaluation.selfIntersectionCount).toBeGreaterThan(0);
    });

    it('does not treat the SStar-to-RStar polygon closure as a reference intersection', () => {
        const evaluation = evaluateTargetOuterCurveSpatialChecks(
            [point('a', 0, 1), point('b', 0, 0)],
            referenceArc,
        );
        expect(evaluation.referenceIntersectionCount).toBe(0);
        expect(evaluation.noReferenceIntersection).toBe(true);
    });

    it('returns inspectable geometry and rejection reasons for an invalid candidate', () => {
        const { result, candidate } = createGeometry();

        expect(result.errors).toEqual([]);
        expect(candidate).toBeDefined();
        expect(candidate.valid).toBe(candidate.rejectionReasons.length === 0);
    });

    it('returns a fatal build error for malformed reference input', () => {
        const geometry = createGeometry();
        const result = evaluateTargetMultiSupportOuterCurveCandidate({
            ...geometry.input,
            targetReferenceArc: {
                ...geometry.targetReferenceArc,
                targetReferenceArcLengthCm: Number.NaN,
            },
        });

        expect(result.geometry).toBeUndefined();
        expect(result.errors[0].code).toBe('MULTI_OUTER_CURVE_INPUT_INVALID');
    });
});

describe('multi-support parameter dependencies and legacy isolation', () => {
    it('changes only U/T and the curve when alpha changes', () => {
        const base = createGeometry(0.5, 10, 1);
        const changed = createGeometry(0.667, 10, 1);

        expect(changed.targetUt.U).not.toEqual(base.targetUt.U);
        expect(changed.targetUt.T).not.toEqual(base.targetUt.T);
        expect(changed.toeRadialReferences).toEqual(base.toeRadialReferences);
        expect(changed.toeRadialOuterSupports).toEqual(base.toeRadialOuterSupports);
        expect(changed.candidate.polylinePoints).not.toEqual(base.candidate.polylinePoints);
    });

    it('changes references, supports, and the curve when theta changes, but not alpha/lambda', () => {
        const base = createGeometry(0.5, 5, 1);
        const changed = createGeometry(0.5, 10, 1);

        expect(changed.targetUt).toEqual(base.targetUt);
        expect(changed.toeRadialOuterSupports.outwardOffsetCm).toBe(
            base.toeRadialOuterSupports.outwardOffsetCm,
        );
        expect(changed.toeRadialReferences.W1.point).not.toEqual(base.toeRadialReferences.W1.point);
        expect(changed.toeRadialOuterSupports.W1Prime.outerPoint).not.toEqual(
            base.toeRadialOuterSupports.W1Prime.outerPoint,
        );
        expect(changed.candidate.polylinePoints).not.toEqual(base.candidate.polylinePoints);
    });

    it('changes only Prime supports and the curve when lambda changes', () => {
        const base = createGeometry(0.5, 10, 0.5);
        const changed = createGeometry(0.5, 10, 2);

        expect(changed.targetUt).toEqual(base.targetUt);
        expect(changed.toeRadialReferences).toEqual(base.toeRadialReferences);
        expect(changed.toeRadialOuterSupports.W4Prime.referencePoint).toEqual(
            base.toeRadialOuterSupports.W4Prime.referencePoint,
        );
        expect(changed.toeRadialOuterSupports.W4Prime.outerPoint).not.toEqual(
            base.toeRadialOuterSupports.W4Prime.outerPoint,
        );
        expect(changed.candidate.polylinePoints).not.toEqual(base.candidate.polylinePoints);
    });

    it('uses Step 6B Prime coordinates exactly and preserves Step 5 center WPrime', () => {
        const geometry = createGeometry();

        expect(geometry.candidate.anchors.W4Prime).toEqual(
            geometry.toeRadialOuterSupports.W4Prime.outerPoint,
        );
        expect(geometry.candidate.anchors.W3Prime).toEqual(
            geometry.toeRadialOuterSupports.W3Prime.outerPoint,
        );
        expect(geometry.candidate.anchors.WPrime).toEqual(geometry.targetWPrime.WPrime);
        expect(geometry.candidate.anchors.W2Prime).toEqual(
            geometry.toeRadialOuterSupports.W2Prime.outerPoint,
        );
        expect(geometry.candidate.anchors.W1Prime).toEqual(
            geometry.toeRadialOuterSupports.W1Prime.outerPoint,
        );
    });

    it('does not mutate Step 1-6B construction inputs', () => {
        const geometry = createGeometry(0.61, 7.5, 1.4);
        const before = JSON.stringify(geometry.input);

        evaluateTargetMultiSupportOuterCurveCandidate(geometry.input);

        expect(JSON.stringify(geometry.input)).toBe(before);
    });

    it('does not change or mutate the legacy single-WPrime evaluator', () => {
        const geometry = createGeometry();
        const legacyInput = {
            frontPiece: geometry.frontPiece,
            targetReferenceArc: geometry.targetReferenceArc,
            targetUt: geometry.targetUt,
            targetWPrime: geometry.targetWPrime,
        };
        const before = evaluateTargetOuterCurveCandidate(legacyInput);

        evaluateTargetMultiSupportOuterCurveCandidate(geometry.input);
        const after = evaluateTargetOuterCurveCandidate(legacyInput);

        expect(after).toEqual(before);
    });
});
