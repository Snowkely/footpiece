import type {
    AlignedFootPieceGeometry,
    DraftPoint,
    FootPieceLandmarkId,
    FootPieceLandmarks,
    FootPieceSample,
    FrontPieceGeometry,
    GeometryBuildResult,
} from '../types';
import { distance, GEOMETRY_EPSILON_CM, VALIDATION_TOLERANCE_CM } from './geometryUtils';

export const FOOT_PIECE_ALIGNMENT_MODE = 'rs-midpoint-to-mprime' as const;
export const FOOT_PIECE_ORIENTATION_TOLERANCE_RADIANS = 1e-7;

export interface FootPieceTransform {
    scale: number;
    rotationRadians: number;
    sourceOrigin: DraftPoint;
    targetOrigin: DraftPoint;
}

export interface RqpsArcExtraction {
    points: DraftPoint[];
    direction: 'forward' | 'reverse';
    outlineIndices: number[];
}

function normalizeAngleRadians(angle: number): number {
    return Math.atan2(Math.sin(angle), Math.cos(angle));
}

export function midpoint(pointA: DraftPoint, pointB: DraftPoint, id = 'midpoint'): DraftPoint {
    return {
        id,
        x: (pointA.x + pointB.x) / 2,
        y: (pointA.y + pointB.y) / 2,
    };
}

export function polylineLength(points: DraftPoint[]): number {
    let length = 0;
    for (let index = 1; index < points.length; index += 1) {
        length += distance(points[index - 1], points[index]);
    }
    return length;
}

export function transformPoint(point: DraftPoint, transform: FootPieceTransform): DraftPoint {
    const translatedX = (point.x - transform.sourceOrigin.x) * transform.scale;
    const translatedY = (point.y - transform.sourceOrigin.y) * transform.scale;
    const cosine = Math.cos(transform.rotationRadians);
    const sine = Math.sin(transform.rotationRadians);

    return {
        id: point.id,
        x: transform.targetOrigin.x + translatedX * cosine - translatedY * sine,
        y: transform.targetOrigin.y + translatedX * sine + translatedY * cosine,
    };
}

export function transformPoints(points: DraftPoint[], transform: FootPieceTransform): DraftPoint[] {
    return points.map((point) => transformPoint(point, transform));
}

function cyclicPathIndices(
    pointCount: number,
    startIndex: number,
    endIndex: number,
    step: 1 | -1,
): number[] {
    const indices = [startIndex];
    let index = startIndex;

    while (index !== endIndex && indices.length <= pointCount) {
        index = (index + step + pointCount) % pointCount;
        indices.push(index);
    }

    return indices;
}

export function extractRQPSArc(
    sampledClosedOutline: DraftPoint[],
    landmarkIndices: Record<FootPieceLandmarkId, number>,
): GeometryBuildResult<RqpsArcExtraction> {
    const pointCount = sampledClosedOutline.length;
    if (pointCount < 4) {
        return {
            errors: [
                {
                    code: 'FOOT_PIECE_OUTLINE_TOO_SHORT',
                    message: 'A closed foot-piece outline requires at least four sampled points.',
                },
            ],
        };
    }

    const orderedLandmarkIds: FootPieceLandmarkId[] = ['R', 'Q', 'P', 'S'];
    const indices = orderedLandmarkIds.map((landmarkId) => landmarkIndices[landmarkId]);
    if (
        indices.some(
            (index) =>
                !Number.isInteger(index) || index < 0 || index >= sampledClosedOutline.length,
        ) ||
        new Set(indices).size !== indices.length
    ) {
        return {
            errors: [
                {
                    code: 'FOOT_PIECE_LANDMARK_INDICES_INVALID',
                    message: 'P/Q/R/S must map to four distinct valid sampled-outline indices.',
                },
            ],
        };
    }

    const candidates = ([1, -1] as const).map((step) => {
        const outlineIndices = cyclicPathIndices(
            pointCount,
            landmarkIndices.R,
            landmarkIndices.S,
            step,
        );
        const qPosition = outlineIndices.indexOf(landmarkIndices.Q);
        const pPosition = outlineIndices.indexOf(landmarkIndices.P);
        const includesOrderedRQPS =
            qPosition > 0 && pPosition > qPosition && pPosition < outlineIndices.length - 1;

        return {
            direction: step === 1 ? ('forward' as const) : ('reverse' as const),
            outlineIndices,
            includesOrderedRQPS,
        };
    });

    const validCandidates = candidates.filter((candidate) => candidate.includesOrderedRQPS);
    if (validCandidates.length !== 1) {
        return {
            errors: [
                {
                    code: 'FOOT_PIECE_RQPS_ARC_AMBIGUOUS',
                    message:
                        validCandidates.length === 0
                            ? 'Neither R-to-S outline path contains Q then P in R-Q-P-S order.'
                            : 'Both R-to-S outline paths contain Q then P; the RQPS arc is ambiguous.',
                },
            ],
        };
    }

    const selected = validCandidates[0];
    return {
        geometry: {
            direction: selected.direction,
            outlineIndices: selected.outlineIndices,
            points: selected.outlineIndices.map((index) => sampledClosedOutline[index]),
        },
        errors: [],
    };
}

