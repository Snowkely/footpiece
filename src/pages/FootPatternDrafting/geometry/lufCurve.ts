import * as THREE from 'three';
import type {
    AlignedFootPieceGeometry,
    DraftPoint,
    FrontPieceGeometry,
    GeometryBuildResult,
    LufCurveGeometry,
    LufCurveParameters,
} from '../types';
import { pointInPolygon, polylineIntersections, polylineLength } from './curveUtils';
import {
    createDistanceCheck,
    distance,
    GEOMETRY_EPSILON_CM,
    VALIDATION_TOLERANCE_CM,
} from './geometryUtils';

export const LUF_CURVE_SAMPLE_SEGMENTS = 200;
export const LUF_CURVE_REFERENCE_ALLOWANCE_MIN_CM = 1;
export const LUF_CURVE_REFERENCE_ALLOWANCE_MAX_CM = 2;

export interface UtConstruction {
    U: DraftPoint;
    T: DraftPoint;
    pqLengthCm: number;
    extraLengthCm: number;
    upLengthCm: number;
    qtLengthCm: number;
}

function isFinitePoint(point: DraftPoint): boolean {
    return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function uniquePoints(points: DraftPoint[]): DraftPoint[] {
    return points.filter(
        (point, index) =>
            points.findIndex(
                (candidate) => distance(point, candidate) <= GEOMETRY_EPSILON_CM * 100,
            ) === index,
    );
}

export function findReferenceCentreLinePointF(
    alignedRQPS: DraftPoint[],
    MPrime: DraftPoint,
): GeometryBuildResult<DraftPoint> {
    if (alignedRQPS.length < 2 || !isFinitePoint(MPrime)) {
        return {
            errors: [
                {
                    code: 'LUF_CURVE_REFERENCE_INVALID',
                    message: "F requires a finite M' and an aligned RQPS polyline with segments.",
                },
            ],
        };
    }

    const intersections: DraftPoint[] = [];
    for (let index = 0; index < alignedRQPS.length - 1; index += 1) {
        const start = alignedRQPS[index];
        const end = alignedRQPS[index + 1];

        if (!isFinitePoint(start) || !isFinitePoint(end)) {
            return {
                errors: [
                    {
                        code: 'LUF_CURVE_REFERENCE_INVALID',
                        message: 'alignedRQPS contains a non-finite sampled point.',
                    },
                ],
            };
        }

        const startOffsetX = start.x - MPrime.x;
        const endOffsetX = end.x - MPrime.x;
        const startOnCentreLine = Math.abs(startOffsetX) <= GEOMETRY_EPSILON_CM;
        const endOnCentreLine = Math.abs(endOffsetX) <= GEOMETRY_EPSILON_CM;

        if (startOnCentreLine && endOnCentreLine) {
            return {
                errors: [
                    {
                        code: 'LUF_CURVE_F_CENTRE_LINE_OVERLAP',
                        message:
                            "An alignedRQPS segment overlaps the M' centre line, so F is not unique.",
                    },
                ],
            };
        }

        if (startOffsetX * endOffsetX > 0) {
            continue;
        }

        const segmentDeltaX = end.x - start.x;
        if (Math.abs(segmentDeltaX) <= GEOMETRY_EPSILON_CM) {
            continue;
        }

        const interpolation = (MPrime.x - start.x) / segmentDeltaX;
        if (interpolation < -GEOMETRY_EPSILON_CM || interpolation > 1 + GEOMETRY_EPSILON_CM) {
            continue;
        }

        intersections.push({
            id: `F-candidate-${index}`,
            x: MPrime.x,
            y: start.y + interpolation * (end.y - start.y),
        });
    }

    const outwardCandidates = uniquePoints(intersections).filter(
        (candidate) => candidate.y < MPrime.y - GEOMETRY_EPSILON_CM,
    );

    if (outwardCandidates.length === 0) {
        return {
            errors: [
                {
                    code: 'LUF_CURVE_F_NOT_FOUND',
                    message:
                        "The M' centre line does not have a valid alignedRQPS intersection in the downward foot direction.",
                },
            ],
        };
    }

    // The coordinate convention defines the second-toe/outward direction as downward
    // from M'. If the open reference curve crosses the centre line more than once, the
    // furthest downward candidate is the only domain-consistent choice. A tolerance tie
    // remains ambiguous and fails closed.
    const sortedCandidates = [...outwardCandidates].sort((pointA, pointB) => pointA.y - pointB.y);
    if (
        sortedCandidates.length > 1 &&
        Math.abs(sortedCandidates[0].y - sortedCandidates[1].y) <= VALIDATION_TOLERANCE_CM
    ) {
        return {
            errors: [
                {
                    code: 'LUF_CURVE_F_AMBIGUOUS',
                    message:
                        "Multiple alignedRQPS intersections are equally outward from M'; F cannot be selected uniquely.",
                },
            ],
        };
    }

    return {
        geometry: { ...sortedCandidates[0], id: 'F' },
        errors: [],
    };
}

export function createFPrime(
    F: DraftPoint,
    MPrime: DraftPoint,
    fPrimeOffsetCm: number,
): GeometryBuildResult<DraftPoint> {
    if (!Number.isFinite(fPrimeOffsetCm) || fPrimeOffsetCm < 0) {
        return {
            errors: [
                {
                    code: 'LUF_CURVE_F_PRIME_OFFSET_INVALID',
                    message: "F' outward offset must be a finite, non-negative cm value.",
                },
            ],
        };
    }

    const centreDirectionLength = distance(MPrime, F);
    if (centreDirectionLength <= GEOMETRY_EPSILON_CM) {
        return {
            errors: [
                {
                    code: 'LUF_CURVE_F_DIRECTION_INVALID',
                    message: "M' and F must define a non-zero outward centre-line direction.",
                },
            ],
        };
    }

    const directionX = (F.x - MPrime.x) / centreDirectionLength;
    const directionY = (F.y - MPrime.y) / centreDirectionLength;

    return {
        geometry: {
            id: "F'",
            x: F.x + directionX * fPrimeOffsetCm,
            y: F.y + directionY * fPrimeOffsetCm,
        },
        errors: [],
    };
}

export function buildUtPoints(
    P: DraftPoint,
    Q: DraftPoint,
    a: number,
    upQtDistribution: number,
): GeometryBuildResult<UtConstruction> {
    if (
        !isFinitePoint(P) ||
        !isFinitePoint(Q) ||
        !Number.isFinite(a) ||
        a < 0 ||
        !Number.isFinite(upQtDistribution) ||
        upQtDistribution < 0 ||
        upQtDistribution > 1
    ) {
        return {
            errors: [
                {
                    code: 'LUF_CURVE_UT_INPUT_INVALID',
                    message: 'U/T construction requires finite P, Q, a and alpha in [0, 1].',
                },
            ],
        };
    }

    const pqLengthCm = distance(P, Q);
    if (pqLengthCm <= GEOMETRY_EPSILON_CM) {
        return {
            errors: [
                {
                    code: 'LUF_CURVE_PQ_DIRECTION_INVALID',
                    message: 'Aligned landmarks P and Q must define a non-zero direction.',
                },
            ],
        };
    }

    const rawExtraLengthCm = a - pqLengthCm;
    if (rawExtraLengthCm < -VALIDATION_TOLERANCE_CM) {
        return {
            errors: [
                {
                    code: 'LUT_CURVE_A_SHORTER_THAN_PQ',
                    message: `UT cannot equal a: a (${a.toFixed(
                        3,
                    )} cm) is shorter than PQ (${pqLengthCm.toFixed(3)} cm).`,
                },
            ],
        };
    }

    const extraLengthCm = Math.max(0, rawExtraLengthCm);
    const upLengthCm = upQtDistribution * extraLengthCm;
    const qtLengthCm = (1 - upQtDistribution) * extraLengthCm;
    const directionX = (Q.x - P.x) / pqLengthCm;
    const directionY = (Q.y - P.y) / pqLengthCm;

    return {
        geometry: {
            U: {
                id: 'U',
                x: P.x - directionX * upLengthCm,
                y: P.y - directionY * upLengthCm,
            },
            T: {
                id: 'T',
                x: Q.x + directionX * qtLengthCm,
                y: Q.y + directionY * qtLengthCm,
            },
            pqLengthCm,
            extraLengthCm,
            upLengthCm,
            qtLengthCm,
        },
        errors: [],
    };
}

export function sampleInterpolatingLufCurve(
    anchorPoints: DraftPoint[],
    sampleSegments = LUF_CURVE_SAMPLE_SEGMENTS,
): GeometryBuildResult<DraftPoint[]> {
    if (
        anchorPoints.length !== 5 ||
        anchorPoints.some((point) => !isFinitePoint(point)) ||
        !Number.isInteger(sampleSegments) ||
        sampleSegments < 4
    ) {
        return {
            errors: [
                {
                    code: 'LUF_CURVE_SPLINE_INPUT_INVALID',
                    message:
                        "The L-U-F'-T-G' spline requires five finite anchors and at least four sample segments.",
                },
            ],
        };
    }

    const curve = new THREE.CatmullRomCurve3(
        anchorPoints.map((point) => new THREE.Vector3(point.x, point.y, 0)),
        false,
        'centripetal',
    );
    const sampledCurve = curve.getPoints(sampleSegments).map((point, index) => ({
        id: `LUF-curve-${index}`,
        x: point.x,
        y: point.y,
    }));

    return { geometry: sampledCurve, errors: [] };
}

export function buildLufCurve(
    footPiece: AlignedFootPieceGeometry,
    frontPiece: FrontPieceGeometry,
    a: number,
    parameters: LufCurveParameters,
): GeometryBuildResult<LufCurveGeometry> {
    const fResult = findReferenceCentreLinePointF(footPiece.alignedRQPS, frontPiece.points.MPrime);
    if (!fResult.geometry) {
        return { errors: fResult.errors };
    }

    const fPrimeResult = createFPrime(
        fResult.geometry,
        frontPiece.points.MPrime,
        parameters.fPrimeOffsetCm,
    );
    if (!fPrimeResult.geometry) {
        return { errors: fPrimeResult.errors };
    }

    const utResult = buildUtPoints(
        footPiece.alignedLandmarks.P,
        footPiece.alignedLandmarks.Q,
        a,
        parameters.upQtDistribution,
    );
    if (!utResult.geometry) {
        return { errors: utResult.errors };
    }

    if (!Number.isFinite(footPiece.rqpsArcLengthCm) || footPiece.rqpsArcLengthCm <= 0) {
        return {
            errors: [
                {
                    code: 'LUF_CURVE_REFERENCE_LENGTH_INVALID',
                    message:
                        'The aligned RQPS reference length must be a positive finite cm value.',
                },
            ],
        };
    }

    const { U, T } = utResult.geometry;
    const F = fResult.geometry;
    const FPrime = fPrimeResult.geometry;
    const anchorPoints = [frontPiece.points.L, U, FPrime, T, frontPiece.points.GPrime];
    const splineResult = sampleInterpolatingLufCurve(anchorPoints);
    if (!splineResult.geometry) {
        return { errors: splineResult.errors };
    }

    const sampledCurve = splineResult.geometry;
    const curveLengthCm = polylineLength(sampledCurve);
    const targetLengthMinCm = footPiece.rqpsArcLengthCm + LUF_CURVE_REFERENCE_ALLOWANCE_MIN_CM;
    const targetLengthMaxCm = footPiece.rqpsArcLengthCm + LUF_CURVE_REFERENCE_ALLOWANCE_MAX_CM;
    const polygonLocations = sampledCurve.map((point) =>
        pointInPolygon(point, footPiece.alignedRQPS),
    );
    const outsidePointCount = polygonLocations.filter((location) => location === 'outside').length;
    const insidePointCount = polygonLocations.filter((location) => location === 'inside').length;
    const boundaryPointCount = polygonLocations.filter(
        (location) => location === 'boundary',
    ).length;
    const intersectionCount = polylineIntersections(sampledCurve, footPiece.alignedRQPS).length;
    const ffPrimeDistanceCm = distance(F, FPrime);
    const mPrimeToF = distance(frontPiece.points.MPrime, F);
    const mPrimeToFPrime = distance(frontPiece.points.MPrime, FPrime);
    const outwardDistanceDeltaCm = mPrimeToFPrime - mPrimeToF;
    const centreLineLength = Math.max(mPrimeToF, GEOMETRY_EPSILON_CM);
    const collinearityErrorCm =
        Math.abs(
            (F.x - frontPiece.points.MPrime.x) * (FPrime.y - frontPiece.points.MPrime.y) -
                (F.y - frontPiece.points.MPrime.y) * (FPrime.x - frontPiece.points.MPrime.x),
        ) / centreLineLength;
    const fPrimeDirectionPass =
        collinearityErrorCm <= VALIDATION_TOLERANCE_CM &&
        Math.abs(outwardDistanceDeltaCm - parameters.fPrimeOffsetCm) <= VALIDATION_TOLERANCE_CM &&
        (parameters.fPrimeOffsetCm <= GEOMETRY_EPSILON_CM || mPrimeToFPrime > mPrimeToF);

    return {
        geometry: {
            F,
            FPrime,
            U,
            T,
            anchorPoints,
            sampledCurve,
            curveLengthCm,
            referenceLengthCm: footPiece.rqpsArcLengthCm,
            targetLengthMinCm,
            targetLengthMaxCm,
            pqLengthCm: utResult.geometry.pqLengthCm,
            extraLengthCm: utResult.geometry.extraLengthCm,
            upLengthCm: utResult.geometry.upLengthCm,
            qtLengthCm: utResult.geometry.qtLengthCm,
            ffPrimeDistanceCm,
            parameters: { ...parameters },
            checks: {
                utLength: createDistanceCheck('luf-UT', 'UT = a', U, T, a),
                fPrimeDirection: {
                    outwardDistanceDeltaCm,
                    expectedOffsetCm: parameters.fPrimeOffsetCm,
                    collinearityErrorCm,
                    toleranceCm: VALIDATION_TOLERANCE_CM,
                    pass: fPrimeDirectionPass,
                },
                curveLength: {
                    actual: curveLengthCm,
                    minimum: targetLengthMinCm,
                    maximum: targetLengthMaxCm,
                    tolerance: VALIDATION_TOLERANCE_CM,
                    pass:
                        curveLengthCm >= targetLengthMinCm - VALIDATION_TOLERANCE_CM &&
                        curveLengthCm <= targetLengthMaxCm + VALIDATION_TOLERANCE_CM,
                },
                outsideReference: {
                    outsidePointCount,
                    insidePointCount,
                    boundaryPointCount,
                    totalPointCount: sampledCurve.length,
                    pass: outsidePointCount === sampledCurve.length,
                },
                noIntersection: {
                    intersectionCount,
                    pass: intersectionCount === 0,
                },
            },
        },
        errors: [],
    };
}
