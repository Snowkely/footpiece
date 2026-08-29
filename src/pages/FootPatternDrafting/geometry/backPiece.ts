import type {
    BackPieceGeometry,
    DraftingParameters,
    DraftLine,
    DraftPoint,
    GeometryBuildResult,
    GeometryValidationError,
} from '../types';
import { createDistanceCheck, distance } from './geometryUtils';

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
    const x = distance(D, E);
    const z = distance(C, D);

    return {
        geometry: {
            points: { M, N, O, B, C, D, E },
            lines: [
                line('back-center-line', M, O, 'centerline', true),
                line('back-OB', O, B, 'construction'),
                line('back-NC', N, C, 'construction'),
                line('back-MD', M, D, 'construction'),
                line('back-BC', B, C, 'boundary'),
                line('back-CD', C, D, 'boundary'),
                line('back-DE', D, E, 'boundary'),
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

    const { M, E } = backPiece.points;
    const F: DraftPoint = { id: 'F', x: E.x, y: -y };
    const A: DraftPoint = { id: 'A', x: 0, y: -y };
    const completionLineIds = new Set(['back-MA', 'back-EF', 'back-FA']);
    const completionCheckIds = new Set(['back-EF', 'back-AF']);

    return {
        geometry: {
            ...backPiece,
            points: { ...backPiece.points, A, F },
            lines: [
                ...backPiece.lines.filter((draftLine) => !completionLineIds.has(draftLine.id)),
                line('back-MA', M, A, 'centerline', true),
                line('back-EF', E, F, 'boundary'),
                line('back-FA', F, A, 'boundary'),
            ],
            checks: [
                ...backPiece.checks.filter((check) => !completionCheckIds.has(check.id)),
                createDistanceCheck('back-EF', 'EF = y', E, F, y),
                createDistanceCheck('back-AF', 'AF = ME', A, F, distance(M, E)),
            ],
        },
        derived: { x: backPiece.x, y, z: backPiece.z },
        errors: [],
    };
}
