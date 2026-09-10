import footPieceSampleJson from '../data/footPieceSample.json';
import type {
    AlignedFootPieceGeometry,
    DraftingParameters,
    DraftPoint,
    FootPieceSample,
    FrontPieceGeometry,
} from '../types';
import { buildBackPiece } from './backPiece';
import { alignFootPieceToFrontPiece } from './footPiece';
import { buildFrontPiece } from './frontPiece';
import { distance } from './geometryUtils';
import {
    deriveTargetAnkleIntersections,
    intersectRayWithClosedPolyline,
    pointAtClosedPolylineIdentity,
} from './targetAnkle';

const sample = footPieceSampleJson as FootPieceSample;
const parameters: DraftingParameters = {
    a: 21.6,
    b: 19.8,
    c: 22.5,
    d: 18.9,
    e: 21.6,
    f: 23.4,
    g: 7,
    r: 16.8,
};

function createStepOneGeometry(): {
    aligned: AlignedFootPieceGeometry;
    frontPiece: FrontPieceGeometry;
} {
    const backPiece = buildBackPiece(parameters).geometry!;
    const frontPiece = buildFrontPiece(parameters, 'adult', backPiece.x, backPiece.z).geometry!;
    const aligned = alignFootPieceToFrontPiece(sample, frontPiece, parameters.r!).geometry!;
    return { aligned, frontPiece };
}

function projection(origin: DraftPoint, point: DraftPoint, direction: { x: number; y: number }) {
    return (point.x - origin.x) * direction.x + (point.y - origin.y) * direction.y;
}

function clonePoint(point: DraftPoint, id = point.id): DraftPoint {
    return { id, x: point.x, y: point.y };
}

describe('intersectRayWithClosedPolyline', () => {
    const multiCrossingOutline: DraftPoint[] = [
        { id: 'a', x: 1, y: -1 },
        { id: 'b', x: 1, y: 1 },
        { id: 'c', x: 2, y: 1 },
        { id: 'd', x: 2, y: -1 },
        { id: 'e', x: 3, y: -1 },
        { id: 'f', x: 3, y: 1 },
        { id: 'g', x: -1, y: 1 },
        { id: 'h', x: -1, y: -1 },
    ];

    it('returns all distinct closed-outline hits sorted by minimum positive rayT', () => {
        const hits = intersectRayWithClosedPolyline(
            { id: 'origin', x: 0, y: 0 },
            { x: 1, y: 0 },
            multiCrossingOutline,
        );

        expect(hits.map((hit) => hit.rayT)).toEqual([1, 2, 3]);
        expect(hits[0].rayT).toBeLessThan(hits.at(-1)!.rayT);
    });

    it('supports the opposite ray independently', () => {
        const hits = intersectRayWithClosedPolyline(
            { id: 'origin', x: 0, y: 0 },
            { x: -1, y: 0 },
            multiCrossingOutline,
        );

        expect(hits).toHaveLength(1);
        expect(hits[0].rayT).toBeCloseTo(1, 12);
    });
});

