import type { DraftPoint } from '../types';
import { GEOMETRY_EPSILON_CM } from './geometryUtils';

export interface PolylineTurningDiagnostics {
    turningAnglesDeg: number[];
    meanTurningDeg: number;
    maxTurningDeg: number;
    turningVariationDeg: number;
}

function turningAngleDegrees(previous: DraftPoint, current: DraftPoint, next: DraftPoint): number {
    const incomingX = current.x - previous.x;
    const incomingY = current.y - previous.y;
    const outgoingX = next.x - current.x;
    const outgoingY = next.y - current.y;
    const incomingMagnitude = Math.hypot(incomingX, incomingY);
    const outgoingMagnitude = Math.hypot(outgoingX, outgoingY);
    if (
        !Number.isFinite(incomingMagnitude) ||
        !Number.isFinite(outgoingMagnitude) ||
        incomingMagnitude <= GEOMETRY_EPSILON_CM ||
        outgoingMagnitude <= GEOMETRY_EPSILON_CM
    ) {
        return Number.NaN;
    }

    const cosine =
        (incomingX * outgoingX + incomingY * outgoingY) / (incomingMagnitude * outgoingMagnitude);
    return (Math.acos(Math.max(-1, Math.min(1, cosine))) * 180) / Math.PI;
}

/**
 * Derives turning statistics from one already-sampled open polyline.
 * Variation is the population standard deviation (RMS deviation) of its
 * finite interior turning angles.
 */
export function derivePolylineTurningDiagnostics(
    points: readonly DraftPoint[],
): PolylineTurningDiagnostics | undefined {
    const turningAnglesDeg: number[] = [];
    for (let index = 1; index < points.length - 1; index += 1) {
        const angle = turningAngleDegrees(points[index - 1], points[index], points[index + 1]);
        if (Number.isFinite(angle)) {
            turningAnglesDeg.push(angle);
        }
    }
    if (!turningAnglesDeg.length) {
        return undefined;
    }

    const meanTurningDeg =
        turningAnglesDeg.reduce((total, angle) => total + angle, 0) / turningAnglesDeg.length;
    const meanSquaredDeviation =
        turningAnglesDeg.reduce((total, angle) => {
            const deviation = angle - meanTurningDeg;
            return total + deviation * deviation;
        }, 0) / turningAnglesDeg.length;

    return {
        turningAnglesDeg,
        meanTurningDeg,
        maxTurningDeg: Math.max(...turningAnglesDeg),
        turningVariationDeg: Math.sqrt(meanSquaredDeviation),
    };
}
