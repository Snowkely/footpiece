import type {
    BackPieceGeometry,
    BackPieceSymmetryDiagnostics,
    DraftingParameters,
    DraftLine,
    DraftPoint,
    GeometryBuildResult,
    GeometryCheck,
    GeometryValidationError,
} from '../types';
import {
    createDistanceCheck,
    distance,
    mirrorPointAcrossVerticalAxis,
    VALIDATION_TOLERANCE_CM,
} from './geometryUtils';

export const CALF_LEVEL_OFFSET_CM = 5;

function line(
    id: string,
    start: DraftPoint,
    end: DraftPoint,
    kind: NonNullable<DraftLine['kind']>,
    dashed = false,
): DraftLine {
    return { id, start, end, dashed, kind };
}

function zeroErrorCheck(id: string, label: string, actual: number): GeometryCheck {
    return {
        id,
        label,
        actual,
        expected: 0,
        tolerance: VALIDATION_TOLERANCE_CM,
        pass: actual <= VALIDATION_TOLERANCE_CM,
    };
}

function mirrorCoordinateError(original: DraftPoint, mirrored: DraftPoint, axisX: number): number {
    return Math.max(
        Math.abs(original.y - mirrored.y),
        Math.abs(Math.abs(original.x - axisX) - Math.abs(mirrored.x - axisX)),
        Math.abs((original.x + mirrored.x) / 2 - axisX),
    );
}

function buildBackPieceSymmetryDiagnostics(
    points: BackPieceGeometry['points'],
): BackPieceSymmetryDiagnostics {
    const axisX = points.O.x;
    const centerlinePoints = [points.O, points.N, points.M, points.A].filter(
        (point): point is DraftPoint => point !== undefined,
    );
    const centerlineError = Math.max(
        0,
        ...centerlinePoints.map((point) => Math.abs(point.x - axisX)),
    );
    const mirroredPairs: Array<[string, DraftPoint | undefined, DraftPoint | undefined]> = [
        ['B', points.B, points.BPrime],
        ['C', points.C, points.CPrime],
        ['D', points.D, points.DPrime],
        ['E', points.E, points.EPrime],
        ['F', points.F, points.FPrime],
    ];
    const presentPairs = mirroredPairs.filter(
        (pair): pair is [string, DraftPoint, DraftPoint] =>
            pair[1] !== undefined && pair[2] !== undefined,
    );
    const mirrorChecks = presentPairs.map(([label, original, mirrored]) =>
        zeroErrorCheck(
            `back-symmetry-${label}`,
            `${label}/${label}' mirror`,
            mirrorCoordinateError(original, mirrored, axisX),
        ),
    );
    const segmentPairs: Array<
        [
            string,
            DraftPoint | undefined,
            DraftPoint | undefined,
            DraftPoint | undefined,
            DraftPoint | undefined,
        ]
    > = [
        ['OB', points.O, points.B, points.O, points.BPrime],
        ['BC', points.B, points.C, points.BPrime, points.CPrime],
        ['CD', points.C, points.D, points.CPrime, points.DPrime],
        ['DE', points.D, points.E, points.DPrime, points.EPrime],
        ['EF', points.E, points.F, points.EPrime, points.FPrime],
        ['FA', points.F, points.A, points.FPrime, points.A],
    ];
    const segmentLengthChecks = segmentPairs.flatMap(
        ([label, rightStart, rightEnd, leftStart, leftEnd]) => {
            if (!rightStart || !rightEnd || !leftStart || !leftEnd) {
                return [];
            }

            return [
                zeroErrorCheck(
                    `back-symmetry-length-${label}`,
                    `${label} = mirrored ${label}`,
                    Math.abs(distance(rightStart, rightEnd) - distance(leftStart, leftEnd)),
                ),
            ];
        },
    );

    return {
        axisX,
        centerlineCheck: zeroErrorCheck(
            'back-symmetry-centerline',
            'O/N/M/A on center axis',
            centerlineError,
        ),
        mirrorChecks,
        segmentLengthChecks,
        maxMirrorCoordinateErrorCm: Math.max(
            0,
            ...presentPairs.map(([, original, mirrored]) =>
                mirrorCoordinateError(original, mirrored, axisX),
            ),
        ),
    };
}

