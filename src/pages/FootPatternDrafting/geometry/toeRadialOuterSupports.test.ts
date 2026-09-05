import sampleJson from '../data/footPieceSample.json';
import type {
    DraftingParameters,
    DraftPoint,
    DraftVector2,
    FootPieceSample,
    ToeRadialOuterSupportGeometry,
    ToeRadialReferenceGeometry,
} from '../types';
import { buildBackPiece } from './backPiece';
import { alignFootPieceToFrontPiece } from './footPiece';
import { buildFrontPiece } from './frontPiece';
import { distance } from './geometryUtils';
import { deriveTargetAnkleIntersections } from './targetAnkle';
import { evaluateTargetOuterCurveCandidate } from './targetOuterCurve';
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

function createFrozenGeometry(alpha = 0.5) {
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
    return {
        frontPiece,
        footPiece,
        targetAnkle,
        targetReferenceArc,
        targetUt,
        Ms: automatic.alignedSourceMs,
        W: automatic.alignedSourceSecondToe,
    };
}

function deriveActual(thetaDeg = 10, outwardOffsetCm = 1, alpha = 0.5) {
    const frozen = createFrozenGeometry(alpha);
    const toeRadialReferences = deriveToeRadialReferences({
        Ms: frozen.Ms,
        W: frozen.W,
        targetReferenceArc: frozen.targetReferenceArc,
        thetaDeg,
    }).geometry!;
    const targetWPrime = deriveTargetWPrime(
        frozen.W,
        frozen.frontPiece.points.MPrime,
        frozen.frontPiece.points.O,
        outwardOffsetCm,
    ).geometry!;
    const result = deriveToeRadialOuterSupports({
        Ms: frozen.Ms,
        toeRadialReferences,
        existingWPrime: targetWPrime.WPrime,
        outwardOffsetCm,
    });
    return {
        ...frozen,
        toeRadialReferences,
        targetWPrime,
        result,
        supports: result.geometry!,
    };
}

function supportList(geometry: ToeRadialOuterSupportGeometry) {
    return [
        geometry.W1Prime,
        geometry.W2Prime,
        geometry.WPrime,
        geometry.W3Prime,
        geometry.W4Prime,
    ];
}

function rotateVector(vector: DraftVector2, radians: number): DraftVector2 {
    return {
        x: vector.x * Math.cos(radians) - vector.y * Math.sin(radians),
        y: vector.x * Math.sin(radians) + vector.y * Math.cos(radians),
    };
}

function transformPoint(point: DraftPoint, radians: number, translation: DraftVector2): DraftPoint {
    const rotated = rotateVector(point, radians);
    return { ...point, x: rotated.x + translation.x, y: rotated.y + translation.y };
}

function transformReferences(
    geometry: ToeRadialReferenceGeometry,
    transformPointValue: (point: DraftPoint) => DraftPoint,
    transformDirection: (direction: DraftVector2) => DraftVector2,
): ToeRadialReferenceGeometry {
    const transformReference = (reference: ToeRadialReferenceGeometry['W1']) => ({
        ...reference,
        point: transformPointValue(reference.point),
        direction: transformDirection(reference.direction),
    });
    return {
        ...geometry,
        origin: transformPointValue(geometry.origin),
        W: transformPointValue(geometry.W),
        centerDirection: transformDirection(geometry.centerDirection),
        W1: transformReference(geometry.W1),
        W2: transformReference(geometry.W2),
        W3: transformReference(geometry.W3),
        W4: transformReference(geometry.W4),
        toeArcPoints: geometry.toeArcPoints.map(transformPointValue),
    };
}

describe('toe radial outer-support formulas', () => {
    it.each([
        ['W1Prime', 'W1'],
        ['W2Prime', 'W2'],
        ['WPrime', 'W'],
        ['W3Prime', 'W3'],
        ['W4Prime', 'W4'],
    ] as const)('%s equals %s plus its normalized Ms ray times lambda', (supportId) => {
        const { supports } = deriveActual(10, 1.7);
        const support = supports[supportId];

        expect(support.outerPoint.x).toBeCloseTo(
            support.referencePoint.x + support.direction.x * 1.7,
            12,
        );
        expect(support.outerPoint.y).toBeCloseTo(
            support.referencePoint.y + support.direction.y * 1.7,
            12,
        );
    });

    it('sets every Prime point equal to its reference when lambda is zero', () => {
        const { supports } = deriveActual(10, 0);

        supportList(supports).forEach((support) => {
            expect(support.outerPoint).toEqual({
                ...support.referencePoint,
                id: support.outerPoint.id,
            });
            expect(support.outwardDistance).toBe(0);
        });
    });

    it('adds exactly 1 cm to every radial support when lambda is 1', () => {
        const { supports } = deriveActual(10, 1);

        supportList(supports).forEach((support) => {
            expect(support.outwardDistance).toBeCloseTo(1, 12);
            expect(support.outerDistanceFromMs).toBeCloseTo(
                support.referenceDistanceFromMs + 1,
                12,
            );
        });
    });

    it('supports a general shared lambda and validates radial-distance decomposition', () => {
        const lambda = 3.45;
        const { supports } = deriveActual(10, lambda);

        supportList(supports).forEach((support) => {
            expect(distance(support.referencePoint, support.outerPoint)).toBeCloseTo(lambda, 12);
            expect(support.radialDistanceErrorCm).toBeCloseTo(0, 12);
        });
        expect(supports.checks.allOffsetsEqual.pass).toBe(true);
        expect(supports.checks.allRadialDistanceIncrements.pass).toBe(true);
    });
});

