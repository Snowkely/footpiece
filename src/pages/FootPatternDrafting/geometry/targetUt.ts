import type {
    DraftPoint,
    GeometryBuildResult,
    TargetUtGeometry,
    TargetUtScalarCheck,
} from '../types';
import { distance, GEOMETRY_EPSILON_CM, VALIDATION_TOLERANCE_CM } from './geometryUtils';

export const DEFAULT_UT_DISTRIBUTION = 0.5;

function isFinitePoint(point: DraftPoint): boolean {
    return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function createScalarCheck(actual: number, expected: number): TargetUtScalarCheck {
    const errorCm = actual - expected;

    return {
        actual,
        expected,
        errorCm,
        toleranceCm: VALIDATION_TOLERANCE_CM,
        pass: Math.abs(errorCm) <= VALIDATION_TOLERANCE_CM,
    };
}

function pointLineDistance(
    point: DraftPoint,
    lineOrigin: DraftPoint,
    directionX: number,
    directionY: number,
): number {
    return Math.abs(directionX * (point.y - lineOrigin.y) - directionY * (point.x - lineOrigin.x));
}

/**
 * Step 4 only: extend the aligned P-Q level outward to U/T so that UT equals
 * the drafting-ready parameter a. This function never modifies P or Q.
 */
export function deriveTargetUtConstruction(
    P: DraftPoint,
    Q: DraftPoint,
    a: number,
    distribution: number,
): GeometryBuildResult<TargetUtGeometry> {
    if (!Number.isFinite(a) || a < 0) {
        return {
            errors: [
                {
                    code: 'TARGET_UT_A_INVALID',
                    message:
                        'Target UT requires drafting parameter a to be finite and non-negative.',
                },
            ],
        };
    }

    if (!Number.isFinite(distribution) || distribution < 0 || distribution > 1) {
        return {
            errors: [
                {
                    code: 'TARGET_UT_DISTRIBUTION_INVALID',
                    message: 'UP/QT distribution alpha must be finite and within [0, 1].',
                },
            ],
        };
    }

    if (!isFinitePoint(P) || !isFinitePoint(Q)) {
        return {
            errors: [
                {
                    code: 'TARGET_UT_PQ_DIRECTION_INVALID',
                    message: 'Aligned P and Q must be finite and define a non-zero direction.',
                },
            ],
        };
    }

    const inputP = { ...P };
    const inputQ = { ...Q };
    const pqLengthCm = distance(P, Q);
    if (pqLengthCm <= GEOMETRY_EPSILON_CM) {
        return {
            errors: [
                {
                    code: 'TARGET_UT_PQ_DIRECTION_INVALID',
                    message: 'Aligned P and Q must define a non-zero direction.',
                },
            ],
        };
    }

    const rawExtraLengthCm = a - pqLengthCm;
    if (rawExtraLengthCm < -VALIDATION_TOLERANCE_CM) {
        return {
            errors: [
                {
                    code: 'TARGET_UT_A_SHORTER_THAN_PQ',
                    message: `UT cannot equal a: a (${a.toFixed(
                        3,
                    )} cm) is shorter than PQ (${pqLengthCm.toFixed(3)} cm).`,
                },
            ],
        };
    }

    // Treat a sub-tolerance negative remainder as zero without moving the fixed P/Q landmarks.
    const extraLengthCm = Math.max(0, rawExtraLengthCm);
    const upLengthCm = distribution * extraLengthCm;
    const qtLengthCm = (1 - distribution) * extraLengthCm;
    const directionX = (Q.x - P.x) / pqLengthCm;
    const directionY = (Q.y - P.y) / pqLengthCm;
    const U: DraftPoint = {
        id: 'U',
        x: P.x - directionX * upLengthCm,
        y: P.y - directionY * upLengthCm,
    };
    const T: DraftPoint = {
        id: 'T',
        x: Q.x + directionX * qtLengthCm,
        y: Q.y + directionY * qtLengthCm,
    };

    const targetUtLengthCm = distance(U, T);
    const actualUpLengthCm = distance(U, P);
    const actualQtLengthCm = distance(Q, T);
    const decompositionLengthCm = upLengthCm + pqLengthCm + qtLengthCm;
    const maximumLineDistanceCm = Math.max(
        pointLineDistance(U, P, directionX, directionY),
        pointLineDistance(P, P, directionX, directionY),
        pointLineDistance(Q, P, directionX, directionY),
        pointLineDistance(T, P, directionX, directionY),
    );
    const pForwardDistanceCm = (P.x - U.x) * directionX + (P.y - U.y) * directionY;
    const qForwardDistanceCm = (T.x - Q.x) * directionX + (T.y - Q.y) * directionY;
    const pUnchangedDistanceCm = distance(P, inputP);
    const qUnchangedDistanceCm = distance(Q, inputQ);

    const checks: TargetUtGeometry['checks'] = {
        collinearity: {
            maximumLineDistanceCm,
            toleranceCm: VALIDATION_TOLERANCE_CM,
            pass: maximumLineDistanceCm <= VALIDATION_TOLERANCE_CM,
        },
        directionOrder: {
            pForwardDistanceCm,
            qForwardDistanceCm,
            toleranceCm: VALIDATION_TOLERANCE_CM,
            pass:
                pForwardDistanceCm >= -VALIDATION_TOLERANCE_CM &&
                qForwardDistanceCm >= -VALIDATION_TOLERANCE_CM,
        },
        utLength: createScalarCheck(targetUtLengthCm, a),
        upLength: createScalarCheck(actualUpLengthCm, upLengthCm),
        qtLength: createScalarCheck(actualQtLengthCm, qtLengthCm),
        decomposition: createScalarCheck(decompositionLengthCm, a),
        pUnchanged: {
            distanceCm: pUnchangedDistanceCm,
            toleranceCm: GEOMETRY_EPSILON_CM,
            pass: pUnchangedDistanceCm <= GEOMETRY_EPSILON_CM,
        },
        qUnchanged: {
            distanceCm: qUnchangedDistanceCm,
            toleranceCm: GEOMETRY_EPSILON_CM,
            pass: qUnchangedDistanceCm <= GEOMETRY_EPSILON_CM,
        },
    };

    if (
        !checks.collinearity.pass ||
        !checks.directionOrder.pass ||
        !checks.utLength.pass ||
        !checks.upLength.pass ||
        !checks.qtLength.pass ||
        !checks.decomposition.pass ||
        !checks.pUnchanged.pass ||
        !checks.qUnchanged.pass
    ) {
        return {
            errors: [
                {
                    code: 'TARGET_UT_GEOMETRY_VALIDATION_FAILED',
                    message: 'The constructed U/T geometry did not satisfy all Step 4 invariants.',
                },
            ],
        };
    }

    return {
        geometry: {
            U,
            T,
            pqLengthCm,
            targetUtLengthCm,
            extraLengthCm,
            upLengthCm,
            qtLengthCm,
            distribution,
            pqDirection: { x: directionX, y: directionY },
            checks,
        },
        errors: [],
    };
}
