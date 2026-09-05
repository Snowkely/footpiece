import type {
    DraftPoint,
    DraftVector2,
    FootPieceLandmarks,
    GeometryBuildResult,
    MidHeelCandidateDiagnostic,
    MidHeelDetection,
    PolylineSourceIdentity,
    SecondToeDetection,
    SourceFootAxisGeometry,
} from '../types';
import { distance } from './geometryUtils';

const VECTOR_EPSILON = 1e-9;
const RAY_PARAMETER_TOLERANCE = 1e-8;
const LINE_PARALLEL_TOLERANCE = 1e-7;
const MID_HEEL_SCORE_PROJECTION_WEIGHT = 0.8;
const MID_HEEL_SCORE_TANGENT_WEIGHT = 0.2;
const MID_HEEL_AMBIGUITY_SCORE_TOLERANCE = 0.005;
const MID_HEEL_AMBIGUITY_INDEX_SEPARATION = 2;

export const MID_HEEL_SEARCH_RADIUS_POINTS = 5;
export const MID_HEEL_TANGENT_RADIUS_POINTS = 5;
export const MID_HEEL_TANGENT_DOT_TOLERANCE = 0.12;

export interface QPToeArcExtraction {
    points: DraftPoint[];
    rqpsStartIndex: number;
    rqpsEndIndex: number;
}

export interface RaySegmentIntersection {
    point: DraftPoint;
    rayT: number;
    segmentT: number;
}

function clonePoints(points: DraftPoint[]): DraftPoint[] {
    return points.map((point) => ({ ...point }));
}

function dot(first: DraftVector2, second: DraftVector2): number {
    return first.x * second.x + first.y * second.y;
}

function cross(first: DraftVector2, second: DraftVector2): number {
    return first.x * second.y - first.y * second.x;
}

function vectorBetween(start: DraftPoint, end: DraftPoint): DraftVector2 {
    return { x: end.x - start.x, y: end.y - start.y };
}

export function normalizeVector(vector: DraftVector2): DraftVector2 | undefined {
    const magnitude = Math.hypot(vector.x, vector.y);
    if (!Number.isFinite(magnitude) || magnitude <= VECTOR_EPSILON) {
        return undefined;
    }

    return { x: vector.x / magnitude, y: vector.y / magnitude };
}

function midpoint(first: DraftPoint, second: DraftPoint, id: string): DraftPoint {
    return {
        id,
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2,
    };
}

export function pointAtPolylineIdentity(
    points: DraftPoint[],
    identity: PolylineSourceIdentity,
    id: string,
): DraftPoint | undefined {
    if (
        !Number.isInteger(identity.segmentIndex) ||
        identity.segmentIndex < 0 ||
        identity.segmentIndex >= points.length - 1 ||
        !Number.isFinite(identity.segmentT) ||
        identity.segmentT < 0 ||
        identity.segmentT > 1
    ) {
        return undefined;
    }

    const start = points[identity.segmentIndex];
    const end = points[identity.segmentIndex + 1];
    return {
        id,
        x: start.x + (end.x - start.x) * identity.segmentT,
        y: start.y + (end.y - start.y) * identity.segmentT,
    };
}

function pointAtContinuousPolylineIndex(points: DraftPoint[], index: number): DraftPoint {
    const clampedIndex = Math.max(0, Math.min(points.length - 1, index));
    const segmentIndex = Math.min(Math.floor(clampedIndex), points.length - 2);
    const segmentT = clampedIndex - segmentIndex;
    return pointAtPolylineIdentity(points, { segmentIndex, segmentT }, 'local-sample')!;
}

export function estimatePolylineTangentAtPoint(
    points: DraftPoint[],
    identity: PolylineSourceIdentity,
    radiusPoints = MID_HEEL_TANGENT_RADIUS_POINTS,
): DraftVector2 | undefined {
    if (points.length < 3 || radiusPoints < 1) {
        return undefined;
    }

    const continuousIndex = identity.segmentIndex + identity.segmentT;
    const pointBefore = pointAtContinuousPolylineIndex(points, continuousIndex - radiusPoints);
    const pointAfter = pointAtContinuousPolylineIndex(points, continuousIndex + radiusPoints);
    return normalizeVector(vectorBetween(pointBefore, pointAfter));
}

