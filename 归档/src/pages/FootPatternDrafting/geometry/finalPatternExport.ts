import type {
    BackPieceGeometry,
    DraftPoint,
    FrontPieceGeometry,
    GeometryBuildResult,
    GeometryValidationError,
    TargetMultiSupportOuterCurveCandidate,
} from '../types';
import { polylineLength, segmentsIntersect } from './curveUtils';
import { distance, GEOMETRY_EPSILON_CM, VALIDATION_TOLERANCE_CM } from './geometryUtils';

export const CENTIMETERS_TO_MILLIMETERS = 10;
export const MASTER_PIECE_GAP_MM = 30;
export const MASTER_MARGIN_MM = 10;
export const DXF_EXPORT_TOLERANCE_MM = 0.01;
export const FINAL_CONTOUR_DUPLICATE_TOLERANCE_CM = 1e-7;

export type FinalPatternPieceId = 'front' | 'back';

export interface PatternBounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
}

export interface PatternTranslation {
    x: number;
    y: number;
}

export interface FinalCutContourChecks {
    finite: boolean;
    closed: boolean;
    noDuplicateConsecutivePoints: boolean;
    nonDegenerate: boolean;
    noSelfIntersection: boolean;
}

export interface FinalCutContour {
    pieceId: FinalPatternPieceId;
    pointsCm: DraftPoint[];
    closed: true;
    source: string;
    boundsCm: PatternBounds;
    perimeterLengthCm: number;
    checks: FinalCutContourChecks;
    selfIntersectionCount: number;
}

export interface FinalFrontCutContour extends FinalCutContour {
    pieceId: 'front';
    multiSupportPointCount: number;
    multiSupportLengthCm: number;
    multiSupportIntegrity: boolean;
}

export interface MasterPatternPieceGeometry {
    pieceId: FinalPatternPieceId;
    localPointsMm: DraftPoint[];
    masterPointsMm: DraftPoint[];
    localBoundsMm: PatternBounds;
    masterBoundsMm: PatternBounds;
    masterOffsetMm: PatternTranslation;
}

export interface FinalPatternExportManifest {
    units: 'mm';
    dxfVersion: 'AC1032';
    centimetersToMillimeters: 10;
    layout: 'back-above-front';
    gapMm: number;
    marginMm: number;
    front: {
        vertexCount: number;
        localBoundsMm: PatternBounds;
        masterBoundsMm: PatternBounds;
        masterOffsetMm: PatternTranslation;
    };
    back: {
        vertexCount: number;
        localBoundsMm: PatternBounds;
        masterBoundsMm: PatternBounds;
        masterOffsetMm: PatternTranslation;
    };
    masterBoundsMm: PatternBounds;
    multiSupport: {
        pointCount: number;
        expectedLengthCm: number;
        expectedLengthMm: number;
        masterLengthMm: number;
        lengthErrorMm: number;
    };
    sourceParameters: {
        alpha: number;
        thetaDeg: number;
        lambdaCm: number;
    };
}

export interface FinalPatternExportGeometry {
    frontContour: FinalFrontCutContour;
    backContour: FinalCutContour;
    front: MasterPatternPieceGeometry;
    back: MasterPatternPieceGeometry;
    masterBoundsMm: PatternBounds;
    checks: {
        piecesDoNotOverlap: boolean;
        verticalGapMm: number;
        gapAtLeastRequired: boolean;
        positiveMargin: boolean;
        dimensionsPreserved: boolean;
        multiSupportLengthPreserved: boolean;
    };
    manifest: FinalPatternExportManifest;
}

export interface FinalPatternExportInput {
    frontPiece: FrontPieceGeometry;
    completedBackPiece: BackPieceGeometry;
    manualCandidate: TargetMultiSupportOuterCurveCandidate;
}

function clonePoint(point: DraftPoint): DraftPoint {
    return { ...point };
}

function isFinitePoint(point: DraftPoint | undefined): point is DraftPoint {
    return Boolean(point) && Number.isFinite(point?.x) && Number.isFinite(point?.y);
}

export function calculatePatternBounds(points: DraftPoint[]): PatternBounds {
    const xValues = points.map((point) => point.x);
    const yValues = points.map((point) => point.y);
    const minX = Math.min(...xValues);
    const minY = Math.min(...yValues);
    const maxX = Math.max(...xValues);
    const maxY = Math.max(...yValues);

    return {
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX,
        height: maxY - minY,
    };
}

function signedContourArea(points: DraftPoint[]): number {
    return (
        points.reduce((area, point, index) => {
            const next = points[(index + 1) % points.length];
            return area + point.x * next.y - next.x * point.y;
        }, 0) / 2
    );
}

