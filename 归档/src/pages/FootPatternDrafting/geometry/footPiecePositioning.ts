import type {
    AlignedFootPieceGeometry,
    DraftPoint,
    FootPieceFSelection,
    FootPieceLandmarks,
    FootPiecePositioningGeometry,
    FootPieceSample,
    FrontPieceGeometry,
    GeometryBuildResult,
} from '../types';
import { polylineLength } from './curveUtils';
import { extractRQPSArc, midpoint } from './footPiece';
import { distance, GEOMETRY_EPSILON_CM, VALIDATION_TOLERANCE_CM } from './geometryUtils';

export const FOOT_PIECE_PERPENDICULAR_DOT_TOLERANCE = 1e-7;

export interface ReferenceArcQP {
    points: DraftPoint[];
    rqpsStartIndex: number;
    rqpsEndIndex: number;
}

export interface FootPieceFSelectionCandidate {
    selection: FootPieceFSelection;
    point: DraftPoint;
    distanceCm: number;
}

interface UnitDirection {
    x: number;
    y: number;
}

function clonePoints(points: DraftPoint[]): DraftPoint[] {
    return points.map((point) => ({ ...point }));
}

function getUniqueLandmarkIndex(points: DraftPoint[], landmarkId: 'Q' | 'P'): number | undefined {
    const indices = points.reduce<number[]>((matches, point, index) => {
        if (point.id === landmarkId) {
            matches.push(index);
        }
        return matches;
    }, []);

    return indices.length === 1 ? indices[0] : undefined;
}

export function extractReferenceArcQP(
    orderedRQPS: DraftPoint[],
): GeometryBuildResult<ReferenceArcQP> {
    const qIndex = getUniqueLandmarkIndex(orderedRQPS, 'Q');
    const pIndex = getUniqueLandmarkIndex(orderedRQPS, 'P');

    if (qIndex === undefined || pIndex === undefined || qIndex >= pIndex) {
        return {
            errors: [
                {
                    code: 'FOOT_PIECE_QP_ARC_NOT_FOUND',
                    message:
                        'The ordered RQPS reference must contain one Q followed by one P to define the selectable toe arc.',
                },
            ],
        };
    }

    const points = clonePoints(orderedRQPS.slice(qIndex, pIndex + 1));
    if (points.length < 2) {
        return {
            errors: [
                {
                    code: 'FOOT_PIECE_QP_ARC_TOO_SHORT',
                    message: 'The selectable Q-to-P toe arc must contain at least one segment.',
                },
            ],
        };
    }

    return {
        geometry: {
            points,
            rqpsStartIndex: qIndex,
            rqpsEndIndex: pIndex,
        },
        errors: [],
    };
}

export function extractSourceReferenceArcQP(
    footPiece: FootPieceSample,
): GeometryBuildResult<ReferenceArcQP> {
    const rqpsResult = extractRQPSArc(footPiece.shrinkedOutline, footPiece.landmarkIndices);
    if (!rqpsResult.geometry) {
        return { errors: rqpsResult.errors };
    }

    const sourceRQPS = clonePoints(rqpsResult.geometry.points);
    (['Q', 'P'] as const).forEach((landmarkId) => {
        const outlineIndex = footPiece.landmarkIndices[landmarkId];
        const rqpsIndex = rqpsResult.geometry!.outlineIndices.indexOf(outlineIndex);
        sourceRQPS[rqpsIndex] = { ...footPiece.landmarks[landmarkId] };
    });

    return extractReferenceArcQP(sourceRQPS);
}

export function isFootPieceFSelectionValid(
    selection: FootPieceFSelection,
    qpArc: DraftPoint[],
): boolean {
    return (
        Number.isInteger(selection.segmentIndex) &&
        selection.segmentIndex >= 0 &&
        selection.segmentIndex < qpArc.length - 1 &&
        Number.isFinite(selection.segmentT) &&
        selection.segmentT >= 0 &&
        selection.segmentT <= 1
    );
}

