import type {
    AlignedFootPieceGeometry,
    DraftPoint,
    DraftVector2,
    FrontPieceGeometry,
    GeometryBuildResult,
    RayOutlineIntersection,
    TargetAnkleIntersectionGeometry,
} from '../types';
import { normalizeVector, raySegmentIntersection } from './footAxis';
import { distance, VALIDATION_TOLERANCE_CM } from './geometryUtils';

export const TARGET_ANKLE_SIDE_TOLERANCE_CM = VALIDATION_TOLERANCE_CM;
const RAY_INTERSECTION_DEDUPLICATION_TOLERANCE_CM = 1e-7;

function vectorBetween(start: DraftPoint, end: DraftPoint): DraftVector2 {
    return { x: end.x - start.x, y: end.y - start.y };
}

function dot(first: DraftVector2, second: DraftVector2): number {
    return first.x * second.x + first.y * second.y;
}

function cross(first: DraftVector2, second: DraftVector2): number {
    return first.x * second.y - first.y * second.x;
}

function pointToLineDistance(
    point: DraftPoint,
    lineOrigin: DraftPoint,
    normalizedLineDirection: DraftVector2,
): number {
    return Math.abs(cross(vectorBetween(lineOrigin, point), normalizedLineDirection));
}

export function pointAtClosedPolylineIdentity(
    closedOutline: DraftPoint[],
    segmentIndex: number,
    segmentT: number,
    id = 'closed-polyline-point',
): DraftPoint | undefined {
    if (
        closedOutline.length < 3 ||
        !Number.isInteger(segmentIndex) ||
        segmentIndex < 0 ||
        segmentIndex >= closedOutline.length ||
        !Number.isFinite(segmentT) ||
        segmentT < 0 ||
        segmentT > 1
    ) {
        return undefined;
    }

    const start = closedOutline[segmentIndex];
    const end = closedOutline[(segmentIndex + 1) % closedOutline.length];
    return {
        id,
        x: start.x + (end.x - start.x) * segmentT,
        y: start.y + (end.y - start.y) * segmentT,
    };
}

export function intersectRayWithClosedPolyline(
    origin: DraftPoint,
    direction: DraftVector2,
    closedOutline: DraftPoint[],
): RayOutlineIntersection[] {
    const normalizedDirection = normalizeVector(direction);
    if (!normalizedDirection || closedOutline.length < 3) {
        return [];
    }

    const intersections = closedOutline
        .map((segmentStart, outlineSegmentIndex) => {
            const segmentEnd = closedOutline[(outlineSegmentIndex + 1) % closedOutline.length];
            const intersection = raySegmentIntersection(
                origin,
                normalizedDirection,
                segmentStart,
                segmentEnd,
            );
            if (!intersection) {
                return undefined;
            }

            return {
                point: {
                    ...intersection.point,
                    id: `outline-intersection-${outlineSegmentIndex}`,
                },
                rayT: intersection.rayT,
                outlineSegmentIndex,
                outlineSegmentT: intersection.segmentT,
            };
        })
        .filter((intersection): intersection is RayOutlineIntersection => Boolean(intersection))
        .sort(
            (first, second) =>
                first.rayT - second.rayT || first.outlineSegmentIndex - second.outlineSegmentIndex,
        );

    // A ray through a sampled vertex is reported by both adjacent segments. Preserve one
    // deterministic outline identity without treating that shared vertex as two intersections.
    return intersections.filter(
        (intersection, index) =>
            index === 0 ||
            Math.abs(intersection.rayT - intersections[index - 1].rayT) >
                RAY_INTERSECTION_DEDUPLICATION_TOLERANCE_CM,
    );
}

