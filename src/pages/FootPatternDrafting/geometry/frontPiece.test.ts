import type { DraftingParameters } from '../types';
import { buildBackPiece } from './backPiece';
import { buildFrontPiece } from './frontPiece';
import { distance } from './geometryUtils';

describe('buildFrontPiece', () => {
    const parameters: DraftingParameters = {
        a: 21.6,
        b: 19.8,
        c: 22.5,
        d: 18.9,
        e: 21.6,
        f: 23.4,
        g: 7,
        r: 10,
    };

    it('builds H prime, G prime and mirrored L from back-piece x and z', () => {
        const backPiece = buildBackPiece(parameters).geometry!;
        const result = buildFrontPiece(parameters, 'adult', backPiece.x, backPiece.z);
        const geometry = result.geometry;

        expect(result.errors).toEqual([]);
        expect(geometry).toBeDefined();
        expect(geometry?.points.N.y).toBe(parameters.g - 1);
        expect(geometry?.points.O.y).toBe(parameters.g - 1 + 5);
        expect(geometry?.points.K.x).toBeCloseTo(parameters.e / 2 - backPiece.x);
        expect(geometry!.points.HPrime.y).toBeLessThan(0);
        expect(geometry!.points.HPrime.x).toBeGreaterThan(0);
        expect(distance(geometry!.points.K, geometry!.points.HPrime)).toBeCloseTo(backPiece.x);
        expect(distance(geometry!.points.K, geometry!.points.H)).toBeCloseTo(backPiece.x);
        expect(distance(geometry!.points.C, geometry!.points.HPrime)).toBeCloseTo(backPiece.z);
        expect(distance(geometry!.points.K, geometry!.points.GPrime)).toBeCloseTo(geometry!.y);
        expect(geometry!.points.L.x).toBeCloseTo(-geometry!.points.GPrime.x);
        expect(geometry!.points.L.y).toBeCloseTo(geometry!.points.GPrime.y);
        expect(geometry?.checks.every((check) => check.pass)).toBe(true);
    });

    it("adds solid B-C and C-H' boundaries without duplicating the K-H' line", () => {
        const backPiece = buildBackPiece(parameters).geometry!;
        const geometry = buildFrontPiece(parameters, 'adult', backPiece.x, backPiece.z).geometry!;
        const frontBC = geometry.lines.find((draftLine) => draftLine.id === 'front-BC');
        const frontCHPrime = geometry.lines.find((draftLine) => draftLine.id === 'front-CHPrime');

        expect(frontBC).toMatchObject({
            start: geometry.points.B,
            end: geometry.points.C,
            dashed: false,
            kind: 'boundary',
        });
        expect(frontCHPrime).toMatchObject({
            start: geometry.points.C,
            end: geometry.points.HPrime,
            dashed: false,
            kind: 'boundary',
        });
        expect(
            geometry.lines.find((draftLine) => draftLine.id === 'front-KHPrime'),
        ).toBeUndefined();
    });

    it("keeps K, H' and G' collinear on the K-to-H' ray", () => {
        const backPiece = buildBackPiece(parameters).geometry!;
        const geometry = buildFrontPiece(parameters, 'adult', backPiece.x, backPiece.z).geometry!;
        const { K, HPrime, GPrime } = geometry.points;
        const crossProduct =
            (HPrime.x - K.x) * (GPrime.y - K.y) - (HPrime.y - K.y) * (GPrime.x - K.x);
        const directionDotProduct =
            (HPrime.x - K.x) * (GPrime.x - K.x) + (HPrime.y - K.y) * (GPrime.y - K.y);

        expect(crossProduct).toBeCloseTo(0);
        expect(directionDotProduct).toBeGreaterThanOrEqual(0);
    });

    it('applies child and baby age adjustments', () => {
        const backPiece = buildBackPiece(parameters).geometry!;
        const child = buildFrontPiece(parameters, 'child', backPiece.x, backPiece.z).geometry!;
        const baby = buildFrontPiece(parameters, 'baby', backPiece.x, backPiece.z).geometry!;

        expect(child.points.N.y).toBe(parameters.g - 0.5);
        expect(baby.points.N.y).toBe(parameters.g);
    });

    it('returns a geometry validation error when no valid circle intersection exists', () => {
        const result = buildFrontPiece(parameters, 'adult', 1, 1);

        expect(result.geometry).toBeUndefined();
        expect(result.derived?.y).toBeDefined();
        expect(result.errors[0].code).toBe('FRONT_H_PRIME_NOT_FOUND');
        expect(result.errors[0].message).toContain("Unable to construct H'");
    });
});