export function extractHeelArcRS(
    sampledClosedOutline: DraftPoint[],
    landmarkIndices: Record<FootPieceLandmarkId, number>,
): GeometryBuildResult<RqpsArcExtraction> {
    const rqpsResult = extractRQPSArc(
        sampledClosedOutline,
        landmarkIndices,
    );

    if (!rqpsResult.geometry) {
        return {
            errors: rqpsResult.errors,
        };
    }

    const oppositeStep =
        rqpsResult.geometry.direction === 'forward'
            ? -1
            : 1;

    const outlineIndices = cyclicPathIndices(
        sampledClosedOutline.length,
        landmarkIndices.R,
        landmarkIndices.S,
        oppositeStep,
    );

    return {
        geometry: {
            direction:
                oppositeStep === 1
                    ? 'forward'
                    : 'reverse',

            outlineIndices,

            points: outlineIndices.map(
                (index) =>
                    sampledClosedOutline[index],
            ),
        },
        errors: [],
    };
}

function transformLandmarks(
    landmarks: FootPieceLandmarks,
    transform: FootPieceTransform,
): FootPieceLandmarks {
    return {
        P: transformPoint(landmarks.P, transform),
        Q: transformPoint(landmarks.Q, transform),
        R: transformPoint(landmarks.R, transform),
        S: transformPoint(landmarks.S, transform),
    };
}

