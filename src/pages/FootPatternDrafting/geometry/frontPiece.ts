import type {
    AgeGroup,
    DraftingParameters,
    DraftLine,
    DraftPoint,
    FrontPieceGeometry,
    GeometryBuildResult,
} from '../types';
import { CALF_LEVEL_OFFSET_CM } from './backPiece';
import {
    circleIntersections,
    createDistanceCheck,
    distance,
    mirrorAcrossCenterLine,
    pointAlongRay,
    selectFrontPatternHPrime,
} from './geometryUtils';
import { AGE_ADJUSTMENTS_CM } from './measurements';

function line(
    id: string,
    start: DraftPoint,
    end: DraftPoint,
    kind: NonNullable<DraftLine['kind']>,
    dashed = false,
): DraftLine {
    return { id, start, end, dashed, kind };
}

export function buildFrontPiece(
    parameters: DraftingParameters,
    ageGroup: AgeGroup,
    x: number,
    z: number,
): GeometryBuildResult<FrontPieceGeometry> {
    const requiredValues = [
        parameters.b,
        parameters.c,
        parameters.d,
        parameters.e,
        parameters.g,
        x,
        z,
    ];
    if (requiredValues.some((value) => !Number.isFinite(value) || value < 0)) {
        return {
            errors: [
                {
                    code: 'FRONT_PARAMETERS_INVALID',
                    message:
                        'Front-piece drafting parameters must be finite, non-negative cm values.',
                },
            ],
        };
    }

    const ageAdjustment = AGE_ADJUSTMENTS_CM[ageGroup];
    const MPrime: DraftPoint = { id: "M'", x: 0, y: 0 };
    const N: DraftPoint = { id: 'N', x: 0, y: parameters.g - ageAdjustment };
    const O: DraftPoint = { id: 'O', x: 0, y: N.y + CALF_LEVEL_OFFSET_CM };
    const B: DraftPoint = { id: 'B', x: parameters.c / 4, y: O.y };
    const C: DraftPoint = { id: 'C', x: parameters.d / 4, y: N.y };
    const H: DraftPoint = { id: 'H', x: parameters.e / 2, y: 0 };
    const G: DraftPoint = { id: 'G', x: parameters.b / 2, y: 0 };
    const K: DraftPoint = { id: 'K', x: H.x - x, y: 0 };
    const y = distance(K, G);
    const intersections = circleIntersections(K, x, C, z);
    const selectedHPrime = selectFrontPatternHPrime(intersections);

    if (!selectedHPrime) {
        const reason =
            intersections.length === 0
                ? 'The K-centered radius x circle and C-centered radius z circle do not have a unique finite intersection.'
                : "Circle intersections exist, but none is both below the M'-H baseline and on the right side of the x = 0 center line.";

        return {
            derived: { y },
            errors: [
                {
                    code: 'FRONT_H_PRIME_NOT_FOUND',
                    message: `Unable to construct H': ${reason}`,
                },
            ],
        };
    }

    const HPrime: DraftPoint = { ...selectedHPrime, id: "H'" };
    const GPrime = pointAlongRay(K, HPrime, y, "G'");

    if (!GPrime) {
        return {
            derived: { y },
            errors: [
                {
                    code: 'FRONT_G_PRIME_DIRECTION_INVALID',
                    message: "Unable to construct G': the K to H' ray has zero length.",
                },
            ],
        };
    }

    // Phase 1/2 assumption from the supplied prototype rule: the mirror axis is x = 0.
    const L = mirrorAcrossCenterLine(GPrime, 'L');
    const BPrime = mirrorAcrossCenterLine(B, "B'");
    const KPrime = mirrorAcrossCenterLine(K, "K'");
    const HLeft = mirrorAcrossCenterLine(H, "H''");
    const HPrimeLeft = mirrorAcrossCenterLine(HPrime, "H'''");
    const CPrime = mirrorAcrossCenterLine(C, "C'");
    const GLeft = mirrorAcrossCenterLine(G, "G''")


    return {
        geometry: {
            points: { MPrime, N, O, B, C, H, G, K, HPrime, GPrime, L, BPrime, CPrime, KPrime, HLeft, HPrimeLeft, GLeft},
            lines: [
                line('front-center-line', MPrime, O, 'centerline', true),
                line('front-OB', O, B, 'construction'),
                line('front-NC', N, C, 'construction'),
                line('front-MPrimeH', MPrime, H, 'construction'),
                line('front-MPrimeG', MPrime, G, 'construction'),
                line('front-BC', B, C, 'boundary'),
                line('front-CHPrime', C, HPrime, 'boundary'),
                // K, H' and G' are collinear, so one solid K-G' line avoids overlap.
                line('front-KGPrime', K, GPrime, 'boundary'),
                line("front-B'C'", BPrime, CPrime, 'boundary'),
                line("front-C'H'''", CPrime, HPrimeLeft, 'boundary'),
                line("front-M'G''", MPrime, GLeft, 'construction'),
                line("front-K'L", KPrime, L, 'boundary')
            ],
            ageAdjustment,
            y,
            checks: [
                createDistanceCheck(
                    'front-NMPrime',
                    "NM' = g - age adjustment",
                    N,
                    MPrime,
                    parameters.g - ageAdjustment,
                ),
                createDistanceCheck('front-OB', 'OB = c / 4', O, B, parameters.c / 4),
                createDistanceCheck('front-NC', 'NC = d / 4', N, C, parameters.d / 4),
                createDistanceCheck('front-MPrimeH', "M'H = e / 2", MPrime, H, parameters.e / 2),
                createDistanceCheck('front-MPrimeG', "M'G = b / 2", MPrime, G, parameters.b / 2),
                createDistanceCheck('front-KH', 'KH = x', K, H, x),
                createDistanceCheck('front-KHPrime', "KH' = x", K, HPrime, x),
                createDistanceCheck('front-CHPrime', "CH' = z", C, HPrime, z),
                createDistanceCheck('front-KGPrime', "KG' = KG", K, GPrime, y),
            ],
        },
        derived: { y },
        errors: [],
    };
}