describe('toe radial outer-support direction and Step 5 consistency', () => {
    it('keeps Ms-Wi-WiPrime collinear and ordered on the outward ray', () => {
        const { supports } = deriveActual(10, 2.4);

        supportList(supports).forEach((support) => {
            expect(support.collinearityErrorCm).toBeLessThan(1e-10);
            expect(support.outwardProjectionCm).toBeGreaterThan(0);
            expect(support.radialAngleErrorRad).toBeLessThan(1e-7);
        });
        expect(supports.checks.allRadiallyCollinear.pass).toBe(true);
        expect(supports.checks.allOutward.pass).toBe(true);
        expect(supports.checks.allAnglesPreserved.pass).toBe(true);
    });

    it("makes the center radial W' identical to the existing Step 5 W'", () => {
        const { supports, targetWPrime } = deriveActual(10, 2.4);

        expect(distance(supports.WPrime.outerPoint, targetWPrime.WPrime)).toBeLessThan(1e-10);
        expect(supports.checks.centerWPrimeMatchesStep5.pass).toBe(true);
    });

    it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
        'fails closed for invalid lambda %s',
        (outwardOffsetCm) => {
            const current = deriveActual();
            const result = deriveToeRadialOuterSupports({
                Ms: current.Ms,
                toeRadialReferences: current.toeRadialReferences,
                existingWPrime: current.targetWPrime.WPrime,
                outwardOffsetCm,
            });

            expect(result.geometry).toBeUndefined();
            expect(result.errors[0].code).toBe('TOE_OUTER_SUPPORT_OFFSET_INVALID');
        },
    );

    it('fails closed for a zero Ms-Wi direction', () => {
        const current = deriveActual();
        const invalidReferences: ToeRadialReferenceGeometry = {
            ...current.toeRadialReferences,
            W1: {
                ...current.toeRadialReferences.W1,
                point: { ...current.Ms, id: 'W1' },
            },
        };
        const result = deriveToeRadialOuterSupports({
            Ms: current.Ms,
            toeRadialReferences: invalidReferences,
            existingWPrime: current.targetWPrime.WPrime,
            outwardOffsetCm: 1,
        });

        expect(result.geometry).toBeUndefined();
        expect(result.errors[0].code).toBe('TOE_OUTER_SUPPORT_DIRECTION_INVALID');
    });

    it("fails closed when radial W' does not match Step 5 W'", () => {
        const current = deriveActual();
        const result = deriveToeRadialOuterSupports({
            Ms: current.Ms,
            toeRadialReferences: current.toeRadialReferences,
            existingWPrime: {
                ...current.targetWPrime.WPrime,
                x: current.targetWPrime.WPrime.x + 0.2,
            },
            outwardOffsetCm: 1,
        });

        expect(result.geometry).toBeUndefined();
        expect(result.errors[0].code).toBe('TOE_RADIAL_CENTER_WPRIME_MISMATCH');
    });
});