export function buildBackPiece(
    parameters: DraftingParameters,
): GeometryBuildResult<BackPieceGeometry> {
    if (parameters.r === undefined || !Number.isFinite(parameters.r) || parameters.r < 0) {
        return {
            errors: [
                {
                    code: 'BACK_R_REQUIRED',
                    message:
                        'Temporary compressed-foot-piece RS length (r) is required to construct the back piece.',
                },
            ],
        };
    }

    const requiredValues = [parameters.c, parameters.d, parameters.f, parameters.g];
    if (requiredValues.some((value) => !Number.isFinite(value) || value < 0)) {
        return {
            errors: [
                {
                    code: 'BACK_PARAMETERS_INVALID',
                    message:
                        'Back-piece drafting parameters must be finite, non-negative cm values.',
                },
            ],
        };
    }

    const M: DraftPoint = { id: 'M', x: 0, y: 0 };
    const N: DraftPoint = { id: 'N', x: 0, y: parameters.g };
    const O: DraftPoint = { id: 'O', x: 0, y: parameters.g + CALF_LEVEL_OFFSET_CM };
    const B: DraftPoint = { id: 'B', x: parameters.c / 4, y: O.y };
    const C: DraftPoint = { id: 'C', x: parameters.d / 4, y: N.y };
    const D: DraftPoint = { id: 'D', x: parameters.f / 2, y: M.y };
    const E: DraftPoint = { id: 'E', x: parameters.r / 2, y: M.y };
    const axisX = O.x;
    const BPrime = mirrorPointAcrossVerticalAxis(B, axisX, "B'");
    const CPrime = mirrorPointAcrossVerticalAxis(C, axisX, "C'");
    const DPrime = mirrorPointAcrossVerticalAxis(D, axisX, "D'");
    const EPrime = mirrorPointAcrossVerticalAxis(E, axisX, "E'");
    const x = distance(D, E);
    const z = distance(C, D);
    const points: BackPieceGeometry['points'] = {
        M,
        N,
        O,
        B,
        C,
        D,
        E,
        BPrime,
        CPrime,
        DPrime,
        EPrime,
    };

    return {
        geometry: {
            points,
            lines: [
                line('back-center-line', M, O, 'centerline', true),
                line('back-OB', O, B, 'construction'),
                line('back-NC', N, C, 'construction'),
                line('back-MD', M, D, 'construction'),
                line('back-BC', B, C, 'boundary'),
                line('back-CD', C, D, 'boundary'),
                line('back-DE', D, E, 'boundary'),
                line("back-OB'", O, BPrime, 'construction'),
                line("back-NC'", N, CPrime, 'construction'),
                line("back-MD'", M, DPrime, 'construction'),
                line("back-B'C'", BPrime, CPrime, 'boundary'),
                line("back-C'D'", CPrime, DPrime, 'boundary'),
                line("back-D'E'", DPrime, EPrime, 'boundary'),
            ],
            x,
            z,
            checks: [
                createDistanceCheck('back-MN', 'MN = g', M, N, parameters.g),
                createDistanceCheck('back-OB', 'OB = c / 4', O, B, parameters.c / 4),
                createDistanceCheck('back-NC', 'NC = d / 4', N, C, parameters.d / 4),
                createDistanceCheck('back-MD', 'MD = f / 2', M, D, parameters.f / 2),
                createDistanceCheck('back-ME', 'ME = r / 2', M, E, parameters.r / 2),
            ],
            symmetry: buildBackPieceSymmetryDiagnostics(points),
        },
        derived: { x, z },
        errors: [],
    };
}

export function completeBackPieceWithFrontY(
    backPiece: BackPieceGeometry,
    y: number,
): GeometryBuildResult<BackPieceGeometry> {
    if (!Number.isFinite(y) || y < 0) {
        const error: GeometryValidationError = {
            code: 'BACK_COMPLETION_Y_INVALID',
            message: 'Front-piece y must be a finite, non-negative cm value to complete A/F.',
        };
        return { errors: [error] };
    }

    const { M, E, EPrime } = backPiece.points;
    const F: DraftPoint = { id: 'F', x: E.x, y: -y };
    const axisX = backPiece.points.O.x;
    const A: DraftPoint = { id: 'A', x: axisX, y: -y };
    const FPrime = mirrorPointAcrossVerticalAxis(F, axisX, "F'");
    const points: BackPieceGeometry['points'] = {
        ...backPiece.points,
        A,
        F,
        FPrime,
    };
    const completionLineIds = new Set(['back-MA', 'back-EF', 'back-FA', "back-E'F'", "back-F'A"]);
    const completionCheckIds = new Set(['back-EF', 'back-AF']);

    return {
        geometry: {
            ...backPiece,
            points,
            lines: [
                ...backPiece.lines.filter((draftLine) => !completionLineIds.has(draftLine.id)),
                line('back-MA', M, A, 'centerline', true),
                line('back-EF', E, F, 'boundary'),
                line('back-FA', F, A, 'boundary'),
                line("back-E'F'", EPrime, FPrime, 'boundary'),
                line("back-F'A", FPrime, A, 'boundary'),
            ],
            checks: [
                ...backPiece.checks.filter((check) => !completionCheckIds.has(check.id)),
                createDistanceCheck('back-EF', 'EF = y', E, F, y),
                createDistanceCheck('back-AF', 'AF = ME', A, F, distance(M, E)),
            ],
            symmetry: buildBackPieceSymmetryDiagnostics(points),
        },
        derived: { x: backPiece.x, y, z: backPiece.z },
        errors: [],
    };
}
