import type {
    DraftPoint,
    GeometryBuildResult,
    GeometryValidationError,
    TargetMultiSupportOuterCurveCandidate,
} from '../types';
import { distance } from './geometryUtils';
import type {
    MultiSupportQualityPoolResult,
    QualityPoolCandidateSummary,
} from './multiSupportQualityPool';

export const SHAPE_DESCRIPTOR_POINTS = 101;
export const REPRESENTATIVE_RESULT_COUNT = 5;
export const REPRESENTATIVE_RESULT_COUNT_OPTIONS = [3, 5, 8] as const;

const SHAPE_NUMERIC_EPSILON = 1e-10;
const SHAPE_DISTANCE_TIE_TOLERANCE_CM = 1e-12;
const SOFT_SCORE_TIE_TOLERANCE = 1e-12;

export interface ShapeDescriptorEntry {
    candidate: QualityPoolCandidateSummary;
    points: DraftPoint[];
}

export interface ShapeDiverseRepresentativeCandidate {
    representativeIndex: number;
    sourceBroadCandidateId: number;
    alpha: number;
    thetaDeg: number;
    lambdaCm: number;
    softScore: number;
    outerLengthCm: number;
    extraLengthCm: number;
    minimumShapeDistanceToPreviousCm?: number;
}

export interface ShapeDiverseSelectionResult {
    qualityPoolSize: number;
    requestedCount: number;
    actualCount: number;
    descriptorPointCount: number;
    descriptors: ShapeDescriptorEntry[];
    representatives: ShapeDiverseRepresentativeCandidate[];
    pairwiseShapeDistanceMatrixCm: number[][];
    minimumPairwiseDistanceCm: number;
    meanPairwiseDistanceCm: number;
    maximumPairwiseDistanceCm: number;
}

export type QualityCandidateCurveBuilder = (
    candidate: QualityPoolCandidateSummary,
) => GeometryBuildResult<TargetMultiSupportOuterCurveCandidate>;

export interface ShapeDescriptorBuildInput {
    candidates: readonly QualityPoolCandidateSummary[];
    buildCandidateCurve: QualityCandidateCurveBuilder;
    pointCount?: number;
}

export interface ShapeDiverseSelectionInput {
    qualityPool: MultiSupportQualityPoolResult;
    buildCandidateCurve: QualityCandidateCurveBuilder;
    requestedCount?: number;
    descriptorPointCount?: number;
}

function shapeError(code: string, message: string): GeometryValidationError {
    return { code, message };
}

function finitePoint(point: DraftPoint): boolean {
    return Number.isFinite(point.x) && Number.isFinite(point.y);
}

/** Resamples an open polyline at equal normalized cumulative arc-length positions. */
export function resamplePolylineByNormalizedArcLength(
    polyline: readonly DraftPoint[],
    pointCount = SHAPE_DESCRIPTOR_POINTS,
): GeometryBuildResult<DraftPoint[]> {
    if (!Number.isInteger(pointCount) || pointCount < 2) {
        return {
            errors: [
                shapeError(
                    'SHAPE_DESCRIPTOR_POINT_COUNT_INVALID',
                    'Shape descriptor point count must be an integer of at least two.',
                ),
            ],
        };
    }
    if (polyline.length < 2 || polyline.some((point) => !finitePoint(point))) {
        return {
            errors: [
                shapeError(
                    'SHAPE_DESCRIPTOR_POLYLINE_INVALID',
                    'Shape descriptor source polyline must contain at least two finite points.',
                ),
            ],
        };
    }

    const cumulativeLength = [0];
    for (let index = 1; index < polyline.length; index += 1) {
        cumulativeLength.push(
            cumulativeLength[index - 1] + distance(polyline[index - 1], polyline[index]),
        );
    }
    const totalLength = cumulativeLength[cumulativeLength.length - 1];
    if (!Number.isFinite(totalLength) || totalLength <= SHAPE_NUMERIC_EPSILON) {
        return {
            errors: [
                shapeError(
                    'SHAPE_DESCRIPTOR_POLYLINE_DEGENERATE',
                    'Shape descriptor source polyline must have non-zero arc length.',
                ),
            ],
        };
    }

    let segmentIndex = 0;
    const points = Array.from({ length: pointCount }, (_, descriptorIndex): DraftPoint => {
        if (descriptorIndex === 0) return { ...polyline[0] };
        if (descriptorIndex === pointCount - 1) return { ...polyline[polyline.length - 1] };

        const targetLength = (totalLength * descriptorIndex) / (pointCount - 1);
        while (
            segmentIndex < polyline.length - 2 &&
            cumulativeLength[segmentIndex + 1] < targetLength - SHAPE_NUMERIC_EPSILON
        ) {
            segmentIndex += 1;
        }
        while (
            segmentIndex < polyline.length - 2 &&
            cumulativeLength[segmentIndex + 1] - cumulativeLength[segmentIndex] <=
                SHAPE_NUMERIC_EPSILON
        ) {
            segmentIndex += 1;
        }

        const segmentLength = cumulativeLength[segmentIndex + 1] - cumulativeLength[segmentIndex];
        const segmentT =
            segmentLength <= SHAPE_NUMERIC_EPSILON
                ? 0
                : (targetLength - cumulativeLength[segmentIndex]) / segmentLength;
        const start = polyline[segmentIndex];
        const end = polyline[segmentIndex + 1];
        return {
            id: `shape-descriptor-${descriptorIndex}`,
            x: start.x + (end.x - start.x) * segmentT,
            y: start.y + (end.y - start.y) * segmentT,
        };
    });

    return { geometry: points, errors: [] };
}

