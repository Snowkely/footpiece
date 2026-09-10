import footPieceSampleJson from '../data/footPieceSample.json';
import type { DraftingParameters, DraftPoint, FootPieceSample } from '../types';
import { buildBackPiece } from './backPiece';
import { alignFootPieceToFrontPiece } from './footPiece';
import { buildFrontPiece } from './frontPiece';
import { distance, VALIDATION_TOLERANCE_CM } from './geometryUtils';
import { deriveTargetAnkleIntersections } from './targetAnkle';
import { deriveTargetReferenceArc } from './targetReferenceArc';
import { DEFAULT_UT_DISTRIBUTION, deriveTargetUtConstruction } from './targetUt';

const sample = footPieceSampleJson as FootPieceSample;
const parameters: DraftingParameters = {
    a: 13.14,
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

function createStepThreeGeometry() {
    const backPiece = buildBackPiece(parameters).geometry!;
    const frontPiece = buildFrontPiece(parameters, 'adult', backPiece.x, backPiece.z).geometry!;
    const footPiece = alignFootPieceToFrontPiece(sample, frontPiece, parameters.r!).geometry!;
    const targetAnkle = deriveTargetAnkleIntersections(footPiece, frontPiece).geometry!;
    const targetReference = deriveTargetReferenceArc(footPiece, targetAnkle, sample).geometry!;
    return { frontPiece, footPiece, targetAnkle, targetReference };
}

describe('deriveTargetUtConstruction', () => {
    const P = point('P', -2, -3);
    const Q = point('Q', 2, -3);

    it('derives a finite non-zero normalized P-Q direction', () => {
        const geometry = deriveTargetUtConstruction(P, Q, 10, 0.5).geometry!;

        expect(geometry.pqLengthCm).toBeCloseTo(4, 12);
        expect(Math.hypot(geometry.pqDirection.x, geometry.pqDirection.y)).toBeCloseTo(1, 12);
    });

    it('splits the extra length equally at the default alpha', () => {
        const geometry = deriveTargetUtConstruction(P, Q, 10, DEFAULT_UT_DISTRIBUTION).geometry!;

        expect(DEFAULT_UT_DISTRIBUTION).toBe(0.5);
        expect(geometry.upLengthCm).toBeCloseTo(3, 12);
        expect(geometry.qtLengthCm).toBeCloseTo(3, 12);
        expect(geometry.upLengthCm).toBeCloseTo(geometry.qtLengthCm, 12);
    });

    it('puts U at P when alpha is zero', () => {
        const geometry = deriveTargetUtConstruction(P, Q, 10, 0).geometry!;

        expect(geometry.U).toEqual({ ...P, id: 'U' });
        expect(geometry.upLengthCm).toBe(0);
        expect(geometry.qtLengthCm).toBeCloseTo(6, 12);
    });

    it('puts T at Q when alpha is one', () => {
        const geometry = deriveTargetUtConstruction(P, Q, 10, 1).geometry!;

        expect(geometry.T).toEqual({ ...Q, id: 'T' });
        expect(geometry.upLengthCm).toBeCloseTo(6, 12);
        expect(geometry.qtLengthCm).toBe(0);
    });

    it('uses alpha and 1-alpha for a general distribution', () => {
        const alpha = 0.25;
        const geometry = deriveTargetUtConstruction(P, Q, 10, alpha).geometry!;

        expect(geometry.upLengthCm).toBeCloseTo(alpha * (10 - 4), 12);
        expect(geometry.qtLengthCm).toBeCloseTo((1 - alpha) * (10 - 4), 12);
        expect(geometry.upLengthCm / (geometry.upLengthCm + geometry.qtLengthCm)).toBeCloseTo(
            alpha,
            12,
        );
    });

    it('enforces UT=a, the length decomposition, collinearity, and direction order', () => {
        const geometry = deriveTargetUtConstruction(P, Q, 10, 0.37).geometry!;

        expect(distance(geometry.U, geometry.T)).toBeCloseTo(10, 12);
        expect(geometry.upLengthCm + geometry.pqLengthCm + geometry.qtLengthCm).toBeCloseTo(10, 12);
        expect(geometry.checks.collinearity.pass).toBe(true);
        expect(geometry.checks.directionOrder.pass).toBe(true);
        expect(geometry.checks.utLength.pass).toBe(true);
        expect(geometry.checks.decomposition.pass).toBe(true);
    });

    it('is rotation invariant', () => {
        const radians = Math.PI * 0.37;
        const base = deriveTargetUtConstruction(P, Q, 10, 0.3).geometry!;
        const rotated = deriveTargetUtConstruction(rotate(P, radians), rotate(Q, radians), 10, 0.3)
            .geometry!;
        const expectedU = rotate(base.U, radians);
        const expectedT = rotate(base.T, radians);

        expect(distance(rotated.U, expectedU)).toBeLessThan(1e-10);
        expect(distance(rotated.T, expectedT)).toBeLessThan(1e-10);
        expect(rotated.checks.collinearity.pass).toBe(true);
    });

    it('is translation invariant', () => {
        const offsetX = 17.25;
        const offsetY = -9.4;
        const base = deriveTargetUtConstruction(P, Q, 10, 0.7).geometry!;
        const translated = deriveTargetUtConstruction(
            translate(P, offsetX, offsetY),
            translate(Q, offsetX, offsetY),
            10,
            0.7,
        ).geometry!;

        expect(distance(translated.U, translate(base.U, offsetX, offsetY))).toBeLessThan(1e-10);
        expect(distance(translated.T, translate(base.T, offsetX, offsetY))).toBeLessThan(1e-10);
    });

    it('fails closed when a is shorter than PQ beyond tolerance', () => {
        const result = deriveTargetUtConstruction(P, Q, 3, 0.5);

        expect(result.geometry).toBeUndefined();
        expect(result.errors[0].code).toBe('TARGET_UT_A_SHORTER_THAN_PQ');
    });

    it('accepts a sub-tolerance a/PQ difference with zero extra length', () => {
        const a = 4 - VALIDATION_TOLERANCE_CM / 2;
        const result = deriveTargetUtConstruction(P, Q, a, 0.5);

        expect(result.errors).toEqual([]);
        expect(result.geometry?.extraLengthCm).toBe(0);
        expect(result.geometry?.U).toEqual({ ...P, id: 'U' });
        expect(result.geometry?.T).toEqual({ ...Q, id: 'T' });
        expect(result.geometry?.checks.utLength.pass).toBe(true);
    });

    it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])('fails closed for invalid a: %s', (a) => {
        const result = deriveTargetUtConstruction(P, Q, a, 0.5);

        expect(result.geometry).toBeUndefined();
        expect(result.errors[0].code).toBe('TARGET_UT_A_INVALID');
    });

    it('fails closed for a degenerate P-Q direction', () => {
        const result = deriveTargetUtConstruction(P, { ...P, id: 'Q' }, 10, 0.5);

        expect(result.geometry).toBeUndefined();
        expect(result.errors[0].code).toBe('TARGET_UT_PQ_DIRECTION_INVALID');
    });

    it.each([-0.01, 1.01, Number.NaN])(
        'fails closed for invalid distribution alpha: %s',
        (distribution) => {
            const result = deriveTargetUtConstruction(P, Q, 10, distribution);

            expect(result.geometry).toBeUndefined();
            expect(result.errors[0].code).toBe('TARGET_UT_DISTRIBUTION_INVALID');
        },
    );

    it('does not mutate P or Q', () => {
        const mutableP = point('P', -2, -3);
        const mutableQ = point('Q', 2, -3);
        const beforeP = { ...mutableP };
        const beforeQ = { ...mutableQ };
        const geometry = deriveTargetUtConstruction(mutableP, mutableQ, 10, 0.41).geometry!;

        expect(mutableP).toEqual(beforeP);
        expect(mutableQ).toEqual(beforeQ);
        expect(geometry.checks.pUnchanged.pass).toBe(true);
        expect(geometry.checks.qUnchanged.pass).toBe(true);
    });

    it('uses the calibrated aligned landmarks and leaves Step 1/2/3 unchanged as alpha changes', () => {
        const { frontPiece, footPiece, targetAnkle, targetReference } = createStepThreeGeometry();
        const beforeFront = JSON.stringify(frontPiece);
        const beforeFootPiece = JSON.stringify(footPiece);
        const beforeTargetAnkle = JSON.stringify(targetAnkle);
        const beforeTargetReference = JSON.stringify(targetReference);
        const geometry = deriveTargetUtConstruction(
            footPiece.alignedLandmarks.P,
            footPiece.alignedLandmarks.Q,
            parameters.a,
            DEFAULT_UT_DISTRIBUTION,
        ).geometry!;
        const redistributed = deriveTargetUtConstruction(
            footPiece.alignedLandmarks.P,
            footPiece.alignedLandmarks.Q,
            parameters.a,
            0.667,
        ).geometry!;

        expect(geometry.checks.utLength.expected).toBe(parameters.a);
        expect(geometry.pqLengthCm).toBeCloseTo(9.9, 2);
        expect(geometry.targetUtLengthCm).toBeCloseTo(13.14, 12);
        expect(redistributed.upLengthCm / redistributed.qtLengthCm).toBeCloseTo(2.003003, 6);
        expect(JSON.stringify(frontPiece)).toBe(beforeFront);
        expect(JSON.stringify(footPiece)).toBe(beforeFootPiece);
        expect(JSON.stringify(targetAnkle)).toBe(beforeTargetAnkle);
        expect(JSON.stringify(targetReference)).toBe(beforeTargetReference);
    });
});