function quadraticExtremumIdentity(
    projections: number[],
    sampledIndex: number,
): PolylineSourceIdentity {
    if (sampledIndex <= 0 || sampledIndex >= projections.length - 1) {
        return {
            segmentIndex: Math.min(sampledIndex, projections.length - 2),
            segmentT: sampledIndex >= projections.length - 1 ? 1 : 0,
        };
    }

    const previous = projections[sampledIndex - 1];
    const current = projections[sampledIndex];
    const next = projections[sampledIndex + 1];
    const denominator = previous - 2 * current + next;
    if (!Number.isFinite(denominator) || Math.abs(denominator) <= VECTOR_EPSILON) {
        return { segmentIndex: sampledIndex, segmentT: 0 };
    }

    const offset = Math.max(-0.5, Math.min(0.5, (0.5 * (previous - next)) / denominator));
    return offset >= 0
        ? { segmentIndex: sampledIndex, segmentT: offset }
        : { segmentIndex: sampledIndex - 1, segmentT: 1 + offset };
}

export function findAutomaticMidHeel(
    heelArc: DraftPoint[],
    P: DraftPoint,
    Q: DraftPoint,
    R: DraftPoint,
    S: DraftPoint,
): GeometryBuildResult<MidHeelDetection> {
    if (heelArc.length < MID_HEEL_TANGENT_RADIUS_POINTS * 2 + 3) {
        return {
            errors: [
                {
                    code: 'FOOT_MID_HEEL_DETECTION_AMBIGUOUS',
                    message: 'The R-to-S heel arc has too few samples for a stable local tangent.',
                },
            ],
        };
    }

    const ankleCenter = midpoint(R, S, 'source-ankle-center');
    const forefootCenter = midpoint(P, Q, 'source-forefoot-center');
    const footDirection = normalizeVector(vectorBetween(ankleCenter, forefootCenter));
    if (!footDirection) {
        return {
            errors: [
                {
                    code: 'FOOT_LONGITUDINAL_DIRECTION_INVALID',
                    message:
                        'The ankle and forefoot centres must define a finite non-zero direction.',
                },
            ],
        };
    }

    const projections = heelArc.map((point) =>
        dot(vectorBetween(ankleCenter, point), footDirection),
    );
    if (projections.some((projection) => !Number.isFinite(projection))) {
        return {
            errors: [
                {
                    code: 'FOOT_LONGITUDINAL_DIRECTION_INVALID',
                    message: 'Heel-arc longitudinal projections must all be finite.',
                },
            ],
        };
    }

    const extremumProjection = Math.min(...projections);
    const coarseSampledIndex = projections.indexOf(extremumProjection);
    const searchStart = Math.max(1, coarseSampledIndex - MID_HEEL_SEARCH_RADIUS_POINTS);
    const searchEnd = Math.min(
        heelArc.length - 2,
        coarseSampledIndex + MID_HEEL_SEARCH_RADIUS_POINTS,
    );
    const localProjections = projections.slice(searchStart, searchEnd + 1);
    const projectionSpan = Math.max(...localProjections) - extremumProjection;
    const projectionScale = Math.max(projectionSpan, VECTOR_EPSILON);
    const candidates: MidHeelCandidateDiagnostic[] = [];

    for (let sampledIndex = searchStart; sampledIndex <= searchEnd; sampledIndex += 1) {
        const tangent = estimatePolylineTangentAtPoint(heelArc, {
            segmentIndex: sampledIndex,
            segmentT: 0,
        });
        if (!tangent) {
            continue;
        }

        const projectionDelta = projections[sampledIndex] - extremumProjection;
        const tangentOrthogonalityError = Math.abs(dot(tangent, footDirection));
        candidates.push({
            sampledIndex,
            longitudinalProjection: projections[sampledIndex],
            projectionDelta,
            tangentOrthogonalityError,
            score:
                MID_HEEL_SCORE_PROJECTION_WEIGHT * (projectionDelta / projectionScale) +
                MID_HEEL_SCORE_TANGENT_WEIGHT * tangentOrthogonalityError,
        });
    }

    const sortedCandidates = [...candidates].sort(
        (first, second) => first.score - second.score || first.sampledIndex - second.sampledIndex,
    );
    const selectedCandidate = sortedCandidates[0];
    if (!selectedCandidate) {
        return {
            errors: [
                {
                    code: 'FOOT_MID_HEEL_TANGENT_INVALID',
                    message:
                        'No finite non-zero local tangent could be estimated near the heel extremum.',
                },
            ],
        };
    }

    const ambiguousCandidate = sortedCandidates
        .slice(1)
        .find(
            (candidate) =>
                Math.abs(candidate.sampledIndex - selectedCandidate.sampledIndex) >
                    MID_HEEL_AMBIGUITY_INDEX_SEPARATION &&
                candidate.score - selectedCandidate.score <= MID_HEEL_AMBIGUITY_SCORE_TOLERANCE,
        );
    if (ambiguousCandidate) {
        return {
            errors: [
                {
                    code: 'FOOT_MID_HEEL_DETECTION_AMBIGUOUS',
                    message: `Equivalent H* candidates remain at heel-arc samples ${
                        selectedCandidate.sampledIndex
                    } (score ${selectedCandidate.score.toFixed(6)}) and ${
                        ambiguousCandidate.sampledIndex
                    } (score ${ambiguousCandidate.score.toFixed(6)}).`,
                },
            ],
        };
    }

    const identity = quadraticExtremumIdentity(projections, selectedCandidate.sampledIndex);
    const point = pointAtPolylineIdentity(heelArc, identity, 'H*');
    const tangent = estimatePolylineTangentAtPoint(heelArc, identity);
    if (!point || !tangent) {
        return {
            errors: [
                {
                    code: 'FOOT_MID_HEEL_TANGENT_INVALID',
                    message:
                        'The refined H* source identity did not produce a finite non-zero tangent.',
                },
            ],
        };
    }

    const longitudinalProjection = dot(vectorBetween(ankleCenter, point), footDirection);
    const projectionError = Math.abs(longitudinalProjection - extremumProjection);
    const projectionTolerance = Math.max(projectionSpan * 0.25, VECTOR_EPSILON);
    const orthogonalityError = Math.abs(dot(tangent, footDirection));
    if (
        projectionError > projectionTolerance ||
        orthogonalityError > MID_HEEL_TANGENT_DOT_TOLERANCE
    ) {
        return {
            errors: [
                {
                    code: 'FOOT_MID_HEEL_DETECTION_AMBIGUOUS',
                    message: `H* candidate failed validation: projection error ${projectionError.toFixed(
                        6,
                    )} (tol ${projectionTolerance.toFixed(
                        6,
                    )}), tangent dot ${orthogonalityError.toFixed(
                        6,
                    )} (tol ${MID_HEEL_TANGENT_DOT_TOLERANCE}).`,
                },
            ],
        };
    }

    const firstNormal = { x: -tangent.y, y: tangent.x };
    const secondNormal = { x: tangent.y, y: -tangent.x };
    const normalTowardToe = dot(firstNormal, footDirection) > 0 ? firstNormal : secondNormal;
    if (dot(normalTowardToe, footDirection) <= VECTOR_EPSILON) {
        return {
            errors: [
                {
                    code: 'FOOT_MID_HEEL_DETECTION_AMBIGUOUS',
                    message:
                        'The H* tangent normal could not be oriented toward the P/Q forefoot centre.',
                },
            ],
        };
    }

    return {
        geometry: {
            point,
            heelArcSegmentIndex: identity.segmentIndex,
            heelArcSegmentT: identity.segmentT,
            coarseSampledIndex,
            footDirection,
            tangent,
            normalTowardToe,
            extremumProjection,
            longitudinalProjection,
            projectionError,
            projectionTolerance,
            orthogonalityError,
            confidence:
                orthogonalityError <= MID_HEEL_TANGENT_DOT_TOLERANCE / 2 &&
                projectionError <= projectionTolerance / 2
                    ? 'HIGH'
                    : 'REVIEW',
            candidates,
        },
        errors: [],
    };
}