function findClosedContourSelfIntersections(
    points: DraftPoint[],
): Array<{ firstSegmentIndex: number; secondSegmentIndex: number }> {
    const intersections: Array<{ firstSegmentIndex: number; secondSegmentIndex: number }> = [];
    const segmentCount = points.length;

    for (let firstIndex = 0; firstIndex < segmentCount; firstIndex += 1) {
        const firstEndIndex = (firstIndex + 1) % segmentCount;
        for (let secondIndex = firstIndex + 1; secondIndex < segmentCount; secondIndex += 1) {
            const secondEndIndex = (secondIndex + 1) % segmentCount;
            const adjacent =
                secondIndex === firstEndIndex ||
                firstIndex === secondEndIndex ||
                (firstIndex === 0 && secondIndex === segmentCount - 1);
            if (adjacent) continue;

            if (
                segmentsIntersect(
                    points[firstIndex],
                    points[firstEndIndex],
                    points[secondIndex],
                    points[secondEndIndex],
                    FINAL_CONTOUR_DUPLICATE_TOLERANCE_CM,
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

export function validateFinalCutContour(
    pieceId: FinalPatternPieceId,
    pointsCm: DraftPoint[],
    source: string,
): GeometryBuildResult<FinalCutContour> {
    const finite = pointsCm.every(isFinitePoint);
    const enoughPoints = pointsCm.length >= 3;
    const noDuplicateConsecutivePoints =
        enoughPoints &&
        pointsCm.every(
            (point, index) =>
                distance(point, pointsCm[(index + 1) % pointsCm.length]) >
                FINAL_CONTOUR_DUPLICATE_TOLERANCE_CM,
        );
    const nonDegenerate =
        finite && enoughPoints && Math.abs(signedContourArea(pointsCm)) > GEOMETRY_EPSILON_CM ** 2;
    const selfIntersections =
        finite && enoughPoints && noDuplicateConsecutivePoints
            ? findClosedContourSelfIntersections(pointsCm)
            : [];
    const checks: FinalCutContourChecks = {
        finite,
        closed: true,
        noDuplicateConsecutivePoints,
        nonDegenerate,
        noSelfIntersection: selfIntersections.length === 0,
    };

    if (!Object.values(checks).every(Boolean)) {
        return {
            errors: [
                {
                    code: `FINAL_${pieceId.toUpperCase()}_CONTOUR_INVALID`,
                    message: `The final ${pieceId} cutting contour failed finite, duplicate, non-degenerate, or self-intersection validation.`,
                },
            ],
        };
    }

    const points = pointsCm.map(clonePoint);
    return {
        geometry: {
            pieceId,
            pointsCm: points,
            closed: true,
            source,
            boundsCm: calculatePatternBounds(points),
            perimeterLengthCm: polylineLength([...points, points[0]]),
            checks,
            selfIntersectionCount: selfIntersections.length,
        },
        errors: [],
    };
}

function pointsMatch(first: DraftPoint, second: DraftPoint): boolean {
    return distance(first, second) <= VALIDATION_TOLERANCE_CM;
}

export function buildFinalFrontCutContour(
    frontPiece: FrontPieceGeometry,
    manualCandidate: TargetMultiSupportOuterCurveCandidate,
): GeometryBuildResult<FinalFrontCutContour> {
    if (!manualCandidate.valid) {
        return {
            errors: [
                {
                    code: 'FINAL_FRONT_MANUAL_CANDIDATE_INVALID',
                    message: 'A valid multi-support candidate must be applied before DXF export.',
                },
            ],
        };
    }

    const multiSupportPoints = manualCandidate.polylinePoints;
    const requiredPoints = [
        frontPiece.points.L,
        frontPiece.points.GPrime,
        frontPiece.points.HPrime,
        frontPiece.points.C,
        frontPiece.points.B,
        frontPiece.points.O,
        frontPiece.points.BPrime,
        frontPiece.points.CPrime,
        frontPiece.points.HPrimeLeft,
    ];
    if (
        multiSupportPoints.length < 2 ||
        multiSupportPoints.some((point) => !isFinitePoint(point)) ||
        requiredPoints.some((point) => !isFinitePoint(point)) ||
        !pointsMatch(multiSupportPoints[0], frontPiece.points.L) ||
        !pointsMatch(multiSupportPoints[multiSupportPoints.length - 1], frontPiece.points.GPrime)
    ) {
        return {
            errors: [
                {
                    code: 'FINAL_FRONT_CURVE_INTEGRITY_INVALID',
                    message:
                        "The applied multi-support polyline must remain an unchanged finite L-to-G' curve.",
                },
            ],
        };
    }

    const points = [
        ...multiSupportPoints.map(clonePoint),
        clonePoint(frontPiece.points.HPrime),
        clonePoint(frontPiece.points.C),
        clonePoint(frontPiece.points.B),
        clonePoint(frontPiece.points.O),
        clonePoint(frontPiece.points.BPrime),
        clonePoint(frontPiece.points.CPrime),
        clonePoint(frontPiece.points.HPrimeLeft),
    ];
    const validated = validateFinalCutContour(
        'front',
        points,
        'current-applied-manual-multi-support-candidate',
    );
    if (!validated.geometry) return { errors: validated.errors };

    const multiSupportIntegrity = multiSupportPoints.every((point, index) =>
        pointsMatch(point, validated.geometry!.pointsCm[index]),
    );
    if (!multiSupportIntegrity) {
        return {
            errors: [
                {
                    code: 'FINAL_FRONT_CURVE_INTEGRITY_INVALID',
                    message:
                        'The final front contour altered the applied Step 6C sampled geometry.',
                },
            ],
        };
    }

    return {
        geometry: {
            ...validated.geometry,
            pieceId: 'front',
            multiSupportPointCount: multiSupportPoints.length,
            multiSupportLengthCm: polylineLength(multiSupportPoints),
            multiSupportIntegrity,
        },
        errors: [],
    };
}

export function buildFinalBackCutContour(
    completedBackPiece: BackPieceGeometry,
): GeometryBuildResult<FinalCutContour> {
    const { O, B, C, D, E, F, A, FPrime, EPrime, DPrime, CPrime, BPrime } =
        completedBackPiece.points;
    const points = [O, B, C, D, E, F, A, FPrime, EPrime, DPrime, CPrime, BPrime];
    if (points.some((point) => !isFinitePoint(point))) {
        return {
            errors: [
                {
                    code: 'FINAL_BACK_CONTOUR_INCOMPLETE',
                    message:
                        "The completed Back Piece must contain A, F, F', and every mirrored perimeter point before DXF export.",
                },
            ],
        };
    }

    return validateFinalCutContour(
        'back',
        points as DraftPoint[],
        'explicit-completed-back-piece-topology',
    );
}

export function convertPointsCmToMm(pointsCm: DraftPoint[]): DraftPoint[] {
    return pointsCm.map((point) => ({
        ...point,
        x: point.x * CENTIMETERS_TO_MILLIMETERS,
        y: point.y * CENTIMETERS_TO_MILLIMETERS,
    }));
}

export function translatePatternPoints(
    points: DraftPoint[],
    offset: PatternTranslation,
): DraftPoint[] {
    return points.map((point) => ({
        ...point,
        x: point.x + offset.x,
        y: point.y + offset.y,
    }));
}

function boundsMatchDimensions(first: PatternBounds, second: PatternBounds): boolean {
    return (
        Math.abs(first.width - second.width) <= DXF_EXPORT_TOLERANCE_MM &&
        Math.abs(first.height - second.height) <= DXF_EXPORT_TOLERANCE_MM
    );
}

function boxesOverlap(first: PatternBounds, second: PatternBounds): boolean {
    return !(
        first.maxX <= second.minX ||
        second.maxX <= first.minX ||
        first.maxY <= second.minY ||
        second.maxY <= first.minY
    );
}

export function buildFinalPatternExportGeometry({
    frontPiece,
    completedBackPiece,
    manualCandidate,
}: FinalPatternExportInput): GeometryBuildResult<FinalPatternExportGeometry> {
    const frontResult = buildFinalFrontCutContour(frontPiece, manualCandidate);
    const backResult = buildFinalBackCutContour(completedBackPiece);
    const errors: GeometryValidationError[] = [...frontResult.errors, ...backResult.errors];
    if (!frontResult.geometry || !backResult.geometry) return { errors };

    const frontLocalPointsMm = convertPointsCmToMm(frontResult.geometry.pointsCm);
    const backLocalPointsMm = convertPointsCmToMm(backResult.geometry.pointsCm);
    const frontLocalBoundsMm = calculatePatternBounds(frontLocalPointsMm);
    const backLocalBoundsMm = calculatePatternBounds(backLocalPointsMm);
    const frontMasterOffsetMm = {
        x: MASTER_MARGIN_MM - frontLocalBoundsMm.minX,
        y: MASTER_MARGIN_MM - frontLocalBoundsMm.minY,
    };
    const frontMasterPointsMm = translatePatternPoints(frontLocalPointsMm, frontMasterOffsetMm);
    const frontMasterBoundsMm = calculatePatternBounds(frontMasterPointsMm);
    const backMasterOffsetMm = {
        x: MASTER_MARGIN_MM - backLocalBoundsMm.minX,
        y: frontMasterBoundsMm.maxY + MASTER_PIECE_GAP_MM - backLocalBoundsMm.minY,
    };
    const backMasterPointsMm = translatePatternPoints(backLocalPointsMm, backMasterOffsetMm);
    const backMasterBoundsMm = calculatePatternBounds(backMasterPointsMm);
    const masterBoundsMm = calculatePatternBounds([...frontMasterPointsMm, ...backMasterPointsMm]);
    const verticalGapMm = backMasterBoundsMm.minY - frontMasterBoundsMm.maxY;
    const multiSupportMasterLengthMm = polylineLength(
        frontMasterPointsMm.slice(0, frontResult.geometry.multiSupportPointCount),
    );
    const expectedMultiSupportLengthMm =
        manualCandidate.outerCurveLengthCm * CENTIMETERS_TO_MILLIMETERS;
    const multiSupportLengthErrorMm = Math.abs(
        multiSupportMasterLengthMm - expectedMultiSupportLengthMm,
    );
    const dimensionsPreserved =
        boundsMatchDimensions(frontLocalBoundsMm, frontMasterBoundsMm) &&
        boundsMatchDimensions(backLocalBoundsMm, backMasterBoundsMm);
    const checks = {
        piecesDoNotOverlap: !boxesOverlap(frontMasterBoundsMm, backMasterBoundsMm),
        verticalGapMm,
        gapAtLeastRequired: verticalGapMm >= MASTER_PIECE_GAP_MM - DXF_EXPORT_TOLERANCE_MM,
        positiveMargin:
            masterBoundsMm.minX >= MASTER_MARGIN_MM - DXF_EXPORT_TOLERANCE_MM &&
            masterBoundsMm.minY >= MASTER_MARGIN_MM - DXF_EXPORT_TOLERANCE_MM,
        dimensionsPreserved,
        multiSupportLengthPreserved: multiSupportLengthErrorMm <= DXF_EXPORT_TOLERANCE_MM,
    };
    if (!Object.values(checks).every((value) => typeof value === 'number' || value)) {
        return {
            errors: [
                {
                    code: 'FINAL_PATTERN_MASTER_LAYOUT_INVALID',
                    message:
                        'The deterministic Back-above-Front layout failed overlap, gap, margin, dimension, or curve-length validation.',
                },
            ],
        };
    }

    const front: MasterPatternPieceGeometry = {
        pieceId: 'front',
        localPointsMm: frontLocalPointsMm,
        masterPointsMm: frontMasterPointsMm,
        localBoundsMm: frontLocalBoundsMm,
        masterBoundsMm: frontMasterBoundsMm,
        masterOffsetMm: frontMasterOffsetMm,
    };
    const back: MasterPatternPieceGeometry = {
        pieceId: 'back',
        localPointsMm: backLocalPointsMm,
        masterPointsMm: backMasterPointsMm,
        localBoundsMm: backLocalBoundsMm,
        masterBoundsMm: backMasterBoundsMm,
        masterOffsetMm: backMasterOffsetMm,
    };
    const manifest: FinalPatternExportManifest = {
        units: 'mm',
        dxfVersion: 'AC1032',
        centimetersToMillimeters: CENTIMETERS_TO_MILLIMETERS,
        layout: 'back-above-front',
        gapMm: MASTER_PIECE_GAP_MM,
        marginMm: MASTER_MARGIN_MM,
        front: {
            vertexCount: frontMasterPointsMm.length,
            localBoundsMm: frontLocalBoundsMm,
            masterBoundsMm: frontMasterBoundsMm,
            masterOffsetMm: frontMasterOffsetMm,
        },
        back: {
            vertexCount: backMasterPointsMm.length,
            localBoundsMm: backLocalBoundsMm,
            masterBoundsMm: backMasterBoundsMm,
            masterOffsetMm: backMasterOffsetMm,
        },
        masterBoundsMm,
        multiSupport: {
            pointCount: frontResult.geometry.multiSupportPointCount,
            expectedLengthCm: manualCandidate.outerCurveLengthCm,
            expectedLengthMm: expectedMultiSupportLengthMm,
            masterLengthMm: multiSupportMasterLengthMm,
            lengthErrorMm: multiSupportLengthErrorMm,
        },
        sourceParameters: {
            alpha: manualCandidate.alpha,
            thetaDeg: manualCandidate.thetaDeg,
            lambdaCm: manualCandidate.outwardOffsetCm,
        },
    };

    return {
        geometry: {
            frontContour: frontResult.geometry,
            backContour: backResult.geometry,
            front,
            back,
            masterBoundsMm,
            checks,
            manifest,
        },
        errors: [],
    };
}
