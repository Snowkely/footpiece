import * as THREE from 'three';
import type {
    DraftPoint,
    DraftVector2,
    FrontPieceGeometry,
    GeometryBuildResult,
    TargetMultiSupportOuterCurveAnchorId,
    TargetMultiSupportOuterCurveCandidate,
    TargetOuterCurveRejectionReason,
    TargetReferenceArcGeometry,
    TargetUtGeometry,
    ToeRadialOuterSupportGeometry,
} from '../types';
import { polylineLength } from './curveUtils';
import { distance, GEOMETRY_EPSILON_CM, VALIDATION_TOLERANCE_CM } from './geometryUtils';
import {
    deriveTargetOuterCurveTangentDiagnostics,
    evaluateTargetOuterCurveLength,
    evaluateTargetOuterCurveSpatialChecks,
    maximumAnchorInterpolationError,
    TARGET_OUTER_CURVE_EXTRA_LENGTH_MAX_CM,
    TARGET_OUTER_CURVE_EXTRA_LENGTH_MIN_CM,
    TARGET_OUTER_CURVE_SAMPLE_SEGMENTS,
} from './targetOuterCurve';
import { derivePolylineTurningDiagnostics } from './toeTurningDiagnostics';

const MULTI_SUPPORT_ANCHOR_COUNT = 9;

export const TARGET_MULTI_SUPPORT_OUTER_CURVE_ANCHOR_ORDER = [
    'L',
    'U',
    'W4Prime',
    'W3Prime',
    'WPrime',
    'W2Prime',
    'W1Prime',
    'T',
    'GPrime',
] as const;

export interface TargetMultiSupportOuterCurveInput {
    frontPiece: FrontPieceGeometry;
    targetReferenceArc: TargetReferenceArcGeometry;
    targetUt: TargetUtGeometry;
    toeRadialOuterSupports: ToeRadialOuterSupportGeometry;
}

export interface TargetMultiSupportSplineSample {
    polylinePoints: DraftPoint[];
    anchorInterpolationErrorsCm: Record<TargetMultiSupportOuterCurveAnchorId, number>;
    maximumAnchorInterpolationErrorCm: number;
}

function isFinitePoint(point: DraftPoint | undefined): point is DraftPoint {
    return Boolean(point) && Number.isFinite(point?.x) && Number.isFinite(point?.y);
}

function clonePoint(point: DraftPoint): DraftPoint {
    return { ...point };
}

function vectorBetween(start: DraftPoint, end: DraftPoint): DraftVector2 {
    return { x: end.x - start.x, y: end.y - start.y };
}

