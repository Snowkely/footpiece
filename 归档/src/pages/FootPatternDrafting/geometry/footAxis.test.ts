import footPieceSampleJson from '../data/footPieceSample.json';
import type { DraftPoint, FootPieceLandmarkId, FootPieceSample } from '../types';
import {
    buildAutomaticSourceFootAxis,
    extractQPToeArc,
    findAutomaticMidHeel,
    findAutomaticSecondToe,
    intersectInfiniteLines,
    MID_HEEL_TANGENT_DOT_TOLERANCE,
    pointAtPolylineIdentity,
    raySegmentIntersection,
} from './footAxis';
import { extractHeelArcRS, extractRQPSArc } from './footPiece';
import { distance } from './geometryUtils';

const sample = footPieceSampleJson as FootPieceSample;

function exactSourceArcs() {
    const heel = extractHeelArcRS(
        sample.shrinkedOutline,
        sample.landmarkIndices,
    ).geometry!.points.map((point) => ({ ...point }));
    heel[0] = { ...sample.landmarks.R };
    heel[heel.length - 1] = { ...sample.landmarks.S };

    const rqpsExtraction = extractRQPSArc(sample.shrinkedOutline, sample.landmarkIndices).geometry!;
    const rqps = rqpsExtraction.points.map((point) => ({ ...point }));
    (['R', 'Q', 'P', 'S'] as FootPieceLandmarkId[]).forEach((landmarkId) => {
        const arcIndex = rqpsExtraction.outlineIndices.indexOf(sample.landmarkIndices[landmarkId]);
        rqps[arcIndex] = { ...sample.landmarks[landmarkId] };
    });
    return { heel, rqps };
}

function cross(first: { x: number; y: number }, second: { x: number; y: number }): number {
    return first.x * second.y - first.y * second.x;
}

function direction(start: DraftPoint, end: DraftPoint) {
    return { x: end.x - start.x, y: end.y - start.y };
}

describe('automatic source mid heel H*', () => {
    it('builds a normalized ankle-to-forefoot direction', () => {
        const { heel } = exactSourceArcs();
        const result = findAutomaticMidHeel(
            heel,
            sample.landmarks.P,
            sample.landmarks.Q,
            sample.landmarks.R,
            sample.landmarks.S,
        ).geometry!;
        const ankleCenter = {
            x: (sample.landmarks.R.x + sample.landmarks.S.x) / 2,
            y: (sample.landmarks.R.y + sample.landmarks.S.y) / 2,
        };
        const forefootCenter = {
            x: (sample.landmarks.P.x + sample.landmarks.Q.x) / 2,
            y: (sample.landmarks.P.y + sample.landmarks.Q.y) / 2,
        };
        const ankleToForefoot = direction(
            { id: 'ankle', ...ankleCenter },
            { id: 'forefoot', ...forefootCenter },
        );

        expect(Math.hypot(result.footDirection.x, result.footDirection.y)).toBeCloseTo(1, 12);
        expect(
            result.footDirection.x * ankleToForefoot.x + result.footDirection.y * ankleToForefoot.y,
        ).toBeGreaterThan(0);
    });

    it('starts at the heel-direction projection extremum and refines to segment+t', () => {
        const { heel } = exactSourceArcs();
        const result = findAutomaticMidHeel(
            heel,
            sample.landmarks.P,
            sample.landmarks.Q,
            sample.landmarks.R,
            sample.landmarks.S,
        ).geometry!;
        const reconstructed = pointAtPolylineIdentity(
            heel,
            {
                segmentIndex: result.heelArcSegmentIndex,
                segmentT: result.heelArcSegmentT,
            },
            'H*',
        )!;

        expect(result.extremumProjection).toBe(
            Math.min(...result.candidates.map((candidate) => candidate.longitudinalProjection)),
        );
        expect(result.projectionError).toBeLessThanOrEqual(result.projectionTolerance);
        expect(distance(reconstructed, result.point)).toBeLessThan(1e-9);
        expect(result.heelArcSegmentT).toBeGreaterThan(0);
        expect(result.heelArcSegmentT).toBeLessThan(1);
    });

    it('estimates a non-zero normalized tangent nearly perpendicular to footDirection', () => {
        const { heel } = exactSourceArcs();
        const result = findAutomaticMidHeel(
            heel,
            sample.landmarks.P,
            sample.landmarks.Q,
            sample.landmarks.R,
            sample.landmarks.S,
        ).geometry!;

        expect(Math.hypot(result.tangent.x, result.tangent.y)).toBeCloseTo(1, 12);
        expect(result.orthogonalityError).toBeLessThanOrEqual(MID_HEEL_TANGENT_DOT_TOLERANCE);
        expect(
            Math.abs(
                result.tangent.x * result.normalTowardToe.x +
                    result.tangent.y * result.normalTowardToe.y,
            ),
        ).toBeLessThan(1e-12);
        expect(
            result.normalTowardToe.x * result.footDirection.x +
                result.normalTowardToe.y * result.footDirection.y,
        ).toBeGreaterThan(0);
    });

    it('fails closed when the heel arc cannot support stable detection', () => {
        const result = findAutomaticMidHeel(
            [sample.landmarks.R, sample.landmarks.S],
            sample.landmarks.P,
            sample.landmarks.Q,
            sample.landmarks.R,
            sample.landmarks.S,
        );

        expect(result.geometry).toBeUndefined();
        expect(result.errors[0].code).toBe('FOOT_MID_HEEL_DETECTION_AMBIGUOUS');
    });
});