function uniqueLandmarkIndex(points: DraftPoint[], landmarkId: 'Q' | 'P'): number | undefined {
    const matches = points.reduce<number[]>((indices, point, index) => {
        if (point.id === landmarkId) {
            indices.push(index);
        }
        return indices;
    }, []);
    return matches.length === 1 ? matches[0] : undefined;
}

export function extractQPToeArc(
    orderedRQPS: DraftPoint[],
): GeometryBuildResult<QPToeArcExtraction> {
    const qIndex = uniqueLandmarkIndex(orderedRQPS, 'Q');
    const pIndex = uniqueLandmarkIndex(orderedRQPS, 'P');
    if (qIndex === undefined || pIndex === undefined || qIndex >= pIndex) {
        return {
            errors: [
                {
                    code: 'FOOT_PIECE_QP_ARC_NOT_FOUND',
                    message: 'Ordered RQPS must contain exactly one Q followed by exactly one P.',
                },
            ],
        };
    }

    const points = clonePoints(orderedRQPS.slice(qIndex, pIndex + 1));
    if (points.length < 2) {
        return {
            errors: [
                {
                    code: 'FOOT_PIECE_QP_ARC_NOT_FOUND',
                    message: 'The Q-to-P toe arc must contain at least one segment.',
                },
            ],
        };
    }

    return {
        geometry: { points, rqpsStartIndex: qIndex, rqpsEndIndex: pIndex },
        errors: [],
    };
}

