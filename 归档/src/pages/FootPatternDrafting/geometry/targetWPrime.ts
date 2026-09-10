import type { DraftPoint, GeometryBuildResult, TargetWPrimeGeometry } from '../types';
import { distance, GEOMETRY_EPSILON_CM, VALIDATION_TOLERANCE_CM } from './geometryUtils';

export const DEFAULT_WPRIME_OUTWARD_OFFSET_CM = 1;
export const TARGET_WPRIME_DIRECTION_DOT_MIN = 0.999;

function isFinitePoint(point: DraftPoint): boolean {
    return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function lineDistance(
    point: DraftPoint,
    origin: DraftPoint,
    direction: { x: number; y: number },
): number {
    return Math.abs(direction.x * (point.y - origin.y) - direction.y * (point.x - origin.x));
}

/**
 * Step 5 only: extends the aligned M'-W longitudinal ray beyond W by an
 * independent exploration offset. It does not read or modify Step 4 U/T.
 */
export function deriveTargetWPrime(
    W: DraftPoint,
    MPrime: DraftPoint,
    O: DraftPoint,
    outwardOffsetCm: number,
): GeometryBuildResult<TargetWPrimeGeometry> {
    if (!Number.isFinite(outwardOffsetCm) || outwardOffsetCm < 0) {
        return {
            errors: [
                {
                    code: 'TARGET_WPRIME_OFFSET_INVALID',
                    message: "W' outward offset must be finite and non-negative in cm.",
                },
            ],
        };
    }

    if (!isFinitePoint(W) || !isFinitePoint(MPrime) || !isFinitePoint(O)) {
        return {
            errors: [
                {
                    code: 'TARGET_WPRIME_DIRECTION_INVALID',
                    message: "W, M', and O must be finite points that define valid directions.",
                },
            ],
        };
    }

    const inputW = { ...W };
    const mPrimeWLength = distance(MPrime, W);
    const frontDirectionLength = distance(O, MPrime);
    if (mPrimeWLength <= GEOMETRY_EPSILON_CM || frontDirectionLength <= GEOMETRY_EPSILON_CM) {
        return {
            errors: [
                {
                    code: 'TARGET_WPRIME_DIRECTION_INVALID',
                    message: "M'-W and O-M' must each define a non-zero direction.",
                },
            ],
        };
    }

    const toeOutwardDirection = {
        x: (W.x - MPrime.x) / mPrimeWLength,
        y: (W.y - MPrime.y) / mPrimeWLength,
    };
    const frontFootDirection = {
        x: (MPrime.x - O.x) / frontDirectionLength,
        y: (MPrime.y - O.y) / frontDirectionLength,
    };
    const directionDot =
        toeOutwardDirection.x * frontFootDirection.x + toeOutwardDirection.y * frontFootDirection.y;

    if (directionDot < 0) {
        return {
            errors: [
                {
                    code: 'TARGET_WPRIME_DIRECTION_REVERSED',
                    message: "The aligned M'-W direction is reversed relative to O-to-M'.",
                },
            ],
        };
    }

    if (directionDot <= TARGET_WPRIME_DIRECTION_DOT_MIN) {
        return {
            errors: [
                {
                    code: 'TARGET_WPRIME_DIRECTION_MISALIGNED',
                    message: `The aligned M'-W direction dot O-to-M' must exceed ${TARGET_WPRIME_DIRECTION_DOT_MIN}.`,
                },
            ],
        };
    }

    const WPrime: DraftPoint = {
        id: "W'",
        x: W.x + toeOutwardDirection.x * outwardOffsetCm,
        y: W.y + toeOutwardDirection.y * outwardOffsetCm,
    };
    const distanceFromW = distance(W, WPrime);
    const distanceFromMPrime = distance(MPrime, WPrime);
    const maximumLineDistanceCm = Math.max(
        lineDistance(W, MPrime, toeOutwardDirection),
        lineDistance(WPrime, MPrime, toeOutwardDirection),
    );
    const mPrimeToWProjectionCm =
        (W.x - MPrime.x) * toeOutwardDirection.x + (W.y - MPrime.y) * toeOutwardDirection.y;
    const wToWPrimeProjectionCm =
        (WPrime.x - W.x) * toeOutwardDirection.x + (WPrime.y - W.y) * toeOutwardDirection.y;
    const offsetErrorCm = distanceFromW - outwardOffsetCm;
    const wUnchangedDistanceCm = distance(W, inputW);

    const checks: TargetWPrimeGeometry['checks'] = {
        directionAlignment: {
            dot: directionDot,
            minimumDot: TARGET_WPRIME_DIRECTION_DOT_MIN,
            pass: directionDot > TARGET_WPRIME_DIRECTION_DOT_MIN,
        },
        collinearity: {
            maximumLineDistanceCm,
            toleranceCm: VALIDATION_TOLERANCE_CM,
            pass: maximumLineDistanceCm <= VALIDATION_TOLERANCE_CM,
        },
        directionOrder: {
            mPrimeToWProjectionCm,
            wToWPrimeProjectionCm,
            pass:
                mPrimeToWProjectionCm > GEOMETRY_EPSILON_CM &&
                wToWPrimeProjectionCm >= -VALIDATION_TOLERANCE_CM &&
                (outwardOffsetCm <= GEOMETRY_EPSILON_CM ||
                    wToWPrimeProjectionCm > GEOMETRY_EPSILON_CM),
        },
        offsetDistance: {
            actualCm: distanceFromW,
            expectedCm: outwardOffsetCm,
            errorCm: offsetErrorCm,
            toleranceCm: VALIDATION_TOLERANCE_CM,
            pass: Math.abs(offsetErrorCm) <= VALIDATION_TOLERANCE_CM,
        },
        wUnchanged: {
            distanceCm: wUnchangedDistanceCm,
            toleranceCm: GEOMETRY_EPSILON_CM,
            pass: wUnchangedDistanceCm <= GEOMETRY_EPSILON_CM,
        },
    };

    if (
        !checks.directionAlignment.pass ||
        !checks.collinearity.pass ||
        !checks.directionOrder.pass ||
        !checks.offsetDistance.pass ||
        !checks.wUnchanged.pass
    ) {
        return {
            errors: [
                {
                    code: 'TARGET_WPRIME_GEOMETRY_VALIDATION_FAILED',
                    message: "The constructed W' geometry did not satisfy all Step 5 invariants.",
                },
            ],
        };
    }

    return {
        geometry: {
            MPrime: { ...MPrime, id: "M'" },
            O: { ...O, id: 'O' },
            W: { ...W, id: 'W' },
            WPrime,
            toeOutwardDirection,
            frontFootDirection,
            directionDot,
            outwardOffsetCm,
            distanceFromW,
            distanceFromMPrimeToW: mPrimeWLength,
            distanceFromMPrime,
            checks,
        },
        errors: [],
    };
}
