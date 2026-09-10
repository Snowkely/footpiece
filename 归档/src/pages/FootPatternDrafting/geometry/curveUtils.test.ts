import type { DraftPoint } from '../types';
import {
    pointInPolygon,
    polylineIntersections,
    polylineLength,
    segmentsIntersect,
} from './curveUtils';

function point(id: string, x: number, y: number): DraftPoint {
    return { id, x, y };
}

describe('curveUtils', () => {
    it('calculates polyline length from consecutive segments', () => {
        expect(polylineLength([point('A', 0, 0), point('B', 3, 0), point('C', 3, 4)])).toBe(7);
    });

    it('classifies known inside, outside, and boundary points', () => {
        const square = [point('A', 0, 0), point('B', 4, 0), point('C', 4, 4), point('D', 0, 4)];

        expect(pointInPolygon(point('inside', 2, 2), square)).toBe('inside');
        expect(pointInPolygon(point('outside', 5, 2), square)).toBe('outside');
        expect(pointInPolygon(point('boundary', 4, 2), square)).toBe('boundary');
    });

    it('detects crossing and touching segments and reports polyline segment pairs', () => {
        const horizontal = [point('H1', 0, 0), point('H2', 4, 0)];
        const crossing = [point('V1', 2, -2), point('V2', 2, 2)];
        const separate = [point('S1', 0, 2), point('S2', 4, 2)];

        expect(segmentsIntersect(horizontal[0], horizontal[1], crossing[0], crossing[1])).toBe(
            true,
        );
        expect(segmentsIntersect(horizontal[0], horizontal[1], separate[0], separate[1])).toBe(
            false,
        );
        expect(polylineIntersections(horizontal, crossing)).toEqual([
            { firstSegmentIndex: 0, secondSegmentIndex: 0 },
        ]);
    });
});