export function raySegmentIntersection(
    origin: DraftPoint,
    direction: DraftVector2,
    segmentStart: DraftPoint,
    segmentEnd: DraftPoint,
): RaySegmentIntersection | undefined {
    const rayDirection = normalizeVector(direction);
    const segmentDirection = vectorBetween(segmentStart, segmentEnd);
    if (!rayDirection || Math.hypot(segmentDirection.x, segmentDirection.y) <= VECTOR_EPSILON) {
        return undefined;
    }

    const denominator = cross(rayDirection, segmentDirection);
    if (Math.abs(denominator) <= VECTOR_EPSILON) {
        return undefined;
    }

    const originToSegment = vectorBetween(origin, segmentStart);
    const rayT = cross(originToSegment, segmentDirection) / denominator;
    const rawSegmentT = cross(originToSegment, rayDirection) / denominator;
    if (
        rayT <= RAY_PARAMETER_TOLERANCE ||
        rawSegmentT < -RAY_PARAMETER_TOLERANCE ||
        rawSegmentT > 1 + RAY_PARAMETER_TOLERANCE
    ) {
        return undefined;
    }

    const segmentT = Math.max(0, Math.min(1, rawSegmentT));
    return {
        point: {
            id: 'ray-segment-intersection',
            x: origin.x + rayDirection.x * rayT,
            y: origin.y + rayDirection.y * rayT,
        },
        rayT,
        segmentT,
    };
}

export function findAutomaticSecondToe(
    sourceMidHeel: MidHeelDetection,
    toeArcQP: DraftPoint[],
): GeometryBuildResult<SecondToeDetection> {
    const intersections = toeArcQP
        .slice(0, -1)
        .map((segmentStart, segmentIndex) => {
            const intersection = raySegmentIntersection(
                sourceMidHeel.point,
                sourceMidHeel.normalTowardToe,
                segmentStart,
                toeArcQP[segmentIndex + 1],
            );
            return intersection ? { ...intersection, segmentIndex } : undefined;
        })
        .filter((intersection): intersection is RaySegmentIntersection & { segmentIndex: number } =>
            Boolean(intersection),
        )
        .sort((first, second) => first.rayT - second.rayT);

    const uniqueIntersections = intersections.filter(
        (intersection, index) =>
            index === 0 ||
            Math.abs(intersection.rayT - intersections[index - 1].rayT) > RAY_PARAMETER_TOLERANCE,
    );
    const selected = uniqueIntersections[0];
    if (!selected) {
        return {
            errors: [
                {
                    code: 'FOOT_SECOND_TOE_NOT_FOUND',
                    message: 'The forward H* normal does not intersect the ordered Q-to-P toe arc.',
                },
            ],
        };
    }

    return {
        geometry: {
            point: { ...selected.point, id: 'W' },
            toeArcSegmentIndex: selected.segmentIndex,
            toeArcSegmentT: selected.segmentT,
            rayDistance: selected.rayT,
            intersectionCandidateCount: uniqueIntersections.length,
        },
        errors: [],
    };
}

