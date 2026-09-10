import * as THREE from 'three';
import type {
    DraftPoint,
    DraftVector2,
    FrontPieceGeometry,
    GeometryBuildResult,
    TargetOuterCurveCandidate,
    TargetOuterCurveRejectionReason,
    TargetReferenceArcGeometry,
    TargetUtGeometry,
    TargetWPrimeGeometry,
} from '../types';
import {
    pointInPolygon,
    polylineIntersections,
    polylineLength,
    segmentsIntersect,
} from './curveUtils';
import { distance, GEOMETRY_EPSILON_CM, VALIDATION_TOLERANCE_CM } from './geometryUtils';

export const TARGET_OUTER_CURVE_SAMPLE_SEGMENTS = 400;
export const TARGET_OUTER_CURVE_EXTRA_LENGTH_MIN_CM = 1;
export const TARGET_OUTER_CURVE_EXTRA_LENGTH_MAX_CM = 2;
export const TARGET_OUTER_CURVE_TANGENT_WINDOW_POINTS = 4;

const TARGET_OUTER_CURVE_ANCHOR_COUNT = 5;

export interface TargetOuterCurveEvaluationInput {
    frontPiece: FrontPieceGeometry;
    targetReferenceArc: TargetReferenceArcGeometry;
    targetUt: TargetUtGeometry;
    targetWPrime: TargetWPrimeGeometry;
}

export interface TargetOuterCurveLengthEvaluation {
    outerCurveLengthCm: number;
    referenceLengthCm: number;
    extraLengthCm: number;
    pass: boolean;
    rejectionReason?: Extract<
        TargetOuterCurveRejectionReason,
        'OUTER_CURVE_TOO_SHORT' | 'OUTER_CURVE_TOO_LONG'
    >;
}

export interface TargetOuterCurveSpatialEvaluation {
    referencePolygon: DraftPoint[];
    outsidePointCount: number;
    insidePointCount: number;
    boundaryPointCount: number;
    referenceIntersectionCount: number;
    selfIntersectionCount: number;
    outsideReference: boolean;
    noReferenceIntersection: boolean;
    noSelfIntersection: boolean;
}

function isFinitePoint(point: DraftPoint | undefined): point is DraftPoint {
    return Boolean(point) && Number.isFinite(point?.x) && Number.isFinite(point?.y);
}

function clonePoint(point: DraftPoint): DraftPoint {
    return { ...point };
}

function normalizeVector(vector: DraftVector2): DraftVector2 | undefined {
    const magnitude = Math.hypot(vector.x, vector.y);
    if (!Number.isFinite(magnitude) || magnitude <= GEOMETRY_EPSILON_CM) {
        return undefined;
    }
    return { x: vector.x / magnitude, y: vector.y / magnitude };
}

function angleBetweenDirectionsDegrees(
    first: DraftVector2 | undefined,
    second: DraftVector2 | undefined,
): number | undefined {
    const normalizedFirst = first && normalizeVector(first);
    const normalizedSecond = second && normalizeVector(second);
    if (!normalizedFirst || !normalizedSecond) {
        return undefined;
    }

    const dot = Math.max(
        -1,
        Math.min(
            1,
            normalizedFirst.x * normalizedSecond.x + normalizedFirst.y * normalizedSecond.y,
        ),
    );
    return (Math.acos(dot) * 180) / Math.PI;
}

function undirectedAngleBetweenLinesDegrees(
    first: DraftVector2 | undefined,
    second: DraftVector2 | undefined,
): number | undefined {
    const angle = angleBetweenDirectionsDegrees(first, second);
    return angle === undefined ? undefined : Math.min(angle, 180 - angle);
}

export function maximumAnchorInterpolationError(
    sampledPoints: DraftPoint[],
    anchors: DraftPoint[],
): number {
    return Math.max(
        ...anchors.map((anchor) =>
            Math.min(...sampledPoints.map((sampledPoint) => distance(sampledPoint, anchor))),
        ),
    );
}