describe('toe radial outer-support invariance and frozen inputs', () => {
    it('is rotation and translation invariant', () => {
        const current = deriveActual(10, 2.25);
        const radians = 0.71;
        const translation = { x: 11.2, y: -4.7 };
        const transform = (point: DraftPoint) => transformPoint(point, radians, translation);
        const transformedReferences = transformReferences(
            current.toeRadialReferences,
            transform,
            (direction) => rotateVector(direction, radians),
        );
        const transformed = deriveToeRadialOuterSupports({
            Ms: transform(current.Ms),
            toeRadialReferences: transformedReferences,
            existingWPrime: transform(current.targetWPrime.WPrime),
            outwardOffsetCm: 2.25,
        }).geometry!;

        supportList(transformed).forEach((support, index) => {
            expect(
                distance(
                    support.outerPoint,
                    transform(supportList(current.supports)[index].outerPoint),
                ),
            ).toBeLessThan(1e-8);
        });
    });

    it('does not depend on global X/Y or screen orientation', () => {
        const current = deriveActual(10, 1.8);
        const mirrorPoint = (point: DraftPoint): DraftPoint => ({ ...point, x: -point.x });
        const mirroredReferences = transformReferences(
            current.toeRadialReferences,
            mirrorPoint,
            (direction) => ({ x: -direction.x, y: direction.y }),
        );
        const mirrored = deriveToeRadialOuterSupports({
            Ms: mirrorPoint(current.Ms),
            toeRadialReferences: mirroredReferences,
            existingWPrime: mirrorPoint(current.targetWPrime.WPrime),
            outwardOffsetCm: 1.8,
        }).geometry!;

        supportList(mirrored).forEach((support, index) => {
            expect(
                distance(
                    support.outerPoint,
                    mirrorPoint(supportList(current.supports)[index].outerPoint),
                ),
            ).toBeLessThan(1e-8);
        });
    });

    it('changing lambda changes only Prime points and leaves theta/references/U/T frozen', () => {
        const one = deriveActual(10, 1, 0.3);
        const four = deriveActual(10, 4, 0.3);
        const oneReferences = supportList(one.supports).map((support) => support.referencePoint);
        const fourReferences = supportList(four.supports).map((support) => support.referencePoint);

        expect(oneReferences).toEqual(fourReferences);
        expect(one.supports.thetaDeg).toBe(four.supports.thetaDeg);
        expect(one.supports.outwardOffsetCm).not.toBe(four.supports.outwardOffsetCm);
        expect(one.targetUt).toEqual(four.targetUt);
        supportList(one.supports).forEach((support, index) => {
            expect(support.outerPoint).not.toEqual(supportList(four.supports)[index].outerPoint);
        });
    });

    it('changing theta rebuilds side references and Prime points without changing W, Ms, or lambda', () => {
        const five = deriveActual(5, 1.6);
        const ten = deriveActual(10, 1.6);

        expect(five.Ms).toEqual(ten.Ms);
        expect(five.W).toEqual(ten.W);
        expect(five.supports.outwardOffsetCm).toBe(ten.supports.outwardOffsetCm);
        expect(five.supports.WPrime).toEqual(ten.supports.WPrime);
        expect(five.supports.W1Prime.referencePoint).not.toEqual(
            ten.supports.W1Prime.referencePoint,
        );
        expect(five.supports.W1Prime.outerPoint).not.toEqual(ten.supports.W1Prime.outerPoint);
    });

    it('does not mutate Step 1-5 or Step 6A inputs', () => {
        const current = deriveActual(10, 1.4, 0.72);
        const frozenBefore = JSON.stringify({
            frontPiece: current.frontPiece,
            footPiece: current.footPiece,
            targetAnkle: current.targetAnkle,
            targetReferenceArc: current.targetReferenceArc,
            targetUt: current.targetUt,
            targetWPrime: current.targetWPrime,
            toeRadialReferences: current.toeRadialReferences,
        });

        deriveToeRadialOuterSupports({
            Ms: current.Ms,
            toeRadialReferences: current.toeRadialReferences,
            existingWPrime: current.targetWPrime.WPrime,
            outwardOffsetCm: 1.4,
        });

        expect(
            JSON.stringify({
                frontPiece: current.frontPiece,
                footPiece: current.footPiece,
                targetAnkle: current.targetAnkle,
                targetReferenceArc: current.targetReferenceArc,
                targetUt: current.targetUt,
                targetWPrime: current.targetWPrime,
                toeRadialReferences: current.toeRadialReferences,
            }),
        ).toBe(frozenBefore);
    });

    it('does not call or change the old Step 6 evaluator', () => {
        const current = deriveActual(10, 1.2);
        const evaluateOldStepSix = () =>
            evaluateTargetOuterCurveCandidate({
                frontPiece: current.frontPiece,
                targetReferenceArc: current.targetReferenceArc,
                targetUt: current.targetUt,
                targetWPrime: current.targetWPrime,
            });
        const before = evaluateOldStepSix();

        deriveToeRadialOuterSupports({
            Ms: current.Ms,
            toeRadialReferences: current.toeRadialReferences,
            existingWPrime: current.targetWPrime.WPrime,
            outwardOffsetCm: 1.2,
        });
        const after = evaluateOldStepSix();

        expect(after).toEqual(before);
    });
});