describe('automatic second toe W and source Ms', () => {
    it('extracts only the ordered Q-to-P sub-arc from RQPS', () => {
        const { rqps } = exactSourceArcs();
        const toeArc = extractQPToeArc(rqps).geometry!.points;

        expect(toeArc[0]).toEqual(sample.landmarks.Q);
        expect(toeArc.at(-1)).toEqual(sample.landmarks.P);
        expect(toeArc.length).toBeGreaterThan(2);
    });

    it('intersects the forward H* normal with Q-P and preserves the W source identity', () => {
        const { heel, rqps } = exactSourceArcs();
        const HStar = findAutomaticMidHeel(
            heel,
            sample.landmarks.P,
            sample.landmarks.Q,
            sample.landmarks.R,
            sample.landmarks.S,
        ).geometry!;
        const toeArc = extractQPToeArc(rqps).geometry!.points;
        const W = findAutomaticSecondToe(HStar, toeArc).geometry!;
        const reconstructed = pointAtPolylineIdentity(
            toeArc,
            { segmentIndex: W.toeArcSegmentIndex, segmentT: W.toeArcSegmentT },
            'W',
        )!;

        expect(W.rayDistance).toBeGreaterThan(0);
        expect(W.intersectionCandidateCount).toBe(1);
        expect(distance(reconstructed, W.point)).toBeLessThan(1e-8);
    });

    it('provides general ray-segment and infinite-line intersections', () => {
        const rayHit = raySegmentIntersection(
            { id: 'origin', x: 0, y: 0 },
            { x: 1, y: 0 },
            { id: 'a', x: 2, y: -1 },
            { id: 'b', x: 2, y: 1 },
        )!;
        const lineHit = intersectInfiniteLines(
            { id: 'a', x: 0, y: 0 },
            { id: 'b', x: 0, y: 2 },
            { id: 'c', x: -1, y: 1 },
            { id: 'd', x: 1, y: 1 },
        )!;

        expect(rayHit.point).toMatchObject({ x: 2, y: 0 });
        expect(rayHit.rayT).toBeCloseTo(2, 12);
        expect(lineHit).toMatchObject({ x: 0, y: 1 });
    });

    it('derives source Ms from the H*-W and R-S infinite lines, not their midpoint', () => {
        const { heel, rqps } = exactSourceArcs();
        const source = buildAutomaticSourceFootAxis(heel, rqps, sample.landmarks).geometry!;
        const hw = direction(source.sourceMidHeel.point, source.sourceSecondToe.point);
        const hToMs = direction(source.sourceMidHeel.point, source.sourceMs);
        const rs = direction(sample.landmarks.R, sample.landmarks.S);
        const rToMs = direction(sample.landmarks.R, source.sourceMs);

        expect(Math.abs(cross(hw, hToMs))).toBeLessThan(1e-7);
        expect(Math.abs(cross(rs, rToMs))).toBeLessThan(1e-7);
        expect(source.sourceMsVsRsMidpointDistanceRaw).toBeGreaterThan(1e-6);
        expect(source.hwDistanceRaw).toBeGreaterThan(0);
    });
});