export function pointAtFootPieceFSelection(
    qpArc: DraftPoint[],
    selection: FootPieceFSelection,
    id = 'F',
): DraftPoint | undefined {
    if (!isFootPieceFSelectionValid(selection, qpArc)) {
        return undefined;
    }

    const start = qpArc[selection.segmentIndex];
    const end = qpArc[selection.segmentIndex + 1];

    return {
        id,
        x: start.x + (end.x - start.x) * selection.segmentT,
        y: start.y + (end.y - start.y) * selection.segmentT,
    };
}

export function nearestFootPieceFSelection(
    point: DraftPoint,
    qpArc: DraftPoint[],
): FootPieceFSelectionCandidate | undefined {
    if (qpArc.length < 2 || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
        return undefined;
    }

    let nearest: FootPieceFSelectionCandidate | undefined;

    for (let segmentIndex = 0; segmentIndex < qpArc.length - 1; segmentIndex += 1) {
        const start = qpArc[segmentIndex];
        const end = qpArc[segmentIndex + 1];
        const segmentX = end.x - start.x;
        const segmentY = end.y - start.y;
        const segmentLengthSquared = segmentX ** 2 + segmentY ** 2;
        if (segmentLengthSquared <= GEOMETRY_EPSILON_CM ** 2) {
            continue;
        }

        const rawT =
            ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) /
            segmentLengthSquared;
        const segmentT = Math.max(0, Math.min(1, rawT));
        const candidateSelection = { segmentIndex, segmentT };
        const candidatePoint = pointAtFootPieceFSelection(qpArc, candidateSelection, 'F hover')!;
        const distanceCm = distance(point, candidatePoint);

        if (!nearest || distanceCm < nearest.distanceCm - GEOMETRY_EPSILON_CM) {
            nearest = {
                selection: candidateSelection,
                point: candidatePoint,
                distanceCm,
            };
        }
    }

    return nearest;
}

function normalizedDirection(start: DraftPoint, end: DraftPoint): UnitDirection | undefined {
    const length = distance(start, end);
    if (length <= GEOMETRY_EPSILON_CM) {
        return undefined;
    }

    return {
        x: (end.x - start.x) / length,
        y: (end.y - start.y) / length,
    };
}

function dot(vectorA: UnitDirection, vectorB: UnitDirection): number {
    return vectorA.x * vectorB.x + vectorA.y * vectorB.y;
}

function pointOffset(point: DraftPoint, origin: DraftPoint): UnitDirection {
    return {
        x: point.x - origin.x,
        y: point.y - origin.y,
    };
}

function pointToDirectedLineDistance(
    point: DraftPoint,
    lineOrigin: DraftPoint,
    lineDirection: UnitDirection,
): number {
    const offset = pointOffset(point, lineOrigin);
    return Math.abs(lineDirection.x * offset.y - lineDirection.y * offset.x);
}

function translatePoint(point: DraftPoint, translation: UnitDirection, id = point.id): DraftPoint {
    return {
        id,
        x: point.x + translation.x,
        y: point.y + translation.y,
    };
}

function translatePoints(points: DraftPoint[], translation: UnitDirection): DraftPoint[] {
    return points.map((point) => translatePoint(point, translation));
}

function translateLandmarks(
    landmarks: FootPieceLandmarks,
    translation: UnitDirection,
): FootPieceLandmarks {
    return {
        P: translatePoint(landmarks.P, translation),
        Q: translatePoint(landmarks.Q, translation),
        R: translatePoint(landmarks.R, translation),
        S: translatePoint(landmarks.S, translation),
    };
}

function insertFIntoRQPS(
    alignedRQPS: DraftPoint[],
    qpArc: ReferenceArcQP,
    selection: FootPieceFSelection,
    F: DraftPoint,
): DraftPoint[] {
    const insertAfterIndex = qpArc.rqpsStartIndex + selection.segmentIndex;
    return [
        ...clonePoints(alignedRQPS.slice(0, insertAfterIndex + 1)),
        { ...F },
        ...clonePoints(alignedRQPS.slice(insertAfterIndex + 1)),
    ];
}

