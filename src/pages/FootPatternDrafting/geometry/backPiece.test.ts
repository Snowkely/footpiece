import type { DraftingParameters } from '../types';
import { buildBackPiece, CALF_LEVEL_OFFSET_CM, completeBackPieceWithFrontY } from './backPiece';
import { distance } from './geometryUtils';

describe('buildBackPiece', () => {
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

    it('builds the specified local-coordinate construction and derives x and z', () => {
        const result = buildBackPiece(parameters);
        const geometry = result.geometry;

        expect(result.errors).toEqual([]);
        expect(geometry).toBeDefined();
        expect(geometry?.points.M).toEqual({ id: 'M', x: 0, y: 0 });
        expect(geometry?.points.N.y).toBe(parameters.g);
        expect(geometry?.points.O.y).toBe(parameters.g + CALF_LEVEL_OFFSET_CM);
        expect(geometry?.points.B.x).toBe(parameters.c / 4);
        expect(geometry?.points.C.x).toBe(parameters.d / 4);
        expect(geometry?.points.D.x).toBe(parameters.f / 2);
        expect(geometry?.points.E.x).toBe((parameters.r as number) / 2);
        expect(geometry?.x).toBeCloseTo(distance(geometry!.points.D, geometry!.points.E));
        expect(geometry?.z).toBeCloseTo(distance(geometry!.points.C, geometry!.points.D));
        expect(geometry?.checks.every((check) => check.pass)).toBe(true);
    });

    it('adds solid B-C and C-D boundaries and a distinct solid D-E segment', () => {
        const geometry = buildBackPiece(parameters).geometry!;
        const backBC = geometry.lines.find((draftLine) => draftLine.id === 'back-BC');
        const backCD = geometry.lines.find((draftLine) => draftLine.id === 'back-CD');
        const backDE = geometry.lines.find((draftLine) => draftLine.id === 'back-DE');

        expect(backBC).toMatchObject({
            start: geometry.points.B,
            end: geometry.points.C,
            dashed: false,
            kind: 'boundary',
        });
        expect(backCD).toMatchObject({
            start: geometry.points.C,
            end: geometry.points.D,
            dashed: false,
            kind: 'boundary',
        });
        expect(backDE).toMatchObject({
            start: geometry.points.D,
            end: geometry.points.E,
            dashed: false,
            kind: 'boundary',
        });
        expect(geometry.lines.find((draftLine) => draftLine.id === 'back-ME')).toBeUndefined();
    });

    it('completes A/F from front y without changing the base drafting coordinates', () => {
        const backPiece = buildBackPiece(parameters).geometry!;
        const originalPoints = { ...backPiece.points };
        const frontY = 5.8;
        const completed = completeBackPieceWithFrontY(backPiece, frontY).geometry!;

        expect(backPiece.points).toEqual(originalPoints);
        expect(completed.points.F).toEqual({ id: 'F', x: backPiece.points.E.x, y: -frontY });
        expect(completed.points.A).toEqual({ id: 'A', x: 0, y: -frontY });
        expect(distance(completed.points.E, completed.points.F!)).toBeCloseTo(frontY);
        expect(distance(completed.points.A!, completed.points.F!)).toBeCloseTo(
            distance(completed.points.M, completed.points.E),
        );
        expect(completed.lines.find((draftLine) => draftLine.id === 'back-EF')).toMatchObject({
            start: completed.points.E,
            end: completed.points.F,
            dashed: false,
            kind: 'boundary',
        });
        expect(completed.lines.find((draftLine) => draftLine.id === 'back-FA')).toMatchObject({
            start: completed.points.F,
            end: completed.points.A,
            dashed: false,
            kind: 'boundary',
        });
        expect(completed.lines.find((draftLine) => draftLine.id === 'back-MA')).toMatchObject({
            dashed: true,
            kind: 'centerline',
        });
        expect(completed.checks.find((check) => check.id === 'back-EF')?.pass).toBe(true);
        expect(completed.checks.find((check) => check.id === 'back-AF')?.pass).toBe(true);
    });

    it('reports a validation error when temporary r is missing', () => {
        const result = buildBackPiece({ ...parameters, r: undefined });

        expect(result.geometry).toBeUndefined();
        expect(result.errors[0].code).toBe('BACK_R_REQUIRED');
    });
});