/** Whole-curve equal-weight RMS distance in the existing drafting coordinate system (cm). */
export function computeRmsShapeDistance(
    first: readonly DraftPoint[],
    second: readonly DraftPoint[],
): GeometryBuildResult<number> {
    if (
        first.length < 2 ||
        first.length !== second.length ||
        first.some((point) => !finitePoint(point)) ||
        second.some((point) => !finitePoint(point))
    ) {
        return {
            errors: [
                shapeError(
                    'SHAPE_DISTANCE_DESCRIPTOR_INVALID',
                    'RMS shape distance requires equal-length finite descriptors.',
                ),
            ],
        };
    }
    const meanSquaredDistance =
        first.reduce((total, point, index) => {
            const dx = point.x - second[index].x;
            const dy = point.y - second[index].y;
            return total + dx * dx + dy * dy;
        }, 0) / first.length;
    return { geometry: Math.sqrt(meanSquaredDistance), errors: [] };
}

/** Rebuilds each Quality Pool curve exactly once and retains only its 101-point descriptor. */
export function buildShapeDescriptors({
    candidates,
    buildCandidateCurve,
    pointCount = SHAPE_DESCRIPTOR_POINTS,
}: ShapeDescriptorBuildInput): GeometryBuildResult<ShapeDescriptorEntry[]> {
    const descriptors: ShapeDescriptorEntry[] = [];
    for (const candidate of candidates) {
        const curve = buildCandidateCurve(candidate);
        if (!curve?.geometry) {
            const errorCodes = curve?.errors.map((error) => error.code).join(', ');
            return {
                errors: [
                    shapeError(
                        'SHAPE_DIVERSITY_CANDIDATE_REBUILD_FAILED',
                        `Broad Candidate #${candidate.sourceCandidateId} could not be rebuilt${
                            errorCodes ? `: ${errorCodes}` : '.'
                        }`,
                    ),
                ],
            };
        }
        const descriptor = resamplePolylineByNormalizedArcLength(
            curve.geometry.polylinePoints,
            pointCount,
        );
        if (!descriptor.geometry) {
            return { errors: descriptor.errors };
        }
        descriptors.push({
            candidate: {
                ...candidate,
                diagnostics: { ...candidate.diagnostics },
            },
            points: descriptor.geometry,
        });
    }
    return { geometry: descriptors, errors: [] };
}

function compareQuality(
    first: QualityPoolCandidateSummary,
    second: QualityPoolCandidateSummary,
): number {
    const scoreDifference = first.softScore - second.softScore;
    return Math.abs(scoreDifference) > SOFT_SCORE_TIE_TOLERANCE
        ? scoreDifference
        : first.sourceCandidateId - second.sourceCandidateId;
}

function shapeDistance(first: ShapeDescriptorEntry, second: ShapeDescriptorEntry): number {
    const result = computeRmsShapeDistance(first.points, second.points);
    if (result.geometry === undefined) {
        throw new Error(result.errors.map((error) => error.code).join(', '));
    }
    return result.geometry;
}

function pairwiseSummary(matrix: number[][]): {
    minimum: number;
    mean: number;
    maximum: number;
} {
    const distances = matrix.flatMap((row, firstIndex) =>
        row.filter((_, secondIndex) => secondIndex > firstIndex),
    );
    return distances.length
        ? {
              minimum: Math.min(...distances),
              mean: distances.reduce((total, value) => total + value, 0) / distances.length,
              maximum: Math.max(...distances),
          }
        : { minimum: 0, mean: 0, maximum: 0 };
}