export function intersectInfiniteLines(
    firstStart: DraftPoint,
    firstEnd: DraftPoint,
    secondStart: DraftPoint,
    secondEnd: DraftPoint,
    id = 'line-intersection',
): DraftPoint | undefined {
    const firstDirection = normalizeVector(vectorBetween(firstStart, firstEnd));
    const secondDirection = normalizeVector(vectorBetween(secondStart, secondEnd));
    if (!firstDirection || !secondDirection) {
        return undefined;
    }

    const denominator = cross(firstDirection, secondDirection);
    if (Math.abs(denominator) <= LINE_PARALLEL_TOLERANCE) {
        return undefined;
    }

    const startOffset = vectorBetween(firstStart, secondStart);
    const firstT = cross(startOffset, secondDirection) / denominator;
    return {
        id,
        x: firstStart.x + firstDirection.x * firstT,
        y: firstStart.y + firstDirection.y * firstT,
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

export function buildAutomaticSourceFootAxis(
    heelArc: DraftPoint[],
    orderedRQPS: DraftPoint[],
    landmarks: FootPieceLandmarks,
): GeometryBuildResult<SourceFootAxisGeometry> {
    const midHeelResult = findAutomaticMidHeel(
        heelArc,
        landmarks.P,
        landmarks.Q,
        landmarks.R,
        landmarks.S,
    );
    const toeArcResult = extractQPToeArc(orderedRQPS);
    if (!midHeelResult.geometry || !toeArcResult.geometry) {
        return { errors: [...midHeelResult.errors, ...toeArcResult.errors] };
    }

    const secondToeResult = findAutomaticSecondToe(
        midHeelResult.geometry,
        toeArcResult.geometry.points,
    );
    if (!secondToeResult.geometry) {
        return { errors: secondToeResult.errors };
    }

    const sourceMs = intersectInfiniteLines(
        midHeelResult.geometry.point,
        secondToeResult.geometry.point,
        landmarks.R,
        landmarks.S,
        'Ms',
    );
    if (!sourceMs) {
        return {
            errors: [
                {
                    code: 'FOOT_SOURCE_AXIS_RS_NEAR_PARALLEL',
                    message: 'The source H*-W axis and source R-S line are parallel or degenerate.',
                },
            ],
        };
    }

    const ankleCenter = midpoint(landmarks.R, landmarks.S, 'source-ankle-center');
    const forefootCenter = midpoint(landmarks.P, landmarks.Q, 'source-forefoot-center');
    const rsMidpoint = midpoint(landmarks.R, landmarks.S, 'source-RS-midpoint');
    const longitudinalDirection = vectorBetween(
        midHeelResult.geometry.point,
        secondToeResult.geometry.point,
    );
    const transverseDirection = vectorBetween(landmarks.R, landmarks.S);

    return {
        geometry: {
            heelArc: clonePoints(heelArc),
            rqps: clonePoints(orderedRQPS),
            toeArcQP: clonePoints(toeArcResult.geometry.points),
            ankleCenter,
            forefootCenter,
            sourceMidHeel: midHeelResult.geometry,
            sourceSecondToe: secondToeResult.geometry,
            sourceMs,
            rsMidpoint,
            hwDistanceRaw: distance(midHeelResult.geometry.point, secondToeResult.geometry.point),
            longitudinalTransverseAngleRadians: angleBetween(
                longitudinalDirection,
                transverseDirection,
            ),
            sourceMsVsRsMidpointDistanceRaw: distance(sourceMs, rsMidpoint),
        },
        errors: [],
    };
}
