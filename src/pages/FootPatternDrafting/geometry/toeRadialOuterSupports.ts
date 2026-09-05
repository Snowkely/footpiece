import type {
    DraftPoint,
    DraftVector2,
    GeometryBuildResult,
    ToeRadialOuterSupportGeometry,
    ToeRadialOuterSupportPoint,
    ToeRadialOuterSupportRayMultiplier,
    ToeRadialReferenceGeometry,
} from '../types';
import { normalizeVector } from './footAxis';
import { distance, GEOMETRY_EPSILON_CM, VALIDATION_TOLERANCE_CM } from './geometryUtils';

export const TOE_OUTER_SUPPORT_ANGLE_TOLERANCE_RAD = 1e-7;

export interface ToeRadialOuterSupportInput {
    Ms: DraftPoint;
    toeRadialReferences: ToeRadialReferenceGeometry;
    existingWPrime: DraftPoint;
    outwardOffsetCm: number;
}

interface ReferenceSpecification {
    referencePoint: DraftPoint;
    outerId: string;
    rayMultiplier: ToeRadialOuterSupportRayMultiplier;
}

function isFinitePoint(point: DraftPoint): boolean {
    return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function dot(first: DraftVector2, second: DraftVector2): number {
    return first.x * second.x + first.y * second.y;
}

function cross(first: DraftVector2, second: DraftVector2): number {
    return first.x * second.y - first.y * second.x;
}

function vectorBetween(start: DraftPoint, end: DraftPoint): DraftVector2 {
    return { x: end.x - start.x, y: end.y - start.y };
}

function angleBetween(first: DraftVector2, second: DraftVector2): number {
    const firstDirection = normalizeVector(first);
    const secondDirection = normalizeVector(second);
    if (!firstDirection || !secondDirection) {
        return Number.POSITIVE_INFINITY;
    }

    return Math.acos(Math.max(-1, Math.min(1, dot(firstDirection, secondDirection))));
}

function buildOuterSupport(
    origin: DraftPoint,
    specification: ReferenceSpecification,
    outwardOffsetCm: number,
): ToeRadialOuterSupportPoint | undefined {
    const referenceVector = vectorBetween(origin, specification.referencePoint);
    const direction = normalizeVector(referenceVector);
    const referenceDistanceFromMs = distance(origin, specification.referencePoint);
    if (!direction || referenceDistanceFromMs <= GEOMETRY_EPSILON_CM) {
        return undefined;
    }

    const outerPoint: DraftPoint = {
        id: specification.outerId,
        x: specification.referencePoint.x + direction.x * outwardOffsetCm,
        y: specification.referencePoint.y + direction.y * outwardOffsetCm,
    };
    const outerVector = vectorBetween(origin, outerPoint);
    const displacement = vectorBetween(specification.referencePoint, outerPoint);
    const outerDistanceFromMs = distance(origin, outerPoint);
    const outwardDistance = distance(specification.referencePoint, outerPoint);

    return {
        referencePoint: { ...specification.referencePoint },
        outerPoint,
        direction,
        rayMultiplier: specification.rayMultiplier,
        referenceDistanceFromMs,
        outerDistanceFromMs,
        outwardDistance,
        outwardProjectionCm: dot(displacement, direction),
        collinearityErrorCm: Math.abs(cross(direction, outerVector)),
        offsetErrorCm: outwardDistance - outwardOffsetCm,
        radialDistanceErrorCm: outerDistanceFromMs - (referenceDistanceFromMs + outwardOffsetCm),
        radialAngleErrorRad: angleBetween(referenceVector, outerVector),
    };
}

function asFiveValues(
    supports: ToeRadialOuterSupportPoint[],
    select: (support: ToeRadialOuterSupportPoint) => number,
): [number, number, number, number, number] {
    return supports.map(select) as [number, number, number, number, number];
}

/**
 * Step 6B only: moves the five frozen Step 6A toe references outward along
 * their own Ms radial rays by the single Step 5 exploration offset λ.
 */
export function deriveToeRadialOuterSupports({
    Ms,
    toeRadialReferences,
    existingWPrime,
    outwardOffsetCm,
}: ToeRadialOuterSupportInput): GeometryBuildResult<ToeRadialOuterSupportGeometry> {
    if (!Number.isFinite(outwardOffsetCm) || outwardOffsetCm < 0) {
        return {
            errors: [
                {
                    code: 'TOE_OUTER_SUPPORT_OFFSET_INVALID',
                    message: 'Toe radial outward offset λ must be finite and non-negative in cm.',
                },
            ],
        };
    }

    const toeArcW = toeRadialReferences.toeArcPoints[toeRadialReferences.wIndexOnToeArc];
    if (
        !isFinitePoint(Ms) ||
        !isFinitePoint(existingWPrime) ||
        !isFinitePoint(toeRadialReferences.origin) ||
        !toeArcW ||
        !isFinitePoint(toeArcW) ||
        distance(Ms, toeRadialReferences.origin) > VALIDATION_TOLERANCE_CM ||
        distance(toeRadialReferences.W, toeArcW) > VALIDATION_TOLERANCE_CM
    ) {
        return {
            errors: [
                {
                    code: 'TOE_OUTER_SUPPORT_DIRECTION_INVALID',
                    message: 'Step 6A Ms/W identities must be finite and unchanged for Step 6B.',
                },
            ],
        };
    }

    const specifications: ReferenceSpecification[] = [
        { referencePoint: toeRadialReferences.W1.point, outerId: "W1'", rayMultiplier: -2 },
        { referencePoint: toeRadialReferences.W2.point, outerId: "W2'", rayMultiplier: -1 },
        { referencePoint: toeRadialReferences.W, outerId: "W'", rayMultiplier: 0 },
        { referencePoint: toeRadialReferences.W3.point, outerId: "W3'", rayMultiplier: 1 },
        { referencePoint: toeRadialReferences.W4.point, outerId: "W4'", rayMultiplier: 2 },
    ];
    if (specifications.some(({ referencePoint }) => !isFinitePoint(referencePoint))) {
        return {
            errors: [
                {
                    code: 'TOE_OUTER_SUPPORT_DIRECTION_INVALID',
                    message: 'Every Step 6A toe reference point must have finite coordinates.',
                },
            ],
        };
    }

    const supports = specifications.map((specification) =>
        buildOuterSupport(Ms, specification, outwardOffsetCm),
    );
    if (supports.some((support) => !support)) {
        return {
            errors: [
                {
                    code: 'TOE_OUTER_SUPPORT_DIRECTION_INVALID',
                    message: 'Every Ms-to-Wi radial direction must be finite and non-zero.',
                },
            ],
        };
    }

    const [W1Prime, W2Prime, WPrime, W3Prime, W4Prime] = supports as ToeRadialOuterSupportPoint[];
    const builtSupports = [W1Prime, W2Prime, WPrime, W3Prime, W4Prime];
    const collinearityErrors = asFiveValues(
        builtSupports,
        (support) => support.collinearityErrorCm,
    );
    const outwardProjections = asFiveValues(
        builtSupports,
        (support) => support.outwardProjectionCm,
    );
    const offsetErrors = asFiveValues(builtSupports, (support) => support.offsetErrorCm);
    const radialDistanceErrors = asFiveValues(
        builtSupports,
        (support) => support.radialDistanceErrorCm,
    );
    const radialAngleErrors = asFiveValues(builtSupports, (support) => support.radialAngleErrorRad);
    const maximumCollinearityErrorCm = Math.max(...collinearityErrors);
    const maximumOffsetErrorCm = Math.max(...offsetErrors.map(Math.abs));
    const maximumRadialDistanceErrorCm = Math.max(...radialDistanceErrors.map(Math.abs));
    const maximumRadialAngleErrorRad = Math.max(...radialAngleErrors);
    const allOutward = outwardProjections.every(
        (projection) =>
            projection >= -VALIDATION_TOLERANCE_CM &&
            (outwardOffsetCm <= GEOMETRY_EPSILON_CM || projection > GEOMETRY_EPSILON_CM),
    );
    const centerWPrimeMismatch = distance(WPrime.outerPoint, existingWPrime);

    const checks: ToeRadialOuterSupportGeometry['checks'] = {
        allRadiallyCollinear: {
            errorsCm: collinearityErrors,
            maximumErrorCm: maximumCollinearityErrorCm,
            toleranceCm: VALIDATION_TOLERANCE_CM,
            pass: maximumCollinearityErrorCm <= VALIDATION_TOLERANCE_CM,
        },
        allOutward: {
            projectionsCm: outwardProjections,
            pass: allOutward,
        },
        allOffsetsEqual: {
            errorsCm: offsetErrors,
            maximumErrorCm: maximumOffsetErrorCm,
            toleranceCm: VALIDATION_TOLERANCE_CM,
            pass: maximumOffsetErrorCm <= VALIDATION_TOLERANCE_CM,
        },
        allRadialDistanceIncrements: {
            errorsCm: radialDistanceErrors,
            maximumErrorCm: maximumRadialDistanceErrorCm,
            toleranceCm: VALIDATION_TOLERANCE_CM,
            pass: maximumRadialDistanceErrorCm <= VALIDATION_TOLERANCE_CM,
        },
        allAnglesPreserved: {
            errorsRad: radialAngleErrors,
            maximumErrorRad: maximumRadialAngleErrorRad,
            toleranceRad: TOE_OUTER_SUPPORT_ANGLE_TOLERANCE_RAD,
            pass: maximumRadialAngleErrorRad <= TOE_OUTER_SUPPORT_ANGLE_TOLERANCE_RAD,
        },
        centerWPrimeMatchesStep5: {
            mismatchCm: centerWPrimeMismatch,
            toleranceCm: VALIDATION_TOLERANCE_CM,
            pass: centerWPrimeMismatch <= VALIDATION_TOLERANCE_CM,
        },
    };

    if (
        !checks.allRadiallyCollinear.pass ||
        !checks.allOutward.pass ||
        !checks.allAnglesPreserved.pass
    ) {
        return {
            errors: [
                {
                    code: 'TOE_OUTER_SUPPORT_DIRECTION_REVERSED',
                    message: 'A toe outer support did not remain on its forward Ms-to-Wi ray.',
                },
            ],
        };
    }
    if (!checks.allOffsetsEqual.pass || !checks.allRadialDistanceIncrements.pass) {
        return {
            errors: [
                {
                    code: 'TOE_OUTER_SUPPORT_OFFSET_MISMATCH',
                    message: 'Every toe outer support must add exactly the shared radial offset λ.',
                },
            ],
        };
    }
    if (!checks.centerWPrimeMatchesStep5.pass) {
        return {
            errors: [
                {
                    code: 'TOE_RADIAL_CENTER_WPRIME_MISMATCH',
                    message: "The radial center W' does not match the existing Step 5 W'.",
                },
            ],
        };
    }

    return {
        geometry: {
            thetaDeg: toeRadialReferences.thetaDeg,
            outwardOffsetCm,
            origin: { ...Ms, id: 'Ms' },
            W1Prime,
            W2Prime,
            WPrime,
            W3Prime,
            W4Prime,
            checks,
        },
        errors: [],
    };
}
