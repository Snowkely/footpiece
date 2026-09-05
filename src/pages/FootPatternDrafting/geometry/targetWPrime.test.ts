import footPieceSampleJson from '../data/footPieceSample.json';
import type { DraftingParameters, DraftPoint, FootPieceSample } from '../types';
import { buildBackPiece } from './backPiece';
import { alignFootPieceToFrontPiece } from './footPiece';
import { buildFrontPiece } from './frontPiece';
import { distance } from './geometryUtils';
import { deriveTargetAnkleIntersections } from './targetAnkle';
import { deriveTargetReferenceArc } from './targetReferenceArc';
import { deriveTargetUtConstruction } from './targetUt';
import {
    DEFAULT_WPRIME_OUTWARD_OFFSET_CM,
    deriveTargetWPrime,
    TARGET_WPRIME_DIRECTION_DOT_MIN,
} from './targetWPrime';

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

function createStepFourGeometry(alpha = 0.5) {
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
    return { frontPiece, footPiece, targetAnkle, targetReference, targetUt };
}

describe('deriveTargetWPrime', () => {
    const MPrime = point("M'", 0, 0);
    const O = point('O', 0, 8);
    const W = point('W', 0, -10);

    it("sets W' equal to W when offset is zero", () => {
        const geometry = deriveTargetWPrime(W, MPrime, O, 0).geometry!;

        expect(geometry.WPrime).toEqual({ ...W, id: "W'" });
        expect(geometry.distanceFromW).toBe(0);
    });

    it("uses the default 1 cm offset and preserves M'-W-W' collinearity", () => {
        const geometry = deriveTargetWPrime(W, MPrime, O, DEFAULT_WPRIME_OUTWARD_OFFSET_CM)
            .geometry!;

        expect(DEFAULT_WPRIME_OUTWARD_OFFSET_CM).toBe(1);
        expect(geometry.distanceFromW).toBeCloseTo(1, 12);
        expect(geometry.distanceFromMPrime).toBeCloseTo(11, 12);
        expect(geometry.checks.collinearity.pass).toBe(true);
        expect(geometry.checks.directionOrder.pass).toBe(true);
    });

    it('supports a general non-negative outward offset', () => {
        const offset = 3.7;
        const geometry = deriveTargetWPrime(W, MPrime, O, offset).geometry!;

        expect(distance(W, geometry.WPrime)).toBeCloseTo(offset, 12);
        expect(geometry.checks.offsetDistance.pass).toBe(true);
        expect(geometry.checks.directionOrder.wToWPrimeProjectionCm).toBeGreaterThan(0);
    });

    it("aligns the M'-W toe direction with the O-to-M' front direction", () => {
        const geometry = deriveTargetWPrime(W, MPrime, O, 1).geometry!;

        expect(geometry.toeOutwardDirection).toEqual({ x: 0, y: -1 });
        expect(geometry.frontFootDirection).toEqual({ x: 0, y: -1 });
        expect(geometry.directionDot).toBe(1);
        expect(geometry.directionDot).toBeGreaterThan(TARGET_WPRIME_DIRECTION_DOT_MIN);
    });

    it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
        'fails closed for invalid offset: %s',
        (offset) => {
            const result = deriveTargetWPrime(W, MPrime, O, offset);

            expect(result.geometry).toBeUndefined();
            expect(result.errors[0].code).toBe('TARGET_WPRIME_OFFSET_INVALID');
        },
    );

    it("fails closed when M' and W do not define a direction", () => {
        const result = deriveTargetWPrime({ ...MPrime, id: 'W' }, MPrime, O, 1);

        expect(result.geometry).toBeUndefined();
        expect(result.errors[0].code).toBe('TARGET_WPRIME_DIRECTION_INVALID');
    });

    it("fails closed instead of flipping a reversed M'-W direction", () => {
        const result = deriveTargetWPrime(point('W', 0, 10), MPrime, O, 1);

        expect(result.geometry).toBeUndefined();
        expect(result.errors[0].code).toBe('TARGET_WPRIME_DIRECTION_REVERSED');
    });

    it('is rotation invariant', () => {
        const radians = Math.PI * 0.41;
        const base = deriveTargetWPrime(W, MPrime, O, 2.25).geometry!;
        const rotated = deriveTargetWPrime(
            rotate(W, radians),
            rotate(MPrime, radians),
            rotate(O, radians),
            2.25,
        ).geometry!;

        expect(distance(rotated.WPrime, rotate(base.WPrime, radians))).toBeLessThan(1e-10);
        expect(rotated.directionDot).toBeCloseTo(base.directionDot, 12);
    });

    it('is translation invariant', () => {
        const offsetX = 14.3;
        const offsetY = -6.8;
        const base = deriveTargetWPrime(W, MPrime, O, 2.25).geometry!;
        const translated = deriveTargetWPrime(
            translate(W, offsetX, offsetY),
            translate(MPrime, offsetX, offsetY),
            translate(O, offsetX, offsetY),
            2.25,
        ).geometry!;

        expect(distance(translated.WPrime, translate(base.WPrime, offsetX, offsetY))).toBeLessThan(
            1e-10,
        );
    });

    it('does not mutate the W input', () => {
        const mutableW = point('W', 0, -10);
        const before = { ...mutableW };
        const geometry = deriveTargetWPrime(mutableW, MPrime, O, 1).geometry!;

        expect(mutableW).toEqual(before);
        expect(geometry.checks.wUnchanged.pass).toBe(true);
    });

    it("keeps W' independent from alpha and keeps U/T independent from W' offset", () => {
        const stepFourAtAlphaA = createStepFourGeometry(0.25);
        const stepFourAtAlphaB = createStepFourGeometry(0.75);
        const automatic = stepFourAtAlphaA.footPiece.automaticPositioning!;
        const firstWPrime = deriveTargetWPrime(
            automatic.alignedSourceSecondToe,
            stepFourAtAlphaA.frontPiece.points.MPrime,
            stepFourAtAlphaA.frontPiece.points.O,
            1,
        ).geometry!;
        const secondWPrime = deriveTargetWPrime(
            automatic.alignedSourceSecondToe,
            stepFourAtAlphaA.frontPiece.points.MPrime,
            stepFourAtAlphaA.frontPiece.points.O,
            4,
        ).geometry!;
        const alphaChangedWPrime = deriveTargetWPrime(
            stepFourAtAlphaB.footPiece.automaticPositioning!.alignedSourceSecondToe,
            stepFourAtAlphaB.frontPiece.points.MPrime,
            stepFourAtAlphaB.frontPiece.points.O,
            1,
        ).geometry!;

        expect(stepFourAtAlphaA.targetUt.U).not.toEqual(stepFourAtAlphaB.targetUt.U);
        expect(stepFourAtAlphaA.targetUt.T).not.toEqual(stepFourAtAlphaB.targetUt.T);
        expect(alphaChangedWPrime.WPrime).toEqual(firstWPrime.WPrime);
        expect(firstWPrime.WPrime).not.toEqual(secondWPrime.WPrime);
        expect(firstWPrime.outwardOffsetCm).toBe(1);
        expect(secondWPrime.outwardOffsetCm).toBe(4);
    });

    it('does not mutate any Step 1/2/3/4 geometry as the offset changes', () => {
        const stepFour = createStepFourGeometry();
        const beforeFootPiece = JSON.stringify(stepFour.footPiece);
        const beforeTargetAnkle = JSON.stringify(stepFour.targetAnkle);
        const beforeTargetReference = JSON.stringify(stepFour.targetReference);
        const beforeTargetUt = JSON.stringify(stepFour.targetUt);
        const W = stepFour.footPiece.automaticPositioning!.alignedSourceSecondToe;

        deriveTargetWPrime(W, stepFour.frontPiece.points.MPrime, stepFour.frontPiece.points.O, 1);
        deriveTargetWPrime(W, stepFour.frontPiece.points.MPrime, stepFour.frontPiece.points.O, 6);

        expect(JSON.stringify(stepFour.footPiece)).toBe(beforeFootPiece);
        expect(JSON.stringify(stepFour.targetAnkle)).toBe(beforeTargetAnkle);
        expect(JSON.stringify(stepFour.targetReference)).toBe(beforeTargetReference);
        expect(JSON.stringify(stepFour.targetUt)).toBe(beforeTargetUt);
    });
});
