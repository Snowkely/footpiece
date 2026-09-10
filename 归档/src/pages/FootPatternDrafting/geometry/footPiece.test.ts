import footPieceSampleJson from '../data/footPieceSample.json';
import type { DraftingParameters, FootPieceLandmarkId, FootPieceSample } from '../types';
import { buildBackPiece } from './backPiece';
import {
    alignFootPieceToFrontPiece,
    extractHeelArcRS,
    extractRQPSArc,
    polylineLength,
} from './footPiece';
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
    r: 16.8,
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
        expect(footPieceSample.source.fileName).toBe(
            'real_foot_piece_calibrated_4measurements_v4.dxf',
        );
        expect(footPieceSample.source.sha256).toBe(
            'de63d0d6623dabd80290bb67b8dc895209990ae1ee653a6b6bdabd25766874cd',
        );
        expect(footPieceSample.source.shrinkedSpline.layer).toBe('Layer3');
        expect(footPieceSample.source.originalSpline.layer).toBe('Layer2');
        expect(footPieceSample.source.shrinkedSpline.fitPointCount).toBe(221);
        expect(footPieceSample.source.shrinkedSpline.controlPointCount).toBe(0);
        expect(footPieceSample.shrinkedOutline).toHaveLength(400);
        expect(distance(footPieceSample.landmarks.P, footPieceSample.landmarks.Q)).toBeCloseTo(
            9.9,
            8,
        );
        expect(distance(footPieceSample.landmarks.R, footPieceSample.landmarks.S)).toBeCloseTo(
            6.7,
            8,
        );
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
    it("uses r / heel-arc-length as the unit scale and aligns source Ms to M'", () => {
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
        expect(aligned.rawHeelArcLength * aligned.scaleToCm).toBeCloseTo(16.8, 10);
        expect(aligned.rawHeelArcLength).toBeGreaterThan(aligned.rawRsChordLength);
        expect(aligned.alignedRQPS[0]).toEqual(aligned.alignedLandmarks.R);
        expect(aligned.alignedRQPS.at(-1)).toEqual(aligned.alignedLandmarks.S);
        expect(
            distance(aligned.automaticPositioning!.alignedSourceMs, frontPiece.points.MPrime),
        ).toBeLessThanOrEqual(aligned.automaticPositioning!.checks.sourceMsToMPrime.toleranceCm);
        expect(aligned.automaticPositioning!.checks.sourceMsToMPrime.pass).toBe(true);
    });

    it("aligns H*-to-W with O-to-M' and preserves heel/toe side orientation", () => {
        const frontPiece = createFrontPiece();
        const aligned = alignFootPieceToFrontPiece(footPieceSample, frontPiece, parameters.r!)
            .geometry!;
        const automatic = aligned.automaticPositioning!;
        const alignedAxis = {
            x: automatic.alignedSourceSecondToe.x - automatic.alignedSourceMidHeel.x,
            y: automatic.alignedSourceSecondToe.y - automatic.alignedSourceMidHeel.y,
        };
        const targetAxis = {
            x: frontPiece.points.MPrime.x - frontPiece.points.O.x,
            y: frontPiece.points.MPrime.y - frontPiece.points.O.y,
        };
        const alignedLength = Math.hypot(alignedAxis.x, alignedAxis.y);
        const targetLength = Math.hypot(targetAxis.x, targetAxis.y);
        const directionDot =
            (alignedAxis.x * targetAxis.x + alignedAxis.y * targetAxis.y) /
            (alignedLength * targetLength);

        expect(directionDot).toBeGreaterThan(0.999);
        expect(automatic.checks.axisToOMPrime.pass).toBe(true);
        expect(automatic.checks.heelToeSides.heelProjectionCm).toBeLessThan(0);
        expect(automatic.checks.heelToeSides.toeProjectionCm).toBeGreaterThan(0);
        expect(automatic.checks.heelToeSides.pass).toBe(true);
        expect(automatic.checks.uniformTransform.pass).toBe(true);
    });

    it('does not mutate the imported fixture points or landmarks', () => {
        const before = JSON.stringify(footPieceSample);

        alignFootPieceToFrontPiece(footPieceSample, createFrontPiece(), parameters.r!);

        expect(JSON.stringify(footPieceSample)).toBe(before);
    });
});

describe('extractHeelArcRS', () => {
    it('selects the opposite R-to-S path that does not contain Q and P', () => {
        const result = extractHeelArcRS(
            footPieceSample.shrinkedOutline,
            footPieceSample.landmarkIndices,
        );

        const extraction = result.geometry!;

        expect(result.errors).toEqual([]);

        expect(extraction.outlineIndices[0]).toBe(footPieceSample.landmarkIndices.R);

        expect(extraction.outlineIndices.at(-1)).toBe(footPieceSample.landmarkIndices.S);

        expect(extraction.outlineIndices).not.toContain(footPieceSample.landmarkIndices.Q);

        expect(extraction.outlineIndices).not.toContain(footPieceSample.landmarkIndices.P);
    });
});