function hasRepeatedAnchors(anchors: DraftPoint[]): boolean {
    for (let firstIndex = 0; firstIndex < anchors.length; firstIndex += 1) {
        for (let secondIndex = firstIndex + 1; secondIndex < anchors.length; secondIndex += 1) {
            if (distance(anchors[firstIndex], anchors[secondIndex]) <= GEOMETRY_EPSILON_CM) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Samples one open centripetal Catmull-Rom spline. The default segment count is a
 * multiple of the four spline intervals, so all five interpolation anchors are
 * represented exactly in the returned business-level DraftPoint polyline.
 */
export function sampleTargetOuterCurve(
    anchors: DraftPoint[],
    sampleSegments = TARGET_OUTER_CURVE_SAMPLE_SEGMENTS,
): GeometryBuildResult<DraftPoint[]> {
    if (
        anchors.length !== TARGET_OUTER_CURVE_ANCHOR_COUNT ||
        anchors.some((point) => !isFinitePoint(point)) ||
        !Number.isInteger(sampleSegments) ||
        sampleSegments < TARGET_OUTER_CURVE_ANCHOR_COUNT - 1 ||
        sampleSegments % (TARGET_OUTER_CURVE_ANCHOR_COUNT - 1) !== 0
    ) {
        return {
            errors: [
                {
                    code: 'TARGET_OUTER_CURVE_INPUT_INVALID',
                    message:
                        "The L-U-W'-T-G' curve requires five finite anchors and a positive sample count divisible by four.",
                },
            ],
        };
    }

    if (hasRepeatedAnchors(anchors)) {
        return {
            errors: [
                {
                    code: 'TARGET_OUTER_CURVE_DEGENERATE',
                    message: "The L-U-W'-T-G' curve cannot contain repeated anchors.",
                },
            ],
        };
    }

    const curve = new THREE.CatmullRomCurve3(
        anchors.map((point) => new THREE.Vector3(point.x, point.y, 0)),
        false,
        'centripetal',
    );
    const sampledPoints = curve.getPoints(sampleSegments).map((point, index) => ({
        id: `target-outer-curve-${index}`,
        x: point.x,
        y: point.y,
    }));
    const interpolationError = maximumAnchorInterpolationError(sampledPoints, anchors);
    if (
        sampledPoints.some((point) => !isFinitePoint(point)) ||
        !Number.isFinite(interpolationError) ||
        interpolationError > VALIDATION_TOLERANCE_CM
    ) {
        return {
            errors: [
                {
                    code: 'TARGET_OUTER_CURVE_ANCHOR_INTERPOLATION_FAILED',
                    message:
                        "The sampled spline did not interpolate every L-U-W'-T-G' anchor within tolerance.",
                },
            ],
        };
    }

    const pointsPerInterval = sampleSegments / (TARGET_OUTER_CURVE_ANCHOR_COUNT - 1);
    anchors.forEach((anchor, anchorIndex) => {
        sampledPoints[anchorIndex * pointsPerInterval] = clonePoint(anchor);
    });

    return { geometry: sampledPoints, errors: [] };
}

export function buildTargetReferencePolygon(targetReferenceArc: DraftPoint[]): DraftPoint[] {
    if (!targetReferenceArc.length) {
        return [];
    }

    const polygon = targetReferenceArc.map(clonePoint);
    if (distance(polygon[0], polygon[polygon.length - 1]) > GEOMETRY_EPSILON_CM) {
        polygon.push({ ...polygon[0], id: 'reference-closure-R*' });
    }
    return polygon;
}

export function findPolylineSelfIntersections(
    polyline: DraftPoint[],
    toleranceCm = VALIDATION_TOLERANCE_CM,
): Array<{ firstSegmentIndex: number; secondSegmentIndex: number }> {
    const intersections: Array<{ firstSegmentIndex: number; secondSegmentIndex: number }> = [];

    for (let firstIndex = 0; firstIndex < polyline.length - 1; firstIndex += 1) {
        for (
            let secondIndex = firstIndex + 2;
            secondIndex < polyline.length - 1;
            secondIndex += 1
        ) {
            if (
                segmentsIntersect(
                    polyline[firstIndex],
                    polyline[firstIndex + 1],
                    polyline[secondIndex],
                    polyline[secondIndex + 1],
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

export function evaluateTargetOuterCurveLength(
    outerCurveLengthCm: number,
    referenceLengthCm: number,
    toleranceCm = VALIDATION_TOLERANCE_CM,
): TargetOuterCurveLengthEvaluation {
    const extraLengthCm = outerCurveLengthCm - referenceLengthCm;
    const tooShort = extraLengthCm < TARGET_OUTER_CURVE_EXTRA_LENGTH_MIN_CM - toleranceCm;
    const tooLong = extraLengthCm > TARGET_OUTER_CURVE_EXTRA_LENGTH_MAX_CM + toleranceCm;

    return {
        outerCurveLengthCm,
        referenceLengthCm,
        extraLengthCm,
        pass: !tooShort && !tooLong,
        rejectionReason: tooShort
            ? 'OUTER_CURVE_TOO_SHORT'
            : tooLong
            ? 'OUTER_CURVE_TOO_LONG'
            : undefined,
    };
}

export function evaluateTargetOuterCurveSpatialChecks(
    outerCurve: DraftPoint[],
    targetReferenceArc: DraftPoint[],
    toleranceCm = VALIDATION_TOLERANCE_CM,
): TargetOuterCurveSpatialEvaluation {
    const referencePolygon = buildTargetReferencePolygon(targetReferenceArc);
    const locations = outerCurve.map((point) =>
        pointInPolygon(point, referencePolygon, toleranceCm),
    );
    const outsidePointCount = locations.filter((location) => location === 'outside').length;
    const insidePointCount = locations.filter((location) => location === 'inside').length;
    const boundaryPointCount = locations.filter((location) => location === 'boundary').length;
    // Deliberately use only the open R*->...->S* reference arc here. The S*->R*
    // polygon closure exists solely for point-in-polygon classification.
    const referenceIntersectionCount = polylineIntersections(
        outerCurve,
        targetReferenceArc,
        toleranceCm,
    ).length;
    const selfIntersectionCount = findPolylineSelfIntersections(outerCurve, toleranceCm).length;

    return {
        referencePolygon,
        outsidePointCount,
        insidePointCount,
        boundaryPointCount,
        referenceIntersectionCount,
        selfIntersectionCount,
        outsideReference: insidePointCount === 0,
        noReferenceIntersection: referenceIntersectionCount === 0,
        noSelfIntersection: selfIntersectionCount === 0,
    };
}

function findUniqueBoundaryNeighbor(
    frontPiece: FrontPieceGeometry,
    anchor: DraftPoint,
): DraftPoint | undefined {
    const neighbors = frontPiece.lines.flatMap((line) => {
        if (line.kind !== 'boundary') {
            return [];
        }
        if (line.start.id === anchor.id) {
            return [line.end];
        }
        if (line.end.id === anchor.id) {
            return [line.start];
        }
        return [];
    });
    return neighbors.length === 1 ? neighbors[0] : undefined;
}

export function deriveTargetOuterCurveTangentDiagnostics(
    frontPiece: FrontPieceGeometry,
    sampledCurve: DraftPoint[],
    footAxisDirection: DraftVector2,
): TargetOuterCurveCandidate['diagnostics'] {
    const window = Math.min(
        TARGET_OUTER_CURVE_TANGENT_WINDOW_POINTS,
        Math.floor((sampledCurve.length - 1) / 4),
    );
    if (window < 1) {
        return {};
    }

    const lastIndex = sampledCurve.length - 1;
    const wPrimeIndex = Math.round(lastIndex / 2);
    const lTangent = {
        x: sampledCurve[window].x - sampledCurve[0].x,
        y: sampledCurve[window].y - sampledCurve[0].y,
    };
    const gPrimeTangent = {
        x: sampledCurve[lastIndex].x - sampledCurve[lastIndex - window].x,
        y: sampledCurve[lastIndex].y - sampledCurve[lastIndex - window].y,
    };
    const wPrimeTangent = {
        x: sampledCurve[wPrimeIndex + window].x - sampledCurve[wPrimeIndex - window].x,
        y: sampledCurve[wPrimeIndex + window].y - sampledCurve[wPrimeIndex - window].y,
    };
    const lNeighbor = findUniqueBoundaryNeighbor(frontPiece, frontPiece.points.L);
    const gPrimeNeighbor = findUniqueBoundaryNeighbor(frontPiece, frontPiece.points.GPrime);
    const lBoundaryDirection = lNeighbor
        ? {
              x: frontPiece.points.L.x - lNeighbor.x,
              y: frontPiece.points.L.y - lNeighbor.y,
          }
        : undefined;
    const gPrimeBoundaryDirection = gPrimeNeighbor
        ? {
              x: frontPiece.points.GPrime.x - gPrimeNeighbor.x,
              y: frontPiece.points.GPrime.y - gPrimeNeighbor.y,
          }
        : undefined;

    return {
        lEndpointTangentMismatchDeg: undirectedAngleBetweenLinesDegrees(
            lTangent,
            lBoundaryDirection,
        ),
        gPrimeEndpointTangentMismatchDeg: undirectedAngleBetweenLinesDegrees(
            gPrimeTangent,
            gPrimeBoundaryDirection,
        ),
        wPrimeTangentAngleToFootAxisDeg: undirectedAngleBetweenLinesDegrees(
            wPrimeTangent,
            footAxisDirection,
        ),
    };
}

export function evaluateTargetOuterCurveCandidate({
    frontPiece,
    targetReferenceArc,
    targetUt,
    targetWPrime,
}: TargetOuterCurveEvaluationInput): GeometryBuildResult<TargetOuterCurveCandidate> {
    const anchors: TargetOuterCurveCandidate['anchors'] = {
        L: clonePoint(frontPiece.points.L),
        U: clonePoint(targetUt.U),
        WPrime: clonePoint(targetWPrime.WPrime),
        T: clonePoint(targetUt.T),
        GPrime: clonePoint(frontPiece.points.GPrime),
    };
    const anchorPoints = [anchors.L, anchors.U, anchors.WPrime, anchors.T, anchors.GPrime];
    const referencePoints = targetReferenceArc.targetReferenceArc;
    if (
        anchorPoints.some((point) => !isFinitePoint(point)) ||
        referencePoints.length < 3 ||
        referencePoints.some((point) => !isFinitePoint(point)) ||
        !Number.isFinite(targetReferenceArc.targetReferenceArcLengthCm) ||
        targetReferenceArc.targetReferenceArcLengthCm <= GEOMETRY_EPSILON_CM ||
        !Number.isFinite(targetUt.distribution) ||
        !Number.isFinite(targetWPrime.outwardOffsetCm)
    ) {
        return {
            errors: [
                {
                    code: 'TARGET_OUTER_CURVE_INPUT_INVALID',
                    message:
                        "Step 6 requires finite L/U/W'/T/G' anchors and a valid target reference arc.",
                },
            ],
        };
    }

    const sampledResult = sampleTargetOuterCurve(anchorPoints);
    if (!sampledResult.geometry) {
        return { errors: sampledResult.errors };
    }

    const polylinePoints = sampledResult.geometry;
    const anchorInterpolationErrorCm = maximumAnchorInterpolationError(
        polylinePoints,
        anchorPoints,
    );
    const anchorInterpolationPass = anchorInterpolationErrorCm <= VALIDATION_TOLERANCE_CM;
    if (!anchorInterpolationPass) {
        return {
            errors: [
                {
                    code: 'TARGET_OUTER_CURVE_ANCHOR_INTERPOLATION_FAILED',
                    message:
                        "The sampled spline did not interpolate every L-U-W'-T-G' anchor within tolerance.",
                },
            ],
        };
    }

    const outerCurveLengthCm = polylineLength(polylinePoints);
    const lengthEvaluation = evaluateTargetOuterCurveLength(
        outerCurveLengthCm,
        targetReferenceArc.targetReferenceArcLengthCm,
    );
    const spatialEvaluation = evaluateTargetOuterCurveSpatialChecks(
        polylinePoints,
        referencePoints,
    );
    const rejectionReasons: TargetOuterCurveRejectionReason[] = [];
    if (lengthEvaluation.rejectionReason) {
        rejectionReasons.push(lengthEvaluation.rejectionReason);
    }
    if (!spatialEvaluation.outsideReference) {
        rejectionReasons.push('OUTER_CURVE_INSIDE_REFERENCE');
    }
    if (!spatialEvaluation.noReferenceIntersection) {
        rejectionReasons.push('OUTER_CURVE_REFERENCE_INTERSECTION');
    }
    if (!spatialEvaluation.noSelfIntersection) {
        rejectionReasons.push('OUTER_CURVE_SELF_INTERSECTION');
    }

    const checks: TargetOuterCurveCandidate['checks'] = {
        anchorInterpolation: {
            maximumErrorCm: anchorInterpolationErrorCm,
            toleranceCm: VALIDATION_TOLERANCE_CM,
            pass: true,
        },
        lengthRange: {
            extraLengthCm: lengthEvaluation.extraLengthCm,
            minimumCm: TARGET_OUTER_CURVE_EXTRA_LENGTH_MIN_CM,
            maximumCm: TARGET_OUTER_CURVE_EXTRA_LENGTH_MAX_CM,
            toleranceCm: VALIDATION_TOLERANCE_CM,
            pass: lengthEvaluation.pass,
        },
        outsideReference: {
            outsidePointCount: spatialEvaluation.outsidePointCount,
            insidePointCount: spatialEvaluation.insidePointCount,
            boundaryPointCount: spatialEvaluation.boundaryPointCount,
            totalPointCount: polylinePoints.length,
            pass: spatialEvaluation.outsideReference,
        },
        noReferenceIntersection: {
            intersectionCount: spatialEvaluation.referenceIntersectionCount,
            pass: spatialEvaluation.noReferenceIntersection,
        },
        noSelfIntersection: {
            intersectionCount: spatialEvaluation.selfIntersectionCount,
            pass: spatialEvaluation.noSelfIntersection,
        },
    };
    const valid =
        checks.anchorInterpolation.pass &&
        checks.lengthRange.pass &&
        checks.outsideReference.pass &&
        checks.noReferenceIntersection.pass &&
        checks.noSelfIntersection.pass;

    return {
        geometry: {
            alpha: targetUt.distribution,
            wPrimeOffsetCm: targetWPrime.outwardOffsetCm,
            curveModel: 'centripetal-catmull-rom',
            sampleSegments: TARGET_OUTER_CURVE_SAMPLE_SEGMENTS,
            anchors,
            polylinePoints,
            referencePolygon: spatialEvaluation.referencePolygon,
            referenceLengthCm: lengthEvaluation.referenceLengthCm,
            outerCurveLengthCm,
            extraLengthCm: lengthEvaluation.extraLengthCm,
            checks,
            diagnostics: deriveTargetOuterCurveTangentDiagnostics(
                frontPiece,
                polylinePoints,
                targetWPrime.toeOutwardDirection,
            ),
            valid,
            rejectionReasons,
        },
        errors: [],
    };
}
