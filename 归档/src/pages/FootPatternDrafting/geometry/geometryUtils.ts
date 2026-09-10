import type { DraftPoint, GeometryCheck } from '../types';

export const GEOMETRY_EPSILON_CM = 1e-9;
export const VALIDATION_TOLERANCE_CM = 0.01;

export function distance(pointA: DraftPoint, pointB: DraftPoint): number {
    return Math.hypot(pointB.x - pointA.x, pointB.y - pointA.y);
}

export function circleIntersections(
    center1: DraftPoint,
    radius1: number,
    center2: DraftPoint,
    radius2: number,
): DraftPoint[] {
    if (
        !Number.isFinite(center1.x) ||
        !Number.isFinite(center1.y) ||
        !Number.isFinite(center2.x) ||
        !Number.isFinite(center2.y) ||
        !Number.isFinite(radius1) ||
        !Number.isFinite(radius2) ||
        radius1 < 0 ||
        radius2 < 0
    ) {
        return [];
    }

    const centerDistance = distance(center1, center2);

    // Coincident circles have infinitely many intersections, so there is no unique point to return.
    if (centerDistance <= GEOMETRY_EPSILON_CM) {
        return [];
    }

    if (
        centerDistance > radius1 + radius2 + GEOMETRY_EPSILON_CM ||
        centerDistance < Math.abs(radius1 - radius2) - GEOMETRY_EPSILON_CM
    ) {
        return [];
    }

    const distanceAlongCenters =
        (radius1 ** 2 - radius2 ** 2 + centerDistance ** 2) / (2 * centerDistance);
    const perpendicularSquared = Math.max(0, radius1 ** 2 - distanceAlongCenters ** 2);
    const perpendicularDistance = Math.sqrt(perpendicularSquared);
    const unitX = (center2.x - center1.x) / centerDistance;
    const unitY = (center2.y - center1.y) / centerDistance;
    const baseX = center1.x + distanceAlongCenters * unitX;
    const baseY = center1.y + distanceAlongCenters * unitY;

    if (perpendicularDistance <= GEOMETRY_EPSILON_CM) {
        return [{ id: 'circle-intersection-1', x: baseX, y: baseY }];
    }

    const perpendicularX = -unitY * perpendicularDistance;
    const perpendicularY = unitX * perpendicularDistance;

    return [
        {
            id: 'circle-intersection-1',
            x: baseX + perpendicularX,
            y: baseY + perpendicularY,
        },
        {
            id: 'circle-intersection-2',
            x: baseX - perpendicularX,
            y: baseY - perpendicularY,
        },
    ];
}

export function selectFrontPatternHPrime(
    intersections: DraftPoint[],
    centerLineX = 0,
    baselineY = 0,
): DraftPoint | undefined {
    const candidates = intersections.filter(
        (point) =>
            point.y < baselineY - GEOMETRY_EPSILON_CM &&
            point.x > centerLineX + GEOMETRY_EPSILON_CM,
    );

    // A deterministic tie-breaker keeps the selection stable if a future construction
    // happens to produce more than one point in the intended quadrant.
    return candidates.sort((pointA, pointB) => pointB.x - pointA.x || pointA.y - pointB.y)[0];
}

export function pointAlongRay(
    origin: DraftPoint,
    directionPoint: DraftPoint,
    rayDistance: number,
    id: string,
): DraftPoint | undefined {
    const directionLength = distance(origin, directionPoint);

    if (directionLength <= GEOMETRY_EPSILON_CM || rayDistance < 0) {
        return undefined;
    }

    return {
        id,
        x: origin.x + ((directionPoint.x - origin.x) / directionLength) * rayDistance,
        y: origin.y + ((directionPoint.y - origin.y) / directionLength) * rayDistance,
    };
}

export function mirrorPointAcrossVerticalAxis(
    point: DraftPoint,
    axisX: number,
    id = point.id,
): DraftPoint {
    return {
        id,
        x: axisX * 2 - point.x,
        y: point.y,
    };
}

export function mirrorAcrossCenterLine(point: DraftPoint, id: string, centerLineX = 0): DraftPoint {
    return mirrorPointAcrossVerticalAxis(point, centerLineX, id);
}

export function createDistanceCheck(
    id: string,
    label: string,
    start: DraftPoint,
    end: DraftPoint,
    expected: number,
): GeometryCheck {
    const actual = distance(start, end);

    return {
        id,
        label,
        actual,
        expected,
        tolerance: VALIDATION_TOLERANCE_CM,
        pass: Math.abs(actual - expected) <= VALIDATION_TOLERANCE_CM,
    };
}