function createPositioningChecks(
    footPiece: AlignedFootPieceGeometry,
    frontPiece: FrontPieceGeometry,
    alignedQPArc: DraftPoint[],
    selection: FootPieceFSelection | undefined,
    sourceF: DraftPoint | undefined,
    currentF: DraftPoint | undefined,
    gDirection: UnitDirection,
) {
    const { MPrime } = frontPiece.points;
    const rLineDistanceCm = pointToDirectedLineDistance(
        footPiece.alignedLandmarks.R,
        MPrime,
        gDirection,
    );
    const sLineDistanceCm = pointToDirectedLineDistance(
        footPiece.alignedLandmarks.S,
        MPrime,
        gDirection,
    );
    const fOffset = currentF ? pointOffset(currentF, MPrime) : undefined;
    const fDistance = currentF ? distance(MPrime, currentF) : 0;
    const absoluteNormalizedDot =
        fOffset && fDistance > GEOMETRY_EPSILON_CM
            ? Math.abs(dot({ x: fOffset.x / fDistance, y: fOffset.y / fDistance }, gDirection))
            : Number.POSITIVE_INFINITY;
    const centreLineErrorCm = fOffset
        ? Math.abs(dot(fOffset, gDirection))
        : Number.POSITIVE_INFINITY;
    const identityPoint =
        selection && currentF
            ? pointAtFootPieceFSelection(alignedQPArc, selection, 'F identity check')
            : undefined;
    const identityDistanceCm =
        identityPoint && currentF ? distance(identityPoint, currentF) : Number.POSITIVE_INFINITY;

    return {
        fSelected: {
            pass: Boolean(selection && sourceF),
        },
        rsInlineWithMPrimeG: {
            rLineDistanceCm,
            sLineDistanceCm,
            toleranceCm: VALIDATION_TOLERANCE_CM,
            pass:
                rLineDistanceCm <= VALIDATION_TOLERANCE_CM &&
                sLineDistanceCm <= VALIDATION_TOLERANCE_CM,
        },
        mPrimeFPerpendicular: {
            absoluteNormalizedDot,
            tolerance: FOOT_PIECE_PERPENDICULAR_DOT_TOLERANCE,
            pass: absoluteNormalizedDot <= FOOT_PIECE_PERPENDICULAR_DOT_TOLERANCE,
        },
        fOnCentreLine: {
            lineErrorCm: centreLineErrorCm,
            toleranceCm: VALIDATION_TOLERANCE_CM,
            pass: centreLineErrorCm <= VALIDATION_TOLERANCE_CM,
        },
        sourceIdentityPreserved: {
            alignedDistanceCm: identityDistanceCm,
            toleranceCm: VALIDATION_TOLERANCE_CM,
            pass: identityDistanceCm <= VALIDATION_TOLERANCE_CM,
        },
    };
}

