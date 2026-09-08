import type { DraftPoint } from '../types';
import { derivePolylineTurningDiagnostics } from './toeTurningDiagnostics';

function point(id: string, x: number, y: number): DraftPoint {
    return { id, x, y };
}

function transform(value: DraftPoint, radians: number, x: number, y: number): DraftPoint {
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    return {
        ...value,
        x: value.x * cosine - value.y * sine + x,
        y: value.x * sine + value.y * cosine + y,
    };
}

describe('toe turning diagnostics', () => {
    const uniformArc = Array.from({ length: 9 }, (_, index) => {
        const angle = (index * Math.PI) / 8;
        return point(`arc-${index}`, Math.cos(angle), Math.sin(angle));
    });

    it('reports approximately zero variation for uniformly sampled constant turning', () => {
        const diagnostics = derivePolylineTurningDiagnostics(uniformArc)!;

        expect(diagnostics.turningAnglesDeg).toHaveLength(7);
        expect(diagnostics.turningVariationDeg).toBeLessThan(1e-10);
        expect(diagnostics.maxTurningDeg).toBeCloseTo(diagnostics.meanTurningDeg, 10);
    });

    it('reports larger variation when one region turns sharply', () => {
        const mostlyStraight = [
            point('a', 0, 0),
            point('b', 1, 0),
            point('c', 2, 0),
            point('d', 2, 1),
            point('e', 2, 2),
            point('f', 2, 3),
        ];
        const uniform = derivePolylineTurningDiagnostics(uniformArc)!;
        const sharp = derivePolylineTurningDiagnostics(mostlyStraight)!;

        expect(sharp.turningVariationDeg).toBeGreaterThan(uniform.turningVariationDeg);
        expect(sharp.maxTurningDeg).toBeCloseTo(90, 10);
    });

    it('is deterministic, rotation invariant, and translation invariant', () => {
        const first = derivePolylineTurningDiagnostics(uniformArc)!;
        const second = derivePolylineTurningDiagnostics(
            uniformArc.map((value) => transform(value, 1.13, 8.5, -4.2)),
        )!;

        expect(derivePolylineTurningDiagnostics(uniformArc)).toEqual(first);
        expect(second.meanTurningDeg).toBeCloseTo(first.meanTurningDeg, 10);
        expect(second.maxTurningDeg).toBeCloseTo(first.maxTurningDeg, 10);
        expect(second.turningVariationDeg).toBeCloseTo(first.turningVariationDeg, 10);
    });
});