function angleBetweenDirectionsDegrees(first: DraftVector2, second: DraftVector2): number {
    const firstMagnitude = Math.hypot(first.x, first.y);
    const secondMagnitude = Math.hypot(second.x, second.y);
    if (
        !Number.isFinite(firstMagnitude) ||
        !Number.isFinite(secondMagnitude) ||
        firstMagnitude <= GEOMETRY_EPSILON_CM ||
        secondMagnitude <= GEOMETRY_EPSILON_CM
    ) {
        return Number.NaN;
    }

    const directionDot =
        (first.x * second.x + first.y * second.y) / (firstMagnitude * secondMagnitude);
    return (Math.acos(Math.max(-1, Math.min(1, directionDot))) * 180) / Math.PI;
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

function anchorInterpolationErrors(
    sampledPoints: DraftPoint[],
    anchors: DraftPoint[],
): Record<TargetMultiSupportOuterCurveAnchorId, number> {
    return Object.fromEntries(
        TARGET_MULTI_SUPPORT_OUTER_CURVE_ANCHOR_ORDER.map((id, index) => [
            id,
            Math.min(
                ...sampledPoints.map((sampledPoint) => distance(sampledPoint, anchors[index])),
            ),
        ]),
    ) as Record<TargetMultiSupportOuterCurveAnchorId, number>;
}

/** Samples one open nine-anchor centripetal Catmull-Rom curve. */
export function sampleTargetMultiSupportOuterCurve(
    anchors: DraftPoint[],
    sampleSegments = TARGET_OUTER_CURVE_SAMPLE_SEGMENTS,
): GeometryBuildResult<TargetMultiSupportSplineSample> {
    if (
        anchors.length !== MULTI_SUPPORT_ANCHOR_COUNT ||
        anchors.some((point) => !isFinitePoint(point)) ||
        !Number.isInteger(sampleSegments) ||
        sampleSegments < MULTI_SUPPORT_ANCHOR_COUNT - 1 ||
        sampleSegments % (MULTI_SUPPORT_ANCHOR_COUNT - 1) !== 0
    ) {
        return {
            errors: [
                {
                    code: 'MULTI_OUTER_CURVE_INPUT_INVALID',
                    message:
                        'The multi-support curve requires nine finite anchors and a sample count divisible by eight.',
                },
            ],
        };
    }
    if (hasRepeatedAnchors(anchors)) {
        return {
            errors: [
                {
                    code: 'MULTI_OUTER_CURVE_DEGENERATE',
                    message: 'The multi-support curve cannot contain repeated anchors.',
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
        id: `target-multi-support-outer-curve-${index}`,
        x: point.x,
        y: point.y,
    }));
    const errorsCm = anchorInterpolationErrors(sampledPoints, anchors);
    const maximumErrorCm = maximumAnchorInterpolationError(sampledPoints, anchors);
    if (
        sampledPoints.some((point) => !isFinitePoint(point)) ||
        !Number.isFinite(maximumErrorCm) ||
        maximumErrorCm > VALIDATION_TOLERANCE_CM
    ) {
        return {
            errors: [
                {
                    code: 'MULTI_OUTER_CURVE_ANCHOR_INTERPOLATION_FAILED',
                    message: 'The sampled spline did not interpolate every multi-support anchor.',
                },
            ],
        };
    }

    const pointsPerInterval = sampleSegments / (MULTI_SUPPORT_ANCHOR_COUNT - 1);
    anchors.forEach((anchor, anchorIndex) => {
        sampledPoints[anchorIndex * pointsPerInterval] = clonePoint(anchor);
    });

    return {
        geometry: {
            polylinePoints: sampledPoints,
            anchorInterpolationErrorsCm: errorsCm,
            maximumAnchorInterpolationErrorCm: maximumErrorCm,
        },
        errors: [],
    };
}

function deriveToeTurningDiagnostics(
    sampledCurve: DraftPoint[],
): Pick<
    TargetMultiSupportOuterCurveCandidate['diagnostics'],
    'maxToeTurningDeg' | 'meanToeTurningDeg' | 'toeTurningVariationDeg'
> {
    const pointsPerInterval = TARGET_OUTER_CURVE_SAMPLE_SEGMENTS / (MULTI_SUPPORT_ANCHOR_COUNT - 1);
    const toeStartIndex = 2 * pointsPerInterval;
    const toeEndIndex = 6 * pointsPerInterval;
    const diagnostics = derivePolylineTurningDiagnostics(
        sampledCurve.slice(toeStartIndex, toeEndIndex + 1),
    );
    if (!diagnostics) {
        return {};
    }

    return {
        maxToeTurningDeg: diagnostics.maxTurningDeg,
        meanToeTurningDeg: diagnostics.meanTurningDeg,
        toeTurningVariationDeg: diagnostics.turningVariationDeg,
    };
}

function deriveSupportChordTurningAngles(
    anchors: TargetMultiSupportOuterCurveCandidate['anchors'],
): TargetMultiSupportOuterCurveCandidate['diagnostics']['supportChordTurningAnglesDeg'] {
    return {
        W3Prime: angleBetweenDirectionsDegrees(
            vectorBetween(anchors.W4Prime, anchors.W3Prime),
            vectorBetween(anchors.W3Prime, anchors.WPrime),
        ),
        WPrime: angleBetweenDirectionsDegrees(
            vectorBetween(anchors.W3Prime, anchors.WPrime),
            vectorBetween(anchors.WPrime, anchors.W2Prime),
        ),
        W2Prime: angleBetweenDirectionsDegrees(
            vectorBetween(anchors.WPrime, anchors.W2Prime),
            vectorBetween(anchors.W2Prime, anchors.W1Prime),
        ),
    };
}

export function evaluateTargetMultiSupportOuterCurveCandidate({
    frontPiece,
    targetReferenceArc,
    targetUt,
    toeRadialOuterSupports,
}: TargetMultiSupportOuterCurveInput): GeometryBuildResult<TargetMultiSupportOuterCurveCandidate> {
    const anchors: TargetMultiSupportOuterCurveCandidate['anchors'] = {
        L: clonePoint(frontPiece.points.L),
        U: clonePoint(targetUt.U),
        W4Prime: clonePoint(toeRadialOuterSupports.W4Prime.outerPoint),
        W3Prime: clonePoint(toeRadialOuterSupports.W3Prime.outerPoint),
        WPrime: clonePoint(toeRadialOuterSupports.WPrime.outerPoint),
        W2Prime: clonePoint(toeRadialOuterSupports.W2Prime.outerPoint),
        W1Prime: clonePoint(toeRadialOuterSupports.W1Prime.outerPoint),
        T: clonePoint(targetUt.T),
        GPrime: clonePoint(frontPiece.points.GPrime),
    };
    const anchorPoints = TARGET_MULTI_SUPPORT_OUTER_CURVE_ANCHOR_ORDER.map((id) => anchors[id]);
    const referencePoints = targetReferenceArc.targetReferenceArc;
    if (
        anchorPoints.some((point) => !isFinitePoint(point)) ||
        referencePoints.length < 3 ||
        referencePoints.some((point) => !isFinitePoint(point)) ||
        !Number.isFinite(targetReferenceArc.targetReferenceArcLengthCm) ||
        targetReferenceArc.targetReferenceArcLengthCm <= GEOMETRY_EPSILON_CM ||
        !Number.isFinite(targetUt.distribution) ||
        !Number.isFinite(toeRadialOuterSupports.thetaDeg) ||
        !Number.isFinite(toeRadialOuterSupports.outwardOffsetCm)
    ) {
        return {
            errors: [
                {
                    code: 'MULTI_OUTER_CURVE_INPUT_INVALID',
                    message:
                        "Step 6C requires finite L/U/W4'/W3'/W'/W2'/W1'/T/G' anchors and reference geometry.",
                },
            ],
        };
    }

    const sampledResult = sampleTargetMultiSupportOuterCurve(anchorPoints);
    if (!sampledResult.geometry) {
        return { errors: sampledResult.errors };
    }
    const sample = sampledResult.geometry;
    const outerCurveLengthCm = polylineLength(sample.polylinePoints);
    const lengthEvaluation = evaluateTargetOuterCurveLength(
        outerCurveLengthCm,
        targetReferenceArc.targetReferenceArcLengthCm,
    );
    const spatialEvaluation = evaluateTargetOuterCurveSpatialChecks(
        sample.polylinePoints,
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

    const checks: TargetMultiSupportOuterCurveCandidate['checks'] = {
        anchorInterpolation: {
            errorsCm: sample.anchorInterpolationErrorsCm,
            maximumErrorCm: sample.maximumAnchorInterpolationErrorCm,
            toleranceCm: VALIDATION_TOLERANCE_CM,
            pass: sample.maximumAnchorInterpolationErrorCm <= VALIDATION_TOLERANCE_CM,
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
            totalPointCount: sample.polylinePoints.length,
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
    const baseDiagnostics = deriveTargetOuterCurveTangentDiagnostics(
        frontPiece,
        sample.polylinePoints,
        toeRadialOuterSupports.WPrime.direction,
    );

    return {
        geometry: {
            alpha: targetUt.distribution,
            thetaDeg: toeRadialOuterSupports.thetaDeg,
            outwardOffsetCm: toeRadialOuterSupports.outwardOffsetCm,
            curveModel: 'centripetal-catmull-rom',
            sampleSegments: TARGET_OUTER_CURVE_SAMPLE_SEGMENTS,
            anchors,
            anchorOrder: [...TARGET_MULTI_SUPPORT_OUTER_CURVE_ANCHOR_ORDER],
            polylinePoints: sample.polylinePoints,
            referencePolygon: spatialEvaluation.referencePolygon,
            referenceLengthCm: lengthEvaluation.referenceLengthCm,
            outerCurveLengthCm,
            extraLengthCm: lengthEvaluation.extraLengthCm,
            checks,
            diagnostics: {
                ...baseDiagnostics,
                ...deriveToeTurningDiagnostics(sample.polylinePoints),
                supportChordTurningAnglesDeg: deriveSupportChordTurningAngles(anchors),
            },
            valid,
            rejectionReasons,
        },
        errors: [],
    };
}
