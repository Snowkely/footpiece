import type { DraftPoint } from '../types';
import { distance, GEOMETRY_EPSILON_CM, VALIDATION_TOLERANCE_CM } from './geometryUtils';

export type PointPolygonLocation = 'inside' | 'outside' | 'boundary';

export interface PolylineIntersection {
    firstSegmentIndex: number;
    secondSegmentIndex: number;
}

export function polylineLength(points: DraftPoint[]): number {
    let length = 0;

    for (let index = 1; index < points.length; index += 1) {
        length += distance(points[index - 1], points[index]);
    }

    return length;
}

function crossProduct(origin: DraftPoint, pointA: DraftPoint, pointB: DraftPoint): number {
    return (
        (pointA.x - origin.x) * (pointB.y - origin.y) -
        (pointA.y - origin.y) * (pointB.x - origin.x)
    );
}

export function pointToSegmentDistance(
    point: DraftPoint,
    segmentStart: DraftPoint,
    segmentEnd: DraftPoint,
): number {
    const segmentX = segmentEnd.x - segmentStart.x;
    const segmentY = segmentEnd.y - segmentStart.y;
    const segmentLengthSquared = segmentX ** 2 + segmentY ** 2;

    if (segmentLengthSquared <= GEOMETRY_EPSILON_CM ** 2) {
        return distance(point, segmentStart);
    }

    const projection =
        ((point.x - segmentStart.x) * segmentX + (point.y - segmentStart.y) * segmentY) /
        segmentLengthSquared;
    const clampedProjection = Math.max(0, Math.min(1, projection));
    const closestPoint: DraftPoint = {
        id: 'segment-projection',
        x: segmentStart.x + clampedProjection * segmentX,
        y: segmentStart.y + clampedProjection * segmentY,
    };

    return distance(point, closestPoint);
}

export function segmentsIntersect(
    firstStart: DraftPoint,
    firstEnd: DraftPoint,
    secondStart: DraftPoint,
    secondEnd: DraftPoint,
    toleranceCm = VALIDATION_TOLERANCE_CM,
): boolean {
    const orientation1 = crossProduct(firstStart, firstEnd, secondStart);
    const orientation2 = crossProduct(firstStart, firstEnd, secondEnd);
    const orientation3 = crossProduct(secondStart, secondEnd, firstStart);
    const orientation4 = crossProduct(secondStart, secondEnd, firstEnd);

    if (
        ((orientation1 > 0 && orientation2 < 0) || (orientation1 < 0 && orientation2 > 0)) &&
        ((orientation3 > 0 && orientation4 < 0) || (orientation3 < 0 && orientation4 > 0))
    ) {
        return true;
    }

    // Treat touching and tolerance-close endpoints as intersections. This makes the
    // outside constraint fail closed instead of visually accepting near-contact.
    return (
        pointToSegmentDistance(firstStart, secondStart, secondEnd) <= toleranceCm ||
        pointToSegmentDistance(firstEnd, secondStart, secondEnd) <= toleranceCm ||
        pointToSegmentDistance(secondStart, firstStart, firstEnd) <= toleranceCm ||
        pointToSegmentDistance(secondEnd, firstStart, firstEnd) <= toleranceCm
    );
}

export function polylineIntersections(
    firstPolyline: DraftPoint[],
    secondPolyline: DraftPoint[],
    toleranceCm = VALIDATION_TOLERANCE_CM,
): PolylineIntersection[] {
    const intersections: PolylineIntersection[] = [];

    for (let firstIndex = 0; firstIndex < firstPolyline.length - 1; firstIndex += 1) {
        for (let secondIndex = 0; secondIndex < secondPolyline.length - 1; secondIndex += 1) {
            if (
                segmentsIntersect(
                    firstPolyline[firstIndex],
                    firstPolyline[firstIndex + 1],
                    secondPolyline[secondIndex],
                    secondPolyline[secondIndex + 1],
                    toleranceCm,
                )
            ) {
                intersections.push({
                    firstSegmentIndex: firstIndex,
                    secondSegmentIndex: secondIndex,
                });
            }
        }
    }

    return intersections;
}

export function pointInPolygon(
    point: DraftPoint,
    polygon: DraftPoint[],
    boundaryToleranceCm = VALIDATION_TOLERANCE_CM,
): PointPolygonLocation {
    if (polygon.length < 3) {
        return 'outside';
    }

    for (let index = 0; index < polygon.length; index += 1) {
        const nextIndex = (index + 1) % polygon.length;
        if (
            pointToSegmentDistance(point, polygon[index], polygon[nextIndex]) <= boundaryToleranceCm
        ) {
            return 'boundary';
        }
    }

    let inside = false;
    for (
        let index = 0, previousIndex = polygon.length - 1;
        index < polygon.length;
        previousIndex = index, index += 1
    ) {
        const current = polygon[index];
        const previous = polygon[previousIndex];
        const crossesHorizontalRay =
            current.y > point.y !== previous.y > point.y &&
            point.x <
                ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y) +
                    current.x;

        if (crossesHorizontalRay) {
            inside = !inside;
        }
    }

    return inside ? 'inside' : 'outside';
}