export function deriveTargetAnkleIntersections(
    alignedFootPiece: AlignedFootPieceGeometry,
    frontPiece: FrontPieceGeometry,
): GeometryBuildResult<TargetAnkleIntersectionGeometry> {
    const MPrime = frontPiece.points.MPrime;
    const targetDirection = normalizeVector(vectorBetween(MPrime, frontPiece.points.G));
    if (!targetDirection) {
        return {
            errors: [
                {
                    code: 'TARGET_ANKLE_DIRECTION_INVALID',
                    message: "Front Piece M' and G must define a finite non-zero direction.",
                },
            ],
        };
    }

    const originalRProjection = dot(
        vectorBetween(MPrime, alignedFootPiece.alignedLandmarks.R),
        targetDirection,
    );
    const originalSProjection = dot(
        vectorBetween(MPrime, alignedFootPiece.alignedLandmarks.S),
        targetDirection,
    );
    const rIsPositive = originalRProjection > TARGET_ANKLE_SIDE_TOLERANCE_CM;
    const rIsNegative = originalRProjection < -TARGET_ANKLE_SIDE_TOLERANCE_CM;
    const sIsPositive = originalSProjection > TARGET_ANKLE_SIDE_TOLERANCE_CM;
    const sIsNegative = originalSProjection < -TARGET_ANKLE_SIDE_TOLERANCE_CM;
    if (!((rIsPositive && sIsNegative) || (rIsNegative && sIsPositive))) {
        return {
            errors: [
                {
                    code: 'SOURCE_RS_SIDE_AMBIGUOUS',
                    message: `Aligned source R/S do not occupy distinct target M'G sides: R projection ${originalRProjection.toFixed(
                        6,
                    )} cm, S projection ${originalSProjection.toFixed(6)} cm.`,
                },
            ],
        };
    }

    const positiveIntersections = intersectRayWithClosedPolyline(
        MPrime,
        targetDirection,
        alignedFootPiece.alignedShrinkedOutline,
    );
    const negativeDirection = { x: -targetDirection.x, y: -targetDirection.y };
    const negativeIntersections = intersectRayWithClosedPolyline(
        MPrime,
        negativeDirection,
        alignedFootPiece.alignedShrinkedOutline,
    );
    const intersectionErrors = [];
    if (!positiveIntersections.length) {
        intersectionErrors.push({
            code: 'TARGET_ANKLE_POSITIVE_INTERSECTION_NOT_FOUND',
            message: "The positive M'G ray does not intersect the aligned closed outline.",
        });
    }
    if (!negativeIntersections.length) {
        intersectionErrors.push({
            code: 'TARGET_ANKLE_NEGATIVE_INTERSECTION_NOT_FOUND',
            message: "The negative M'G ray does not intersect the aligned closed outline.",
        });
    }
    if (intersectionErrors.length) {
        return { errors: intersectionErrors };
    }

    const positiveIntersection = positiveIntersections[0];
    const negativeIntersection = negativeIntersections[0];
    const rIntersection = rIsPositive ? positiveIntersection : negativeIntersection;
    const sIntersection = sIsPositive ? positiveIntersection : negativeIntersection;
    const RStar = { ...rIntersection.point, id: 'R*' };
    const SStar = { ...sIntersection.point, id: 'S*' };
    const ankleSpan = distance(RStar, SStar);
    if (ankleSpan <= VALIDATION_TOLERANCE_CM) {
        return {
            errors: [
                {
                    code: 'TARGET_ANKLE_INTERSECTIONS_DEGENERATE',
                    message: "Target R* and S* intersections are coincident or too close to M'.",
                },
            ],
        };
    }

    const rStarLineDistanceCm = pointToLineDistance(RStar, MPrime, targetDirection);
    const sStarLineDistanceCm = pointToLineDistance(SStar, MPrime, targetDirection);
    if (
        rStarLineDistanceCm > VALIDATION_TOLERANCE_CM ||
        sStarLineDistanceCm > VALIDATION_TOLERANCE_CM
    ) {
        return {
            errors: [
                {
                    code: 'TARGET_ANKLE_COLLINEARITY_FAILED',
                    message: "Target R*/S* must lie on the infinite Front Piece M'G line.",
                },
            ],
        };
    }

    const mPrimeToRStar = distance(MPrime, RStar);
    const mPrimeToSStar = distance(MPrime, SStar);
    const spanDecompositionErrorCm = Math.abs(ankleSpan - (mPrimeToRStar + mPrimeToSStar));
    if (spanDecompositionErrorCm > VALIDATION_TOLERANCE_CM) {
        return {
            errors: [
                {
                    code: 'TARGET_ANKLE_SPAN_DECOMPOSITION_FAILED',
                    message: "M' must lie between target R* and S* on their shared line.",
                },
            ],
        };
    }

    const reconstructedRStar = pointAtClosedPolylineIdentity(
        alignedFootPiece.alignedShrinkedOutline,
        rIntersection.outlineSegmentIndex,
        rIntersection.outlineSegmentT,
        'R* reconstructed',
    );
    const reconstructedSStar = pointAtClosedPolylineIdentity(
        alignedFootPiece.alignedShrinkedOutline,
        sIntersection.outlineSegmentIndex,
        sIntersection.outlineSegmentT,
        'S* reconstructed',
    );
    const rStarOutlineIdentityErrorCm = reconstructedRStar
        ? distance(RStar, reconstructedRStar)
        : Number.POSITIVE_INFINITY;
    const sStarOutlineIdentityErrorCm = reconstructedSStar
        ? distance(SStar, reconstructedSStar)
        : Number.POSITIVE_INFINITY;
    if (
        rStarOutlineIdentityErrorCm > VALIDATION_TOLERANCE_CM ||
        sStarOutlineIdentityErrorCm > VALIDATION_TOLERANCE_CM
    ) {
        return {
            errors: [
                {
                    code: 'TARGET_ANKLE_OUTLINE_IDENTITY_INVALID',
                    message:
                        'Target R*/S* could not be reconstructed from their outline segment identity.',
                },
            ],
        };
    }

    return {
        geometry: {
            RStar,
            SStar,
            rStarRayT: rIntersection.rayT,
            sStarRayT: sIntersection.rayT,
            rStarOutlineSegmentIndex: rIntersection.outlineSegmentIndex,
            rStarOutlineSegmentT: rIntersection.outlineSegmentT,
            sStarOutlineSegmentIndex: sIntersection.outlineSegmentIndex,
            sStarOutlineSegmentT: sIntersection.outlineSegmentT,
            targetDirection,
            originalRProjection,
            originalSProjection,
            positiveRayIntersectionCount: positiveIntersections.length,
            negativeRayIntersectionCount: negativeIntersections.length,
            mPrimeToRStar,
            mPrimeToSStar,
            ankleSpan,
            asymmetry: Math.abs(mPrimeToRStar - mPrimeToSStar),
            rToRStarDistance: distance(alignedFootPiece.alignedLandmarks.R, RStar),
            sToSStarDistance: distance(alignedFootPiece.alignedLandmarks.S, SStar),
            rStarLineDistanceCm,
            sStarLineDistanceCm,
            spanDecompositionErrorCm,
            rStarOutlineIdentityErrorCm,
            sStarOutlineIdentityErrorCm,
        },
        errors: [],
    };
}
