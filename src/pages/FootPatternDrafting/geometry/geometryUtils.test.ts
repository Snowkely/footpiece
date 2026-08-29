import type { DraftPoint } from '../types';
import { circleIntersections, distance } from './geometryUtils';

describe('circleIntersections', () => {
    const center1: DraftPoint = { id: 'center-1', x: 0, y: 0 };

    it('returns both intersections for two crossing circles', () => {
        const center2: DraftPoint = { id: 'center-2', x: 8, y: 0 };
        const intersections = circleIntersections(center1, 5, center2, 5);

        expect(intersections).toHaveLength(2);
        expect(intersections[0].x).toBeCloseTo(4);
        expect(Math.abs(intersections[0].y)).toBeCloseTo(3);
        intersections.forEach((point) => {
            expect(distance(center1, point)).toBeCloseTo(5);
            expect(distance(center2, point)).toBeCloseTo(5);
        });
    });

    it('returns one point for tangent circles', () => {
        const center2: DraftPoint = { id: 'center-2', x: 10, y: 0 };

        expect(circleIntersections(center1, 5, center2, 5)).toEqual([
            { id: 'circle-intersection-1', x: 5, y: 0 },
        ]);
    });

    it('returns no points for separate or coincident circles', () => {
        expect(circleIntersections(center1, 2, { id: 'separate', x: 10, y: 0 }, 2)).toEqual([]);
        expect(circleIntersections(center1, 2, { ...center1 }, 2)).toEqual([]);
    });
});