export function alignFootPieceToFrontPiece(
    footPiece: FootPieceSample,
    frontPiece: FrontPieceGeometry,
    r: number,
): GeometryBuildResult<AlignedFootPieceGeometry> {
    if (!Number.isFinite(r) || r <= GEOMETRY_EPSILON_CM) {
        return {
            errors: [
                {
                    code: 'FOOT_PIECE_TARGET_R_INVALID',
                    message:
                        'Foot-piece alignment requires temporary r to be greater than zero cm.',
                },
            ],
        };
    }

    const rawRsChordLength = distance(footPiece.landmarks.R, footPiece.landmarks.S);
    if (!Number.isFinite(rawRsChordLength) || rawRsChordLength <= GEOMETRY_EPSILON_CM) {
        return {
            errors: [
                {
                    code: 'FOOT_PIECE_RAW_RS_INVALID',
                    message: 'DXF landmarks R and S must define a non-zero finite raw RS length.',
                },
            ],
        };
    }

    const invalidSnap = (['P', 'Q', 'R', 'S'] as FootPieceLandmarkId[]).find(
        (landmarkId) =>
            !Number.isFinite(footPiece.snapDistancesRaw[landmarkId]) ||
            footPiece.snapDistancesRaw[landmarkId] > footPiece.snapToleranceRaw,
    );
    if (invalidSnap) {
        return {
            errors: [
                {
                    code: 'FOOT_PIECE_LANDMARK_SNAP_INVALID',
                    message: `LANDMARK_${invalidSnap} is farther from the sampled shrinked outline than the fixture snap tolerance.`,
                },
            ],
        };
    }

    const rqpsResult = extractRQPSArc(footPiece.shrinkedOutline, footPiece.landmarkIndices);
    if (!rqpsResult.geometry) {
        return { errors: rqpsResult.errors };
    }

    const heelArcResult = extractHeelArcRS(
        footPiece.shrinkedOutline,
        footPiece.landmarkIndices,
    );

    if (!heelArcResult.geometry) {
        return {
            errors: heelArcResult.errors,
        };
    }
    const rawHeelArcPoints =
    heelArcResult.geometry.points.map(
        (point) => ({ ...point }),
    );
    rawHeelArcPoints[0] = {
        ...footPiece.landmarks.R,
    };

    rawHeelArcPoints[
        rawHeelArcPoints.length - 1
    ] = {
        ...footPiece.landmarks.S,
    };

    const rawHeelArcLength =
    polylineLength(
        rawHeelArcPoints,
    );
    if (
        !Number.isFinite(rawHeelArcLength) ||
        rawHeelArcLength <= GEOMETRY_EPSILON_CM
    ) {
        return {
            errors: [
                {
                    code:
                        'FOOT_PIECE_HEEL_ARC_INVALID',

                    message:
                        'The R-to-S heel arc must have a non-zero finite length.',
                },
            ],
        };
    }
    const sourceMidpoint = midpoint(
        footPiece.landmarks.R,
        footPiece.landmarks.S,
        'raw-RS-midpoint',
    );
    const targetMPrime = { ...frontPiece.points.MPrime, id: "M'" };
    const sourceAngle = Math.atan2(
        footPiece.landmarks.R.y - footPiece.landmarks.S.y,
        footPiece.landmarks.R.x - footPiece.landmarks.S.x,
    );
    const targetVectorX = frontPiece.points.G.x - frontPiece.points.MPrime.x;
    const targetVectorY = frontPiece.points.G.y - frontPiece.points.MPrime.y;
    if (Math.hypot(targetVectorX, targetVectorY) <= GEOMETRY_EPSILON_CM) {
        return {
            errors: [
                {
                    code: 'FOOT_PIECE_TARGET_DIRECTION_INVALID',
                    message: "Front Piece M' and G must define a non-zero alignment direction.",
                },
            ],
        };
    }

    const targetAngle = Math.atan2(targetVectorY, targetVectorX);
    const scaleToCm = r / rawHeelArcLength;
    const rotationRadians = normalizeAngleRadians(targetAngle - sourceAngle);
    const transform: FootPieceTransform = {
        scale: scaleToCm,
        rotationRadians,
        sourceOrigin: sourceMidpoint,
        targetOrigin: targetMPrime,
    };
    const alignedLandmarks = transformLandmarks(footPiece.landmarks, transform);
    const alignedShrinkedOutline = transformPoints(footPiece.shrinkedOutline, transform);
    const alignedRQPS = transformPoints(rqpsResult.geometry.points, transform);
    // Preserve the dense sampled curve while making its four semantic nodes exact.
    // Path selection still comes exclusively from the nearest sampled landmark indices.
    (['R', 'Q', 'P', 'S'] as FootPieceLandmarkId[]).forEach((landmarkId) => {
        const outlineIndex = footPiece.landmarkIndices[landmarkId];
        const arcIndex = rqpsResult.geometry!.outlineIndices.indexOf(outlineIndex);
        alignedRQPS[arcIndex] = { ...alignedLandmarks[landmarkId] };
    });
    const alignedRsMidpoint = midpoint(alignedLandmarks.R, alignedLandmarks.S, 'RS midpoint');
    const midpointDistanceCm = distance(alignedRsMidpoint, targetMPrime);
    const alignedSourceAngle = Math.atan2(
        alignedLandmarks.R.y - alignedLandmarks.S.y,
        alignedLandmarks.R.x - alignedLandmarks.S.x,
    );
    const angleErrorRadians = Math.abs(normalizeAngleRadians(alignedSourceAngle - targetAngle));

    return {
        geometry: {
            alignmentAssumption: FOOT_PIECE_ALIGNMENT_MODE,
            rawRsChordLength,
            rawHeelArcLength,
            heelArcPointCount: rawHeelArcPoints.length,
            targetR: r,
            scaleToCm,
            rotationRadians,
            alignedShrinkedOutline,
            alignedLandmarks,
            alignedRQPS,
            alignedRsMidpoint,
            targetMPrime,
            rqpsArcLengthCm: polylineLength(alignedRQPS),
            rqpsPointCount: alignedRQPS.length,
            checks: {
                midpointToMPrime: {
                    distanceCm: midpointDistanceCm,
                    toleranceCm: VALIDATION_TOLERANCE_CM,
                    pass: midpointDistanceCm <= VALIDATION_TOLERANCE_CM,
                },
                orientation: {
                    angleErrorRadians,
                    toleranceRadians: FOOT_PIECE_ORIENTATION_TOLERANCE_RADIANS,
                    pass: angleErrorRadians <= FOOT_PIECE_ORIENTATION_TOLERANCE_RADIANS,
                },
            },
        },
        errors: [],
    };
}
