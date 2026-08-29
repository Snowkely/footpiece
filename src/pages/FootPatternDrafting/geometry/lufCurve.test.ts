import footPieceSampleJson from '../data/footPieceSample.json';
import type { DraftingParameters, DraftPoint, FootPieceSample } from '../types';
import { buildBackPiece } from './backPiece';
import { polylineLength } from './curveUtils';
import { alignFootPieceToFrontPiece } from './footPiece';
import { buildFrontPiece } from './frontPiece';
import { distance } from './geometryUtils';
import {
    buildLufCurve,
    buildUtPoints,
    createFPrime,
    findReferenceCentreLinePointF,
    LUF_CURVE_SAMPLE_SEGMENTS,
    sampleInterpolatingLufCurve,
} from './lufCurve';

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

function point(id: string, x: number, y: number): DraftPoint {
    return { id, x, y };
}

function createAlignedGeometry() {
    const backPiece = buildBackPiece(parameters).geometry!;
    const frontPiece = buildFrontPiece(parameters, 'adult', backPiece.x, backPiece.z).geometry!;
    const footPiece = alignFootPieceToFrontPiece(footPieceSample, frontPiece, parameters.r!)
        .geometry!;

    return { frontPiece, footPiece };
}

describe('findReferenceCentreLinePointF', () => {
    it("finds the valid downward intersection between the M' centre line and alignedRQPS", () => {
        const MPrime = point("M'", 0, 0);
        const reference = [
            point('R', 3, 0),
            point('Q', 2, -3),
            point('toe', -2, -5),
            point('P', -3, -2),
            point('S', -3, 0),
        ];
        const result = findReferenceCentreLinePointF(reference, MPrime);

        expect(result.errors).toEqual([]);
        expect(result.geometry?.x).toBe(MPrime.x);
        expect(result.geometry?.y).toBeLessThan(MPrime.y);
    });
});

describe("F' construction", () => {
    it("keeps F' collinear with M'/F and moves it farther outward", () => {
        const MPrime = point("M'", 0, 0);
        const F = point('F', 0, -5);
        const FPrime = createFPrime(F, MPrime, 1.5).geometry!;
        const crossProduct =
            (F.x - MPrime.x) * (FPrime.y - MPrime.y) - (F.y - MPrime.y) * (FPrime.x - MPrime.x);

        expect(crossProduct).toBeCloseTo(0, 12);
        expect(distance(MPrime, FPrime)).toBeGreaterThan(distance(MPrime, F));
        expect(distance(F, FPrime)).toBeCloseTo(1.5);
    });
});

describe('U/T construction', () => {
    const P = point('P', -2, -3);
    const Q = point('Q', 2, -3);

    it('keeps U/P/Q/T collinear and enforces UT = a', () => {
        const construction = buildUtPoints(P, Q, 10, 0.25).geometry!;
        const crossProduct =
            (Q.x - P.x) * (construction.U.y - P.y) - (Q.y - P.y) * (construction.U.x - P.x);

        expect(crossProduct).toBeCloseTo(0, 12);
        expect(distance(construction.U, construction.T)).toBeCloseTo(10);
    });

    it('distributes UP and QT equally when alpha is 0.5', () => {
        const construction = buildUtPoints(P, Q, 10, 0.5).geometry!;

        expect(construction.upLengthCm).toBeCloseTo(construction.qtLengthCm);
    });

    it('distributes UP:QT as 2:1 when alpha is 2/3', () => {
        const construction = buildUtPoints(P, Q, 10, 2 / 3).geometry!;

        expect(construction.upLengthCm / construction.qtLengthCm).toBeCloseTo(2);
    });

    it('fails closed when a is shorter than PQ', () => {
        const result = buildUtPoints(P, Q, 3, 0.5);

        expect(result.geometry).toBeUndefined();
        expect(result.errors[0].code).toBe('LUT_CURVE_A_SHORTER_THAN_PQ');
    });
});

describe("continuous L-U-F'-T-G' spline", () => {
    it("starts at L, ends at G', and samples each interpolation anchor", () => {
        const anchors = [
            point('L', -5, -1),
            point('U', -4, -4),
            point("F'", 0, -7),
            point('T', 4, -4),
            point("G'", 5, -1),
        ];
        const sampledCurve = sampleInterpolatingLufCurve(anchors).geometry!;

        expect(sampledCurve).toHaveLength(LUF_CURVE_SAMPLE_SEGMENTS + 1);
        expect(distance(sampledCurve[0], anchors[0])).toBeLessThan(1e-9);
        expect(distance(sampledCurve.at(-1)!, anchors.at(-1)!)).toBeLessThan(1e-9);
        [anchors[1], anchors[2], anchors[3]].forEach((anchor) => {
            expect(Math.min(...sampledCurve.map((point) => distance(point, anchor)))).toBeLessThan(
                1e-9,
            );
        });
    });

    it('stores the candidate length as the dense sampled polyline length', () => {
        const { frontPiece, footPiece } = createAlignedGeometry();
        const result = buildLufCurve(footPiece, frontPiece, parameters.a, {
            upQtDistribution: 0.5,
            fPrimeOffsetCm: 1,
        });

        expect(result.errors).toEqual([]);
        expect(result.geometry?.F.x).toBeCloseTo(frontPiece.points.MPrime.x);
        expect(result.geometry?.curveLengthCm).toBeCloseTo(
            polylineLength(result.geometry!.sampledCurve),
            12,
        );
        expect(result.geometry?.checks.utLength.pass).toBe(true);
        expect(result.geometry?.checks.fPrimeDirection.pass).toBe(true);
    });
});