export function positionFootPieceWithSelectedF(
    sample: FootPieceSample,
    provisionalFootPiece: AlignedFootPieceGeometry,
    frontPiece: FrontPieceGeometry,
    selection?: FootPieceFSelection,
    confirmed = false,
): GeometryBuildResult<FootPiecePositioningGeometry> {
    const sourceQPResult = extractSourceReferenceArcQP(sample);
    const alignedQPResult = extractReferenceArcQP(provisionalFootPiece.alignedRQPS);
    if (!sourceQPResult.geometry || !alignedQPResult.geometry) {
        return { errors: [...sourceQPResult.errors, ...alignedQPResult.errors] };
    }

    if (selection && !isFootPieceFSelectionValid(selection, sourceQPResult.geometry.points)) {
        return {
            errors: [
                {
                    code: 'FOOT_PIECE_F_SELECTION_OUTSIDE_QP',
                    message:
                        'F selection must identify a segment and t value on the Q-to-P toe arc.',
                },
            ],
        };
    }

    if (confirmed && !selection) {
        return {
            errors: [
                {
                    code: 'FOOT_PIECE_F_SELECTION_REQUIRED',
                    message:
                        'Confirming final foot-piece positioning requires a Q-to-P F selection.',
                },
            ],
        };
    }

    const gDirection = normalizedDirection(frontPiece.points.MPrime, frontPiece.points.G);
    if (!gDirection) {
        return {
            errors: [
                {
                    code: 'FOOT_PIECE_POSITIONING_G_DIRECTION_INVALID',
                    message: "M' and G must define a non-zero positioning direction.",
                },
            ],
        };
    }
    const centreDirection = { x: -gDirection.y, y: gDirection.x };
    const sourceF = selection
        ? pointAtFootPieceFSelection(sourceQPResult.geometry.points, selection, 'F source')
        : undefined;
    const provisionalF = selection
        ? pointAtFootPieceFSelection(alignedQPResult.geometry.points, selection, 'F provisional')
        : undefined;

    let currentFootPiece = provisionalFootPiece;
    let currentQPArc = alignedQPResult.geometry.points;
    let currentF = provisionalF;
    let translationVectorCm: UnitDirection | undefined;

    if (confirmed && selection && provisionalF) {
        const fOffset = pointOffset(provisionalF, frontPiece.points.MPrime);
        const slideDistanceCm = -dot(fOffset, gDirection);
        translationVectorCm = {
            x: gDirection.x * slideDistanceCm,
            y: gDirection.y * slideDistanceCm,
        };
        const alignedLandmarks = translateLandmarks(
            provisionalFootPiece.alignedLandmarks,
            translationVectorCm,
        );
        const alignedRQPS = translatePoints(provisionalFootPiece.alignedRQPS, translationVectorCm);
        const alignedRsMidpoint = midpoint(alignedLandmarks.R, alignedLandmarks.S, 'RS midpoint');
        const midpointDistanceCm = distance(alignedRsMidpoint, frontPiece.points.MPrime);

        currentFootPiece = {
            ...provisionalFootPiece,
            alignedShrinkedOutline: translatePoints(
                provisionalFootPiece.alignedShrinkedOutline,
                translationVectorCm,
            ),
            alignedLandmarks,
            alignedRQPS,
            alignedRsMidpoint,
            rqpsArcLengthCm: polylineLength(alignedRQPS),
            checks: {
                ...provisionalFootPiece.checks,
                midpointToMPrime: {
                    distanceCm: midpointDistanceCm,
                    toleranceCm: VALIDATION_TOLERANCE_CM,
                    pass: midpointDistanceCm <= VALIDATION_TOLERANCE_CM,
                },
            },
        };
        currentQPArc = translatePoints(alignedQPResult.geometry.points, translationVectorCm);
        currentF = translatePoint(provisionalF, translationVectorCm, 'F');
    }

    const checks = createPositioningChecks(
        currentFootPiece,
        frontPiece,
        currentQPArc,
        selection,
        sourceF,
        currentF,
        gDirection,
    );
    const positioningIsValid =
        confirmed &&
        checks.fSelected.pass &&
        checks.rsInlineWithMPrimeG.pass &&
        currentFootPiece.checks.orientation.pass &&
        checks.mPrimeFPerpendicular.pass &&
        checks.fOnCentreLine.pass &&
        checks.sourceIdentityPreserved.pass;
    const currentQPMetadata = extractReferenceArcQP(currentFootPiece.alignedRQPS).geometry!;
    const alignedRQFPS =
        selection && currentF
            ? insertFIntoRQPS(currentFootPiece.alignedRQPS, currentQPMetadata, selection, currentF)
            : undefined;

    return {
        geometry: {
            ...currentFootPiece,
            alignedQPArc: currentQPArc,
            alignedRQFPS,
            positioning: {
                status: positioningIsValid ? 'VALID' : 'PROVISIONAL',
                alignmentMode: positioningIsValid
                    ? 'f-centre-line-final'
                    : 'legacy-rs-midpoint-to-mprime',
                selectionState: confirmed ? 'confirmed' : selection ? 'selected' : 'none',
                selection: selection ? { ...selection } : undefined,
                sourceF,
                provisionalF,
                alignedF: confirmed ? currentF : undefined,
                translationVectorCm,
                gDirection,
                centreDirection,
                checks,
            },
        },
        errors:
            positioningIsValid || !confirmed
                ? []
                : [
                      {
                          code: 'FOOT_PIECE_FINAL_POSITIONING_INVALID',
                          message:
                              "Confirmed F did not satisfy every RS/M'G and M'F positioning check.",
                      },
                  ],
    };
}
