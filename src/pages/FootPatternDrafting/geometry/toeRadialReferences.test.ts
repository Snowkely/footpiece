import sampleJson from '../data/footPieceSample.json';
import type {
    DraftingParameters,
    DraftPoint,
    DraftVector2,
    FootPieceSample,
    TargetReferenceArcGeometry,
} from '../types';
import { buildBackPiece } from './backPiece';
import { normalizeVector, pointAtPolylineIdentity } from './footAxis';
import { alignFootPieceToFrontPiece } from './footPiece';
import { buildFrontPiece } from './frontPiece';
import { distance } from './geometryUtils';
import { deriveTargetAnkleIntersections } from './targetAnkle';
import { evaluateTargetOuterCurveCandidate } from './targetOuterCurve';
import { deriveTargetReferenceArc } from './targetReferenceArc';
import { deriveTargetUtConstruction } from './targetUt';
import { deriveTargetWPrime } from './targetWPrime';
import {
    DEFAULT_TOE_RADIAL_ANGLE_DEG,
    deriveToeRadialReferences,
    extractTargetToeReferenceArc,
    intersectRayWithOpenPolyline,
    validateToeRadialReferenceOrder,
} from './toeRadialReferences';

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

function createFrozenGeometry() {
    const backPiece = buildBackPiece(parameters).geometry!;
    const frontPiece = buildFrontPiece(parameters, 'adult', backPiece.x, backPiece.z).geometry!;
    const alignedFootPiece = alignFootPieceToFrontPiece(sample, frontPiece, parameters.r!)
        .geometry!;
    const targetAnkle = deriveTargetAnkleIntersections(alignedFootPiece, frontPiece).geometry!;
    const targetReferenceArc = deriveTargetReferenceArc(alignedFootPiece, targetAnkle, sample)
        .geometry!;
    const automatic = alignedFootPiece.automaticPositioning!;
    return {
        frontPiece,
        alignedFootPiece,
        targetAnkle,
        targetReferenceArc,
        Ms: automatic.alignedSourceMs,
        W: automatic.alignedSourceSecondToe,
    };
}

