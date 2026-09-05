import type {
    DraftPoint,
    DraftVector2,
    GeometryBuildResult,
    TargetReferenceArcGeometry,
    ToeRadialRayMultiplier,
    ToeRadialReferenceGeometry,
    ToeRadialReferenceLandmarkId,
    ToeRadialReferencePoint,
} from '../types';
import { normalizeVector, pointAtPolylineIdentity, raySegmentIntersection } from './footAxis';
import { distance, GEOMETRY_EPSILON_CM, VALIDATION_TOLERANCE_CM } from './geometryUtils';

export const DEFAULT_TOE_RADIAL_ANGLE_DEG = 10;
export const TOE_RADIAL_ANGLE_MIN_DEG = 2;
export const TOE_RADIAL_ANGLE_MAX_DEG = 30;
export const TOE_RADIAL_ANGLE_STEP_DEG = 0.5;
export const TOE_RADIAL_ANGLE_TOLERANCE_RAD = 1e-7;

const RAY_INTERSECTION_DEDUPLICATION_TOLERANCE_CM = 1e-7;
const TOE_ARC_ORDER_TOLERANCE = 1e-8;

export interface TargetToeReferenceArc {
    points: DraftPoint[];
    qIndex: number;
    wIndex: number;
    pIndex: number;
}

export interface OpenPolylineRayIntersection {
    point: DraftPoint;
    rayT: number;
    segmentIndex: number;
    segmentT: number;
}

interface ToeRadialReferenceInput {
    Ms: DraftPoint;
    W: DraftPoint;
    targetReferenceArc: TargetReferenceArcGeometry;
    thetaDeg: number;
}

function vectorBetween(start: DraftPoint, end: DraftPoint): DraftVector2 {
    return { x: end.x - start.x, y: end.y - start.y };
}

function cross(first: DraftVector2, second: DraftVector2): number {
    return first.x * second.y - first.y * second.x;
}

function dot(first: DraftVector2, second: DraftVector2): number {
    return first.x * second.x + first.y * second.y;
}

