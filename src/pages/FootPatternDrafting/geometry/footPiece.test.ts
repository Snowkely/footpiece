import footPieceSampleJson from '../data/footPieceSample.json';
import type { DraftingParameters, FootPieceLandmarkId, FootPieceSample } from '../types';
import { buildBackPiece } from './backPiece';
import { alignFootPieceToFrontPiece, extractHeelArcRS, extractRQPSArc, midpoint, polylineLength } from './footPiece';
import { buildFrontPiece } from './frontPiece';
import { distance } from './geometryUtils';

const footPieceSample = footPieceSampleJson as FootPieceSample;
const parameters: DraftingParameters = {
    a: 21.6,
    b: 19.8,
    c: 22.5,
    d: 18.9,
    e: 21.6,
    f: 23.4,
    g: 7,
    r: 10,
};

function createFrontPiece() {
    const backPiece = buildBackPiece(parameters).geometry!;
    return buildFrontPiece(parameters, 'adult', backPiece.x, backPiece.z).geometry!;
}

describe('footPieceSample fixture', () => {
    it('contains explicit P/Q/R/S landmark POINT data', () => {
        (['P', 'Q', 'R', 'S'] as FootPieceLandmarkId[]).forEach((landmarkId) => {
            expect(footPieceSample.landmarks[landmarkId]).toEqual(
                expect.objectContaining({
                    id: landmarkId,
                    x: expect.any(Number),
                    y: expect.any(Number),
                }),
            );
        });
        expect(footPieceSample.source.shrinkedSpline.fitPointCount).toBe(0);
        expect(footPieceSample.source.shrinkedSpline.controlPointCount).toBe(43);
        expect(footPieceSample.shrinkedOutline).toHaveLength(400);
    });

    it('stores raw RS as the distance between the explicit R and S landmarks', () => {
        expect(footPieceSample.rawRS).toBeCloseTo(
            distance(footPieceSample.landmarks.R, footPieceSample.landmarks.S),
            10,
        );
    });
});

describe('extractRQPSArc', () => {
    it('selects the R-to-S path containing Q then P, not the opposite path', () => {
        const result = extractRQPSArc(
            footPieceSample.shrinkedOutline,
            footPieceSample.landmarkIndices,
        );
        const extraction = result.geometry!;
        const qPosition = extraction.outlineIndices.indexOf(footPieceSample.landmarkIndices.Q);
        const pPosition = extraction.outlineIndices.indexOf(footPieceSample.landmarkIndices.P);

        expect(result.errors).toEqual([]);
        expect(extraction.outlineIndices[0]).toBe(footPieceSample.landmarkIndices.R);
        expect(extraction.outlineIndices.at(-1)).toBe(footPieceSample.landmarkIndices.S);
        expect(qPosition).toBeGreaterThan(0);
        expect(pPosition).toBeGreaterThan(qPosition);
        expect(pPosition).toBeLessThan(extraction.outlineIndices.length - 1);
    });
});

describe('alignFootPieceToFrontPiece', () => {
    it( 'uses r / heel-arc-length as the unit scale and aligns the RS midpoint to M prime',  () => {
        const frontPiece = createFrontPiece();
        const aligned = alignFootPieceToFrontPiece(footPieceSample, frontPiece, parameters.r!)
            .geometry!;
        const rawHeelArcPoints = extractHeelArcRS(
            footPieceSample.shrinkedOutline,
            footPieceSample.landmarkIndices,
        ).geometry!.points.map((point) => ({ ...point }));
        rawHeelArcPoints[0] = { ...footPieceSample.landmarks.R };
        rawHeelArcPoints[rawHeelArcPoints.length - 1] = { ...footPieceSample.landmarks.S };
        const expectedRawHeelArcLength = polylineLength(rawHeelArcPoints);

        expect(aligned.scaleToCm).toBeCloseTo(parameters.r! / expectedRawHeelArcLength, 12);
        expect(aligned.rawHeelArcLength).toBeGreaterThan(aligned.rawRsChordLength,);
        expect(aligned.alignedRQPS[0]).toEqual(aligned.alignedLandmarks.R);
        expect(aligned.alignedRQPS.at(-1)).toEqual(aligned.alignedLandmarks.S);
        expect(
            distance(
                midpoint(aligned.alignedLandmarks.R, aligned.alignedLandmarks.S),
                frontPiece.points.MPrime,
            ),
        ).toBeLessThanOrEqual(aligned.checks.midpointToMPrime.toleranceCm);
        expect(aligned.checks.midpointToMPrime.pass).toBe(true);
    });

    it("aligns S-to-R with the same direction as M'-to-G", () => {
        const frontPiece = createFrontPiece();
        const aligned = alignFootPieceToFrontPiece(footPieceSample, frontPiece, parameters.r!)
            .geometry!;
        const sourceX = aligned.alignedLandmarks.R.x - aligned.alignedLandmarks.S.x;
        const sourceY = aligned.alignedLandmarks.R.y - aligned.alignedLandmarks.S.y;
        const targetX = frontPiece.points.G.x - frontPiece.points.MPrime.x;
        const targetY = frontPiece.points.G.y - frontPiece.points.MPrime.y;
        const crossProduct = sourceX * targetY - sourceY * targetX;
        const dotProduct = sourceX * targetX + sourceY * targetY;

        expect(crossProduct).toBeCloseTo(0, 10);
        expect(dotProduct).toBeGreaterThan(0);
        expect(aligned.checks.orientation.pass).toBe(true);
    });

    it('does not mutate the imported fixture points or landmarks', () => {
        const before = JSON.stringify(footPieceSample);

        alignFootPieceToFrontPiece(footPieceSample, createFrontPiece(), parameters.r!);

        expect(JSON.stringify(footPieceSample)).toBe(before);
    });
});

describe('extractHeelArcRS', () => {
    it(
        'selects the opposite R-to-S path that does not contain Q and P',
        () => {
            const result =
                extractHeelArcRS(
                    footPieceSample.shrinkedOutline,
                    footPieceSample.landmarkIndices,
                );

            const extraction =
                result.geometry!;

            expect(result.errors)
                .toEqual([]);

            expect(
                extraction.outlineIndices[0],
            ).toBe(
                footPieceSample.landmarkIndices.R,
            );

            expect(
                extraction.outlineIndices.at(-1),
            ).toBe(
                footPieceSample.landmarkIndices.S,
            );

            expect(
                extraction.outlineIndices,
            ).not.toContain(
                footPieceSample.landmarkIndices.Q,
            );

            expect(
                extraction.outlineIndices,
            ).not.toContain(
                footPieceSample.landmarkIndices.P,
            );
        },
    );
});