describe('deriveTargetAnkleIntersections', () => {
    it("derives the target direction from M' to G and takes each ray's nearest hit", () => {
        const { aligned, frontPiece } = createStepOneGeometry();
        const geometry = deriveTargetAnkleIntersections(aligned, frontPiece).geometry!;
        const targetLength = distance(frontPiece.points.MPrime, frontPiece.points.G);
        const expectedDirection = {
            x: (frontPiece.points.G.x - frontPiece.points.MPrime.x) / targetLength,
            y: (frontPiece.points.G.y - frontPiece.points.MPrime.y) / targetLength,
        };
        const positiveHits = intersectRayWithClosedPolyline(
            frontPiece.points.MPrime,
            expectedDirection,
            aligned.alignedShrinkedOutline,
        );
        const negativeHits = intersectRayWithClosedPolyline(
            frontPiece.points.MPrime,
            { x: -expectedDirection.x, y: -expectedDirection.y },
            aligned.alignedShrinkedOutline,
        );

        expect(geometry.targetDirection).toEqual(expectedDirection);
        expect(geometry.positiveRayIntersectionCount).toBe(positiveHits.length);
        expect(geometry.negativeRayIntersectionCount).toBe(negativeHits.length);
        expect(Math.min(geometry.rStarRayT, geometry.sStarRayT)).toBeCloseTo(
            Math.min(positiveHits[0].rayT, negativeHits[0].rayT),
            12,
        );
        expect([geometry.rStarRayT, geometry.sStarRayT].sort((a, b) => a - b)).toEqual(
            [positiveHits[0].rayT, negativeHits[0].rayT].sort((a, b) => a - b),
        );
    });

    it('uses the nearest intersection rather than a farther crossing', () => {
        const { aligned, frontPiece } = createStepOneGeometry();
        const multiCrossingOutline: DraftPoint[] = [
            { id: 'a', x: 1, y: -1 },
            { id: 'b', x: 1, y: 1 },
            { id: 'c', x: 2, y: 1 },
            { id: 'd', x: 2, y: -1 },
            { id: 'e', x: 3, y: -1 },
            { id: 'f', x: 3, y: 1 },
            { id: 'g', x: -1, y: 1 },
            { id: 'h', x: -1, y: -1 },
        ];
        const synthetic: AlignedFootPieceGeometry = {
            ...aligned,
            alignedShrinkedOutline: multiCrossingOutline,
        };
        const geometry = deriveTargetAnkleIntersections(synthetic, frontPiece).geometry!;

        expect(geometry.positiveRayIntersectionCount).toBe(3);
        expect(geometry.RStar.x).toBeCloseTo(1, 12);
        expect(geometry.rStarRayT).toBeCloseTo(1, 12);
    });

    it('preserves R*/S* semantic identity from original R/S projections, not screen sides', () => {
        const { aligned, frontPiece } = createStepOneGeometry();
        const rotate = (point: DraftPoint): DraftPoint => ({
            id: point.id,
            x: -point.y,
            y: point.x,
        });
        const rotatedAligned: AlignedFootPieceGeometry = {
            ...aligned,
            alignedShrinkedOutline: aligned.alignedShrinkedOutline.map(rotate),
            alignedLandmarks: {
                P: rotate(aligned.alignedLandmarks.P),
                Q: rotate(aligned.alignedLandmarks.Q),
                R: rotate(aligned.alignedLandmarks.R),
                S: rotate(aligned.alignedLandmarks.S),
            },
        };
        const rotatedFront: FrontPieceGeometry = {
            ...frontPiece,
            points: {
                ...frontPiece.points,
                MPrime: rotate(frontPiece.points.MPrime),
                G: rotate(frontPiece.points.G),
            },
        };
        const geometry = deriveTargetAnkleIntersections(rotatedAligned, rotatedFront).geometry!;

        expect(geometry.originalRProjection).toBeGreaterThan(0);
        expect(geometry.originalSProjection).toBeLessThan(0);
        expect(
            projection(rotatedFront.points.MPrime, geometry.RStar, geometry.targetDirection),
        ).toBeGreaterThan(0);
        expect(
            projection(rotatedFront.points.MPrime, geometry.SStar, geometry.targetDirection),
        ).toBeLessThan(0);
        expect(geometry.RStar.x).toBeCloseTo(geometry.SStar.x, 10);
    });

    it('follows reversed source R/S semantic sides without renaming by positive/negative ray', () => {
        const { aligned, frontPiece } = createStepOneGeometry();
        const reversedSemantics: AlignedFootPieceGeometry = {
            ...aligned,
            alignedLandmarks: {
                ...aligned.alignedLandmarks,
                R: clonePoint(aligned.alignedLandmarks.S, 'R'),
                S: clonePoint(aligned.alignedLandmarks.R, 'S'),
            },
        };
        const geometry = deriveTargetAnkleIntersections(reversedSemantics, frontPiece).geometry!;

        expect(geometry.originalRProjection).toBeLessThan(0);
        expect(geometry.originalSProjection).toBeGreaterThan(0);
        expect(geometry.RStar.x).toBeLessThan(0);
        expect(geometry.SStar.x).toBeGreaterThan(0);
    });

    it("stores stable outline identities and places M' between collinear R*/S*", () => {
        const { aligned, frontPiece } = createStepOneGeometry();
        const geometry = deriveTargetAnkleIntersections(aligned, frontPiece).geometry!;
        const reconstructedR = pointAtClosedPolylineIdentity(
            aligned.alignedShrinkedOutline,
            geometry.rStarOutlineSegmentIndex,
            geometry.rStarOutlineSegmentT,
        )!;
        const reconstructedS = pointAtClosedPolylineIdentity(
            aligned.alignedShrinkedOutline,
            geometry.sStarOutlineSegmentIndex,
            geometry.sStarOutlineSegmentT,
        )!;

        expect(distance(reconstructedR, geometry.RStar)).toBeLessThan(1e-8);
        expect(distance(reconstructedS, geometry.SStar)).toBeLessThan(1e-8);
        expect(geometry.rStarLineDistanceCm).toBeLessThan(1e-8);
        expect(geometry.sStarLineDistanceCm).toBeLessThan(1e-8);
        expect(geometry.rStarRayT).toBeGreaterThan(0);
        expect(geometry.sStarRayT).toBeGreaterThan(0);
        expect(geometry.ankleSpan).toBeCloseTo(geometry.mPrimeToRStar + geometry.mPrimeToSStar, 10);
        expect(geometry.spanDecompositionErrorCm).toBeLessThan(1e-8);
    });

    it('does not mutate aligned Step-1 H*/W/Ms or any aligned outline point', () => {
        const { aligned, frontPiece } = createStepOneGeometry();
        const before = JSON.stringify(aligned);

        deriveTargetAnkleIntersections(aligned, frontPiece);

        expect(JSON.stringify(aligned)).toBe(before);
        expect(aligned.automaticPositioning?.checks.axisToOMPrime.pass).toBe(true);
        expect(aligned.automaticPositioning?.checks.sourceMsToMPrime.pass).toBe(true);
    });

    it('keeps large asymmetry as a diagnostic and applies no one-centimeter rule', () => {
        const { aligned, frontPiece } = createStepOneGeometry();
        const stretchPositiveSide = (point: DraftPoint): DraftPoint => ({
            ...point,
            x: point.x > 0 ? point.x * 3 : point.x,
        });
        const asymmetric: AlignedFootPieceGeometry = {
            ...aligned,
            alignedShrinkedOutline: aligned.alignedShrinkedOutline.map(stretchPositiveSide),
            alignedLandmarks: {
                ...aligned.alignedLandmarks,
                R: stretchPositiveSide(aligned.alignedLandmarks.R),
            },
        };
        const result = deriveTargetAnkleIntersections(asymmetric, frontPiece);

        expect(result.errors).toEqual([]);
        expect(result.geometry!.asymmetry).toBeGreaterThan(1);
        expect(result.geometry!.asymmetry).toBeCloseTo(
            Math.abs(result.geometry!.mPrimeToRStar - result.geometry!.mPrimeToSStar),
            12,
        );
    });

    it('fails closed for an invalid target direction', () => {
        const { aligned, frontPiece } = createStepOneGeometry();
        const invalidFront: FrontPieceGeometry = {
            ...frontPiece,
            points: {
                ...frontPiece.points,
                G: clonePoint(frontPiece.points.MPrime, 'G'),
            },
        };
        const result = deriveTargetAnkleIntersections(aligned, invalidFront);

        expect(result.geometry).toBeUndefined();
        expect(result.errors[0].code).toBe('TARGET_ANKLE_DIRECTION_INVALID');
    });

    it('fails closed when original R/S semantic sides are ambiguous', () => {
        const { aligned, frontPiece } = createStepOneGeometry();
        const ambiguous: AlignedFootPieceGeometry = {
            ...aligned,
            alignedLandmarks: {
                ...aligned.alignedLandmarks,
                S: clonePoint(aligned.alignedLandmarks.R, 'S'),
            },
        };
        const result = deriveTargetAnkleIntersections(ambiguous, frontPiece);

        expect(result.geometry).toBeUndefined();
        expect(result.errors[0].code).toBe('SOURCE_RS_SIDE_AMBIGUOUS');
    });

    it('fails closed when either target ray has no outline intersection', () => {
        const { aligned, frontPiece } = createStepOneGeometry();
        const positiveOnly: AlignedFootPieceGeometry = {
            ...aligned,
            alignedShrinkedOutline: aligned.alignedShrinkedOutline.map((point) => ({
                ...point,
                x: point.x + 20,
            })),
        };
        const negativeOnly: AlignedFootPieceGeometry = {
            ...aligned,
            alignedShrinkedOutline: aligned.alignedShrinkedOutline.map((point) => ({
                ...point,
                x: point.x - 20,
            })),
        };

        expect(deriveTargetAnkleIntersections(positiveOnly, frontPiece).errors[0].code).toBe(
            'TARGET_ANKLE_NEGATIVE_INTERSECTION_NOT_FOUND',
        );
        expect(deriveTargetAnkleIntersections(negativeOnly, frontPiece).errors[0].code).toBe(
            'TARGET_ANKLE_POSITIVE_INTERSECTION_NOT_FOUND',
        );
    });

    it('fails closed when the two target intersections are degenerate', () => {
        const { aligned, frontPiece } = createStepOneGeometry();
        const tinyOutline: DraftPoint[] = [
            { id: 'a', x: -0.001, y: -0.001 },
            { id: 'b', x: 0.001, y: -0.001 },
            { id: 'c', x: 0.001, y: 0.001 },
            { id: 'd', x: -0.001, y: 0.001 },
        ];
        const degenerate: AlignedFootPieceGeometry = {
            ...aligned,
            alignedShrinkedOutline: tinyOutline,
        };
        const result = deriveTargetAnkleIntersections(degenerate, frontPiece);

        expect(result.geometry).toBeUndefined();
        expect(result.errors[0].code).toBe('TARGET_ANKLE_INTERSECTIONS_DEGENERATE');
    });
});