function isFinitePoint(point: DraftPoint): boolean {
    return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function rotateVector(vector: DraftVector2, radians: number): DraftVector2 {
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    return {
        x: vector.x * cosine - vector.y * sine,
        y: vector.x * sine + vector.y * cosine,
    };
}

function angleBetween(first: DraftVector2, second: DraftVector2): number {
    const firstDirection = normalizeVector(first);
    const secondDirection = normalizeVector(second);
    if (!firstDirection || !secondDirection) {
        return Number.NaN;
    }
    return Math.acos(Math.max(-1, Math.min(1, dot(firstDirection, secondDirection))));
}

function toeArcInvalid(message: string): GeometryBuildResult<TargetToeReferenceArc> {
    return { errors: [{ code: 'TOE_RADIAL_TOE_ARC_INVALID', message }] };
}

export function extractTargetToeReferenceArc(
    targetReferenceArc: TargetReferenceArcGeometry,
): GeometryBuildResult<TargetToeReferenceArc> {
    const source = targetReferenceArc.targetReferenceArc;
    const qIndex = targetReferenceArc.qIndexOnArc;
    const wIndex = targetReferenceArc.wIndexOnArc;
    const pIndex = targetReferenceArc.pIndexOnArc;
    if (
        source.length < 3 ||
        !Number.isInteger(qIndex) ||
        !Number.isInteger(wIndex) ||
        !Number.isInteger(pIndex) ||
        qIndex < 0 ||
        !(qIndex < wIndex && wIndex < pIndex) ||
        pIndex >= source.length ||
        source[qIndex]?.id !== 'Q' ||
        source[wIndex]?.id !== 'W' ||
        source[pIndex]?.id !== 'P'
    ) {
        return toeArcInvalid('Target reference geometry must preserve strict Q-W-P identities.');
    }

    const points = source.slice(qIndex, pIndex + 1).map((point) => ({ ...point }));
    if (points.length < 3 || points.some((point) => !isFinitePoint(point))) {
        return toeArcInvalid(
            'The extracted target Q-to-W-to-P toe section is not a valid polyline.',
        );
    }

    return {
        geometry: {
            points,
            qIndex: 0,
            wIndex: wIndex - qIndex,
            pIndex: pIndex - qIndex,
        },
        errors: [],
    };
}

export function intersectRayWithOpenPolyline(
    origin: DraftPoint,
    direction: DraftVector2,
    polyline: DraftPoint[],
): OpenPolylineRayIntersection[] {
    const normalizedDirection = normalizeVector(direction);
    if (!isFinitePoint(origin) || !normalizedDirection || polyline.length < 2) {
        return [];
    }

    const intersections = polyline
        .slice(0, -1)
        .map((segmentStart, segmentIndex) => {
            const intersection = raySegmentIntersection(
                origin,
                normalizedDirection,
                segmentStart,
                polyline[segmentIndex + 1],
            );
            return intersection
                ? {
                      point: { ...intersection.point },
                      rayT: intersection.rayT,
                      segmentIndex,
                      segmentT: intersection.segmentT,
                  }
                : undefined;
        })
        .filter((intersection): intersection is OpenPolylineRayIntersection =>
            Boolean(intersection),
        )
        .sort(
            (first, second) => first.rayT - second.rayT || first.segmentIndex - second.segmentIndex,
        );

    return intersections.filter(
        (intersection, index) =>
            index === 0 ||
            Math.abs(intersection.rayT - intersections[index - 1].rayT) >
                RAY_INTERSECTION_DEDUPLICATION_TOLERANCE_CM,
    );
}

function buildReferencePoint(
    id: ToeRadialReferenceLandmarkId,
    multiplier: ToeRadialRayMultiplier,
    thetaRad: number,
    angularOrientationSign: -1 | 1,
    centerDirection: DraftVector2,
    origin: DraftPoint,
    toeArcPoints: DraftPoint[],
): GeometryBuildResult<ToeRadialReferencePoint> {
    const angleRad = multiplier * thetaRad;
    const direction = rotateVector(centerDirection, angleRad * angularOrientationSign);
    const intersection = intersectRayWithOpenPolyline(origin, direction, toeArcPoints)[0];
    if (!intersection) {
        return {
            errors: [
                {
                    code: `TOE_RADIAL_${id.toUpperCase()}_INTERSECTION_NOT_FOUND`,
                    message: `The forward ${id} ray does not intersect the target Q-W-P toe section.`,
                },
            ],
        };
    }

    return {
        geometry: {
            point: { ...intersection.point, id },
            direction,
            rayMultiplier: multiplier,
            angleRad,
            toeArcSegmentIndex: intersection.segmentIndex,
            toeArcSegmentT: intersection.segmentT,
            distanceFromMs: intersection.rayT,
        },
        errors: [],
    };
}

function identityPosition(reference: ToeRadialReferencePoint): number {
    return reference.toeArcSegmentIndex + reference.toeArcSegmentT;
}

export function validateToeRadialReferenceOrder(
    qPosition: number,
    W1Position: number,
    W2Position: number,
    wPosition: number,
    W3Position: number,
    W4Position: number,
    pPosition: number,
): boolean {
    const positions = [
        qPosition,
        W1Position,
        W2Position,
        wPosition,
        W3Position,
        W4Position,
        pPosition,
    ];
    return positions.every(
        (position, index) =>
            Number.isFinite(position) &&
            (index === 0 || position > positions[index - 1] + TOE_ARC_ORDER_TOLERANCE),
    );
}

export function deriveToeRadialReferences({
    Ms,
    W,
    targetReferenceArc,
    thetaDeg,
}: ToeRadialReferenceInput): GeometryBuildResult<ToeRadialReferenceGeometry> {
    if (!Number.isFinite(thetaDeg) || thetaDeg <= 0) {
        return {
            errors: [
                {
                    code: 'TOE_RADIAL_ANGLE_INVALID',
                    message: 'Toe radial angle θ must be finite and greater than zero degrees.',
                },
            ],
        };
    }
    if (!isFinitePoint(Ms) || !isFinitePoint(W)) {
        return {
            errors: [
                {
                    code: 'TOE_RADIAL_CENTER_DIRECTION_INVALID',
                    message: 'Aligned source Ms and W must both have finite coordinates.',
                },
            ],
        };
    }

    const centerDirection = normalizeVector(vectorBetween(Ms, W));
    if (!centerDirection || distance(Ms, W) <= GEOMETRY_EPSILON_CM) {
        return {
            errors: [
                {
                    code: 'TOE_RADIAL_CENTER_DIRECTION_INVALID',
                    message: 'Aligned source Ms and W must define a finite non-zero radial axis.',
                },
            ],
        };
    }

    const toeArcResult = extractTargetToeReferenceArc(targetReferenceArc);
    if (!toeArcResult.geometry) {
        return { errors: toeArcResult.errors };
    }
    const toeArc = toeArcResult.geometry;
    const toeArcW = toeArc.points[toeArc.wIndex];
    if (distance(W, toeArcW) > VALIDATION_TOLERANCE_CM) {
        return toeArcInvalid('The supplied W does not match the W identity on target Q-W-P.');
    }

    const qDirection = normalizeVector(vectorBetween(Ms, toeArc.points[toeArc.qIndex]));
    const pDirection = normalizeVector(vectorBetween(Ms, toeArc.points[toeArc.pIndex]));
    if (!qDirection || !pDirection) {
        return toeArcInvalid('Q and P must each define a finite radial direction from Ms.');
    }
    const qSide = cross(centerDirection, qDirection);
    const pSide = cross(centerDirection, pDirection);
    if (
        Math.abs(qSide) <= TOE_RADIAL_ANGLE_TOLERANCE_RAD ||
        Math.abs(pSide) <= TOE_RADIAL_ANGLE_TOLERANCE_RAD ||
        qSide * pSide >= 0
    ) {
        return toeArcInvalid('Q and P must lie on opposite angular sides of the Ms-W axis.');
    }

    // Signed radial angles use an intrinsic toe frame: negative angles face Q and positive
    // angles face P. The cross product maps that semantic sign to the current coordinates,
    // keeping the construction invariant under rotation and mirrored screen presentation.
    const angularOrientationSign: -1 | 1 = qSide < 0 ? 1 : -1;
    const thetaRad = (thetaDeg * Math.PI) / 180;
    const specifications: Array<{
        id: ToeRadialReferenceLandmarkId;
        multiplier: ToeRadialRayMultiplier;
    }> = [
        { id: 'W1', multiplier: -2 },
        { id: 'W2', multiplier: -1 },
        { id: 'W3', multiplier: 1 },
        { id: 'W4', multiplier: 2 },
    ];
    const results = specifications.map(({ id, multiplier }) =>
        buildReferencePoint(
            id,
            multiplier,
            thetaRad,
            angularOrientationSign,
            centerDirection,
            Ms,
            toeArc.points,
        ),
    );
    const errors = results.flatMap((result) => result.errors);
    if (errors.length || results.some((result) => !result.geometry)) {
        return { errors };
    }
    const [W1, W2, W3, W4] = results.map((result) => result.geometry!);

    const positions: [number, number, number, number, number, number, number] = [
        toeArc.qIndex,
        identityPosition(W1),
        identityPosition(W2),
        toeArc.wIndex,
        identityPosition(W3),
        identityPosition(W4),
        toeArc.pIndex,
    ];
    const orderValid = validateToeRadialReferenceOrder(...positions);
    if (!orderValid) {
        return {
            errors: [
                {
                    code: 'TOE_RADIAL_REFERENCE_ORDER_INVALID',
                    message: 'Toe radial identities must follow strict Q-W1-W2-W-W3-W4-P order.',
                },
            ],
        };
    }

    const references = [W1, W2, W3, W4];
    const onArcErrors = references.map((reference) => {
        const reconstructed = pointAtPolylineIdentity(
            toeArc.points,
            {
                segmentIndex: reference.toeArcSegmentIndex,
                segmentT: reference.toeArcSegmentT,
            },
            `${reference.point.id}-reconstructed`,
        );
        return reconstructed ? distance(reference.point, reconstructed) : Number.POSITIVE_INFINITY;
    });
    const maximumDistanceErrorCm = Math.max(...onArcErrors);
    const allOnToeArc = maximumDistanceErrorCm <= VALIDATION_TOLERANCE_CM;
    if (!allOnToeArc) {
        return {
            errors: [
                {
                    code: 'TOE_RADIAL_TOE_ARC_INVALID',
                    message:
                        'A toe radial point could not be reconstructed from its Q-W-P identity.',
                },
            ],
        };
    }

    const radialDirections = [
        vectorBetween(Ms, W1.point),
        vectorBetween(Ms, W2.point),
        vectorBetween(Ms, W),
        vectorBetween(Ms, W3.point),
        vectorBetween(Ms, W4.point),
    ];
    const actualAngles = radialDirections
        .slice(0, -1)
        .map((direction, index) => angleBetween(direction, radialDirections[index + 1])) as [
        number,
        number,
        number,
        number,
    ];
    const maximumAngleErrorRad = Math.max(
        ...actualAngles.map((angle) => Math.abs(angle - thetaRad)),
    );
    const equalAngles =
        actualAngles.every(Number.isFinite) &&
        maximumAngleErrorRad <= TOE_RADIAL_ANGLE_TOLERANCE_RAD;
    if (!equalAngles) {
        return {
            errors: [
                {
                    code: 'TOE_RADIAL_EQUAL_ANGLE_VALIDATION_FAILED',
                    message: 'Actual adjacent radial angles do not match θ within tolerance.',
                },
            ],
        };
    }

    return {
        geometry: {
            thetaDeg,
            thetaRad,
            origin: { ...Ms },
            W: { ...W },
            centerDirection,
            angularOrientationSign,
            W1,
            W2,
            W3,
            W4,
            toeArcPoints: toeArc.points.map((point) => ({ ...point })),
            qIndexOnToeArc: toeArc.qIndex,
            wIndexOnToeArc: toeArc.wIndex,
            pIndexOnToeArc: toeArc.pIndex,
            order: ['Q', 'W1', 'W2', 'W', 'W3', 'W4', 'P'],
            checks: {
                equalAngles: {
                    expectedRad: thetaRad,
                    actualRad: actualAngles,
                    maximumErrorRad: maximumAngleErrorRad,
                    toleranceRad: TOE_RADIAL_ANGLE_TOLERANCE_RAD,
                    pass: true,
                },
                orderValid: { positions, pass: true },
                allOnToeArc: {
                    maximumDistanceErrorCm,
                    toleranceCm: VALIDATION_TOLERANCE_CM,
                    pass: true,
                },
            },
        },
        errors: [],
    };
}