/** Pure Max-Min Shape Diversity selection over prebuilt Quality Pool descriptors. */
export function selectMaxMinShapeDiverseCandidates(
    descriptors: readonly ShapeDescriptorEntry[],
    requestedCount = REPRESENTATIVE_RESULT_COUNT,
): GeometryBuildResult<ShapeDiverseSelectionResult> {
    if (!Number.isInteger(requestedCount) || requestedCount < 1) {
        return {
            errors: [
                shapeError(
                    'SHAPE_DIVERSITY_COUNT_INVALID',
                    'Representative result count must be a positive integer.',
                ),
            ],
        };
    }
    const candidateIds = descriptors.map((entry) => entry.candidate.sourceCandidateId);
    if (new Set(candidateIds).size !== candidateIds.length) {
        return {
            errors: [
                shapeError(
                    'SHAPE_DIVERSITY_CANDIDATE_DUPLICATE',
                    'Quality Pool candidate IDs must be unique.',
                ),
            ],
        };
    }
    if (!descriptors.length) {
        return {
            geometry: {
                qualityPoolSize: 0,
                requestedCount,
                actualCount: 0,
                descriptorPointCount: SHAPE_DESCRIPTOR_POINTS,
                descriptors: [],
                representatives: [],
                pairwiseShapeDistanceMatrixCm: [],
                minimumPairwiseDistanceCm: 0,
                meanPairwiseDistanceCm: 0,
                maximumPairwiseDistanceCm: 0,
            },
            errors: [],
        };
    }

    const descriptorPointCount = descriptors[0].points.length;
    if (
        descriptorPointCount < 2 ||
        descriptors.some(
            (entry) =>
                entry.points.length !== descriptorPointCount ||
                entry.points.some((point) => !finitePoint(point)),
        )
    ) {
        return {
            errors: [
                shapeError(
                    'SHAPE_DIVERSITY_DESCRIPTOR_INVALID',
                    'All Quality Pool shape descriptors must have the same point count.',
                ),
            ],
        };
    }

    const remaining = [...descriptors].sort((first, second) =>
        compareQuality(first.candidate, second.candidate),
    );
    const selected: Array<{ entry: ShapeDescriptorEntry; minimumDistance?: number }> = [
        { entry: remaining.shift()! },
    ];
    const targetCount = Math.min(requestedCount, descriptors.length);

    while (selected.length < targetCount) {
        let bestIndex = 0;
        let bestMinimumDistance = -Infinity;
        remaining.forEach((candidate, index) => {
            const minimumDistance = Math.min(
                ...selected.map((existing) => shapeDistance(candidate, existing.entry)),
            );
            const distanceDifference = minimumDistance - bestMinimumDistance;
            if (
                distanceDifference > SHAPE_DISTANCE_TIE_TOLERANCE_CM ||
                (Math.abs(distanceDifference) <= SHAPE_DISTANCE_TIE_TOLERANCE_CM &&
                    compareQuality(candidate.candidate, remaining[bestIndex].candidate) < 0)
            ) {
                bestIndex = index;
                bestMinimumDistance = minimumDistance;
            }
        });
        selected.push({
            entry: remaining.splice(bestIndex, 1)[0],
            minimumDistance: bestMinimumDistance,
        });
    }

    const matrix = selected.map((first) =>
        selected.map((second) =>
            first.entry.candidate.sourceCandidateId === second.entry.candidate.sourceCandidateId
                ? 0
                : shapeDistance(first.entry, second.entry),
        ),
    );
    const summary = pairwiseSummary(matrix);
    const representatives = selected.map(
        ({ entry, minimumDistance }, index): ShapeDiverseRepresentativeCandidate => ({
            representativeIndex: index + 1,
            sourceBroadCandidateId: entry.candidate.sourceCandidateId,
            alpha: entry.candidate.alpha,
            thetaDeg: entry.candidate.thetaDeg,
            lambdaCm: entry.candidate.lambdaCm,
            softScore: entry.candidate.softScore,
            outerLengthCm: entry.candidate.outerLengthCm,
            extraLengthCm: entry.candidate.extraLengthCm,
            minimumShapeDistanceToPreviousCm: minimumDistance,
        }),
    );

    return {
        geometry: {
            qualityPoolSize: descriptors.length,
            requestedCount,
            actualCount: representatives.length,
            descriptorPointCount,
            descriptors: descriptors.map((entry) => ({
                candidate: { ...entry.candidate, diagnostics: { ...entry.candidate.diagnostics } },
                points: entry.points.map((point) => ({ ...point })),
            })),
            representatives,
            pairwiseShapeDistanceMatrixCm: matrix,
            minimumPairwiseDistanceCm: summary.minimum,
            meanPairwiseDistanceCm: summary.mean,
            maximumPairwiseDistanceCm: summary.maximum,
        },
        errors: [],
    };
}

export function buildShapeDiverseRepresentativeSelection({
    qualityPool,
    buildCandidateCurve,
    requestedCount = REPRESENTATIVE_RESULT_COUNT,
    descriptorPointCount = SHAPE_DESCRIPTOR_POINTS,
}: ShapeDiverseSelectionInput): GeometryBuildResult<ShapeDiverseSelectionResult> {
    const descriptors = buildShapeDescriptors({
        candidates: qualityPool.candidates,
        buildCandidateCurve,
        pointCount: descriptorPointCount,
    });
    return descriptors.geometry
        ? selectMaxMinShapeDiverseCandidates(descriptors.geometry, requestedCount)
        : { errors: descriptors.errors };
}