function deriveActual(thetaDeg = DEFAULT_TOE_RADIAL_ANGLE_DEG) {
    const geometry = createFrozenGeometry();
    const result = deriveToeRadialReferences({
        Ms: geometry.Ms,
        W: geometry.W,
        targetReferenceArc: geometry.targetReferenceArc,
        thetaDeg,
    });
    return { ...geometry, result, radial: result.geometry! };
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

function transformTargetReference(
    geometry: TargetReferenceArcGeometry,
    transform: (point: DraftPoint) => DraftPoint,
): TargetReferenceArcGeometry {
    return {
        ...geometry,
        targetReferenceArc: geometry.targetReferenceArc.map(transform),
        sourceReferenceArc: geometry.sourceReferenceArc.map(transform),
        startPoint: transform(geometry.startPoint),
        endPoint: transform(geometry.endPoint),
    };
}

describe('toe radial reference basic geometry', () => {
    it('creates the -2, -1, +1, +2 rays around unchanged Ms-W at theta=10 degrees', () => {
        const { radial, Ms, W } = deriveActual(10);

        expect([radial.W1.rayMultiplier, radial.W2.rayMultiplier]).toEqual([-2, -1]);
        expect([radial.W3.rayMultiplier, radial.W4.rayMultiplier]).toEqual([1, 2]);
        expect(radial.W1.angleRad).toBeCloseTo((-20 * Math.PI) / 180, 12);
        expect(radial.W2.angleRad).toBeCloseTo((-10 * Math.PI) / 180, 12);
        expect(radial.W3.angleRad).toBeCloseTo((10 * Math.PI) / 180, 12);
        expect(radial.W4.angleRad).toBeCloseTo((20 * Math.PI) / 180, 12);
        expect(radial.origin).toEqual(Ms);
        expect(radial.W).toEqual(W);
        expect(radial.centerDirection).toEqual(normalizeVector({ x: W.x - Ms.x, y: W.y - Ms.y }));
    });

    it.each(['W1', 'W2', 'W3', 'W4'] as const)(
        '%s direction is the semantic signed rotation of the center direction',
        (id) => {
            const { radial } = deriveActual(10);
            const reference = radial[id];
            const expected = rotateVector(
                radial.centerDirection,
                reference.angleRad * radial.angularOrientationSign,
            );

            expect(reference.direction.x).toBeCloseTo(expected.x, 12);
            expect(reference.direction.y).toBeCloseTo(expected.y, 12);
        },
    );

    it('validates all four adjacent angles against theta', () => {
        const { radial } = deriveActual(10);

        radial.checks.equalAngles.actualRad.forEach((angle) => {
            expect(angle).toBeCloseTo(radial.thetaRad, 10);
        });
        expect(radial.checks.equalAngles.maximumErrorRad).toBeLessThanOrEqual(
            radial.checks.equalAngles.toleranceRad,
        );
        expect(radial.checks.equalAngles.pass).toBe(true);
    });
});

describe('target Q-W-P toe arc and ray intersections', () => {
    it('extracts only the continuous Q-to-W-to-P section from Step 3', () => {
        const { targetReferenceArc } = createFrozenGeometry();
        const toeArc = extractTargetToeReferenceArc(targetReferenceArc).geometry!;

        expect(toeArc.points[0].id).toBe('Q');
        expect(toeArc.points[toeArc.wIndex].id).toBe('W');
        expect(toeArc.points.at(-1)?.id).toBe('P');
        expect(toeArc.points.some((point) => point.id === 'R*')).toBe(false);
        expect(toeArc.points.some((point) => point.id === 'S*')).toBe(false);
    });

    it('places W1-W4 on Q-W-P with strict Q-W1-W2-W-W3-W4-P order', () => {
        const { radial } = deriveActual(10);
        const references = [radial.W1, radial.W2, radial.W3, radial.W4];

        references.forEach((reference) => {
            const reconstructed = pointAtPolylineIdentity(
                radial.toeArcPoints,
                {
                    segmentIndex: reference.toeArcSegmentIndex,
                    segmentT: reference.toeArcSegmentT,
                },
                'reconstructed',
            )!;
            expect(distance(reference.point, reconstructed)).toBeLessThan(1e-8);
        });
        expect(radial.order).toEqual(['Q', 'W1', 'W2', 'W', 'W3', 'W4', 'P']);
        expect(radial.checks.orderValid.pass).toBe(true);
        expect(radial.checks.allOnToeArc.pass).toBe(true);
    });

    it('chooses the nearest positive hit when an open polyline crosses a ray more than once', () => {
        const hits = intersectRayWithOpenPolyline({ id: 'origin', x: 0, y: 0 }, { x: 1, y: 0 }, [
            { id: 'a', x: 2, y: -1 },
            { id: 'b', x: 2, y: 1 },
            { id: 'c', x: 4, y: 1 },
            { id: 'd', x: 4, y: -1 },
        ]);

        expect(hits).toHaveLength(2);
        expect(hits[0].rayT).toBeCloseTo(2, 12);
        expect(hits[1].rayT).toBeCloseTo(4, 12);
    });

    it('fails closed when theta sends a radial ray beyond the toe section', () => {
        const { Ms, W, targetReferenceArc } = createFrozenGeometry();
        const result = deriveToeRadialReferences({ Ms, W, targetReferenceArc, thetaDeg: 30 });

        expect(result.geometry).toBeUndefined();
        expect(result.errors.some((error) => error.code.includes('INTERSECTION_NOT_FOUND'))).toBe(
            true,
        );
    });

    it('rejects crossed semantic identity positions', () => {
        expect(validateToeRadialReferenceOrder(0, 4, 3, 5, 6, 7, 8)).toBe(false);
    });
});

describe('toe radial reference validation and invariance', () => {
    it.each([Number.NaN, Number.POSITIVE_INFINITY, 0, -1])(
        'fails closed for invalid theta %s',
        (thetaDeg) => {
            const { Ms, W, targetReferenceArc } = createFrozenGeometry();
            const result = deriveToeRadialReferences({ Ms, W, targetReferenceArc, thetaDeg });

            expect(result.geometry).toBeUndefined();
            expect(result.errors[0].code).toBe('TOE_RADIAL_ANGLE_INVALID');
        },
    );

    it('fails closed for a zero Ms-W center direction', () => {
        const { Ms, targetReferenceArc } = createFrozenGeometry();
        const result = deriveToeRadialReferences({
            Ms,
            W: { ...Ms, id: 'W' },
            targetReferenceArc,
            thetaDeg: 10,
        });

        expect(result.geometry).toBeUndefined();
        expect(result.errors[0].code).toBe('TOE_RADIAL_CENTER_DIRECTION_INVALID');
    });

    it('fails closed when Step 3 Q-W-P identities are invalid', () => {
        const { Ms, W, targetReferenceArc } = createFrozenGeometry();
        const result = deriveToeRadialReferences({
            Ms,
            W,
            targetReferenceArc: { ...targetReferenceArc, wIndexOnArc: -1 },
            thetaDeg: 10,
        });

        expect(result.geometry).toBeUndefined();
        expect(result.errors[0].code).toBe('TOE_RADIAL_TOE_ARC_INVALID');
    });

    it('is rotation and translation invariant', () => {
        const { Ms, W, targetReferenceArc, radial } = deriveActual(10);
        const radians = 0.73;
        const translation = { x: 13, y: -7 };
        const transform = (point: DraftPoint) => transformPoint(point, radians, translation);
        const transformed = deriveToeRadialReferences({
            Ms: transform(Ms),
            W: transform(W),
            targetReferenceArc: transformTargetReference(targetReferenceArc, transform),
            thetaDeg: 10,
        }).geometry!;

        (['W1', 'W2', 'W3', 'W4'] as const).forEach((id) => {
            expect(distance(transformed[id].point, transform(radial[id].point))).toBeLessThan(1e-7);
            expect(transformed[id].distanceFromMs).toBeCloseTo(radial[id].distanceFromMs, 9);
        });
    });

    it('is independent of mirrored screen orientation and global X direction', () => {
        const { Ms, W, targetReferenceArc, radial } = deriveActual(10);
        const mirror = (point: DraftPoint): DraftPoint => ({ ...point, x: -point.x });
        const mirrored = deriveToeRadialReferences({
            Ms: mirror(Ms),
            W: mirror(W),
            targetReferenceArc: transformTargetReference(targetReferenceArc, mirror),
            thetaDeg: 10,
        }).geometry!;

        (['W1', 'W2', 'W3', 'W4'] as const).forEach((id) => {
            expect(distance(mirrored[id].point, mirror(radial[id].point))).toBeLessThan(1e-7);
        });
        expect(mirrored.order).toEqual(radial.order);
    });

    it('changes only W1-W4 when theta changes and does not mutate Step 1-5 inputs', () => {
        const frozen = createFrozenGeometry();
        const before = JSON.stringify(frozen);
        const ten = deriveToeRadialReferences({
            Ms: frozen.Ms,
            W: frozen.W,
            targetReferenceArc: frozen.targetReferenceArc,
            thetaDeg: 10,
        }).geometry!;
        const five = deriveToeRadialReferences({
            Ms: frozen.Ms,
            W: frozen.W,
            targetReferenceArc: frozen.targetReferenceArc,
            thetaDeg: 5,
        }).geometry!;

        expect(JSON.stringify(frozen)).toBe(before);
        expect(five.origin).toEqual(ten.origin);
        expect(five.W).toEqual(ten.W);
        expect(five.centerDirection).toEqual(ten.centerDirection);
        expect(five.W1.point).not.toEqual(ten.W1.point);
        expect(five.W4.point).not.toEqual(ten.W4.point);
    });

    it('does not change or call the old Step 6 candidate evaluator', () => {
        const frozen = createFrozenGeometry();
        const targetUt = deriveTargetUtConstruction(
            frozen.alignedFootPiece.alignedLandmarks.P,
            frozen.alignedFootPiece.alignedLandmarks.Q,
            parameters.a,
            0.5,
        ).geometry!;
        const targetWPrime = deriveTargetWPrime(
            frozen.W,
            frozen.frontPiece.points.MPrime,
            frozen.frontPiece.points.O,
            1,
        ).geometry!;
        const oldCandidateBefore = evaluateTargetOuterCurveCandidate({
            frontPiece: frozen.frontPiece,
            targetReferenceArc: frozen.targetReferenceArc,
            targetUt,
            targetWPrime,
        }).geometry!;

        deriveToeRadialReferences({
            Ms: frozen.Ms,
            W: frozen.W,
            targetReferenceArc: frozen.targetReferenceArc,
            thetaDeg: 10,
        });

        const oldCandidateAfter = evaluateTargetOuterCurveCandidate({
            frontPiece: frozen.frontPiece,
            targetReferenceArc: frozen.targetReferenceArc,
            targetUt,
            targetWPrime,
        }).geometry!;
        expect(oldCandidateAfter).toEqual(oldCandidateBefore);
    });
});
