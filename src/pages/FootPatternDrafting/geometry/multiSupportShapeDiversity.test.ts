import type { DraftPoint, TargetMultiSupportOuterCurveCandidate } from '../types';
import type {
    MultiSupportQualityPoolResult,
    QualityPoolCandidateSummary,
} from './multiSupportQualityPool';
import {
    buildShapeDescriptors,
    computeRmsShapeDistance,
    resamplePolylineByNormalizedArcLength,
    selectMaxMinShapeDiverseCandidates,
    SHAPE_DESCRIPTOR_POINTS,
    type ShapeDescriptorEntry,
} from './multiSupportShapeDiversity';

function point(id: string, x: number, y: number): DraftPoint {
    return { id, x, y };
}

function candidate(sourceCandidateId: number, softScore: number): QualityPoolCandidateSummary {
    return {
        sourceCandidateId,
        alpha: sourceCandidateId / 10,
        thetaDeg: 10 + sourceCandidateId,
        lambdaCm: 1 + sourceCandidateId / 10,
        softScore,
        diagnostics: {
            lEndpointMismatchDeg: softScore,
            gPrimeEndpointMismatchDeg: softScore,
            maxToeTurningDeg: softScore,
            toeTurningVariationDeg: softScore,
        },
        referenceLengthCm: 35,
        outerLengthCm: 36.5,
        extraLengthCm: 1.5,
    };
}

function descriptor(sourceCandidateId: number, softScore: number, y: number): ShapeDescriptorEntry {
    return {
        candidate: candidate(sourceCandidateId, softScore),
        points: [point('L', 0, y), point('middle', 1, y), point('GPrime', 2, y)],
    };
}

describe('normalized arc-length shape descriptor', () => {
    it('returns 101 deterministic points with exact endpoints and segment interpolation', () => {
        const polyline = [point('L', 0, 0), point('corner', 1, 0), point('GPrime', 1, 3)];
        const first = resamplePolylineByNormalizedArcLength(polyline).geometry!;
        const second = resamplePolylineByNormalizedArcLength(polyline).geometry!;
        const five = resamplePolylineByNormalizedArcLength(polyline, 5).geometry!;

        expect(first).toHaveLength(SHAPE_DESCRIPTOR_POINTS);
        expect(first[0]).toEqual(polyline[0]);
        expect(first.at(-1)).toEqual(polyline.at(-1));
        expect(first).toEqual(second);
        expect(five.map(({ x, y }) => ({ x, y }))).toEqual([
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 1, y: 1 },
            { x: 1, y: 2 },
            { x: 1, y: 3 },
        ]);
    });

    it('fails closed for a zero-length or malformed polyline', () => {
        expect(
            resamplePolylineByNormalizedArcLength([point('a', 1, 1), point('b', 1, 1)]).errors[0]
                .code,
        ).toBe('SHAPE_DESCRIPTOR_POLYLINE_DEGENERATE');
        expect(resamplePolylineByNormalizedArcLength([point('a', 0, 0)]).errors[0].code).toBe(
            'SHAPE_DESCRIPTOR_POLYLINE_INVALID',
        );
    });
});

describe('RMS shape distance', () => {
    const base = [point('a', 0, 0), point('b', 1, 0), point('c', 2, 0)];

    it('is zero for identical descriptors, symmetric, positive, and remains in cm', () => {
        const shiftedHalfCm = base.map((value) => ({ ...value, y: value.y + 0.5 }));
        const shiftedOneCm = base.map((value) => ({ ...value, y: value.y + 1 }));

        expect(computeRmsShapeDistance(base, base).geometry).toBe(0);
        expect(computeRmsShapeDistance(base, shiftedHalfCm).geometry).toBeCloseTo(0.5, 12);
        expect(computeRmsShapeDistance(shiftedHalfCm, base).geometry).toBeCloseTo(0.5, 12);
        expect(computeRmsShapeDistance(base, shiftedOneCm).geometry).toBeCloseTo(1, 12);
        expect(computeRmsShapeDistance(base, shiftedOneCm).geometry!).toBeGreaterThan(
            computeRmsShapeDistance(base, shiftedHalfCm).geometry!,
        );
    });

    it('does not align coordinates before comparison', () => {
        const translated = base.map((value) => ({ ...value, x: value.x + 2, y: value.y + 3 }));
        expect(computeRmsShapeDistance(base, translated).geometry).toBeCloseTo(
            Math.hypot(2, 3),
            12,
        );
    });
});

describe('Max-Min Shape Diversity selection', () => {
    it('selects lowest quality score first, farthest second, then maximum minimum distance', () => {
        const result = selectMaxMinShapeDiverseCandidates(
            [descriptor(1, 0, 0), descriptor(2, 3, 10), descriptor(3, 2, 5), descriptor(4, 1, 6)],
            4,
        ).geometry!;

        expect(result.representatives.map((value) => value.sourceBroadCandidateId)).toEqual([
            1, 2, 3, 4,
        ]);
        expect(result.representatives[1].minimumShapeDistanceToPreviousCm).toBeCloseTo(10, 12);
        expect(result.representatives[2].minimumShapeDistanceToPreviousCm).toBeCloseTo(5, 12);
        expect(
            new Set(result.representatives.map((value) => value.sourceBroadCandidateId)).size,
        ).toBe(4);
    });

    it('uses lower soft score then lower Candidate ID for deterministic shape-distance ties', () => {
        const entries = [
            descriptor(10, 0, 0),
            descriptor(8, 2, 5),
            descriptor(3, 1, -5),
            descriptor(2, 1, 5),
        ];
        const first = selectMaxMinShapeDiverseCandidates(entries, 3).geometry!;
        const second = selectMaxMinShapeDiverseCandidates(entries, 3).geometry!;

        expect(first.representatives.map((value) => value.sourceBroadCandidateId)).toEqual([
            10, 2, 3,
        ]);
        expect(second).toEqual(first);
    });

    it('builds a symmetric pairwise matrix with zero diagonal and correct summaries', () => {
        const result = selectMaxMinShapeDiverseCandidates(
            [descriptor(1, 0, 0), descriptor(2, 1, 2), descriptor(3, 2, 5)],
            3,
        ).geometry!;
        const matrix = result.pairwiseShapeDistanceMatrixCm;

        matrix.forEach((row, rowIndex) => {
            expect(row[rowIndex]).toBe(0);
            row.forEach((value, columnIndex) =>
                expect(value).toBeCloseTo(matrix[columnIndex][rowIndex], 12),
            );
        });
        expect(result.minimumPairwiseDistanceCm).toBeCloseTo(2, 12);
        expect(result.meanPairwiseDistanceCm).toBeCloseTo((2 + 5 + 3) / 3, 12);
        expect(result.maximumPairwiseDistanceCm).toBeCloseTo(5, 12);
    });

    it('never supplements beyond the supplied Quality Pool', () => {
        const result = selectMaxMinShapeDiverseCandidates(
            [descriptor(1, 0, 0), descriptor(2, 1, 1), descriptor(3, 2, 2)],
            5,
        ).geometry!;
        expect(result.qualityPoolSize).toBe(3);
        expect(result.actualCount).toBe(3);
    });
});

describe('shape descriptor cache and immutability', () => {
    it('rebuilds each Quality Pool candidate once, keeps only descriptors, and does not mutate input', () => {
        const candidates = [candidate(1, 0), candidate(2, 1), candidate(3, 2)];
        const qualityPoolSnapshot = JSON.parse(JSON.stringify(candidates));
        const buildCandidateCurve = jest.fn((value: QualityPoolCandidateSummary) => ({
            geometry: {
                polylinePoints: [
                    point('L', 0, 0),
                    point('middle', 1, value.sourceCandidateId / 10),
                    point('GPrime', 2, 0),
                ],
            } as TargetMultiSupportOuterCurveCandidate,
            errors: [],
        }));
        const descriptors = buildShapeDescriptors({ candidates, buildCandidateCurve }).geometry!;

        expect(buildCandidateCurve).toHaveBeenCalledTimes(candidates.length);
        expect(descriptors.every((entry) => entry.points.length === SHAPE_DESCRIPTOR_POINTS)).toBe(
            true,
        );
        expect(JSON.stringify(descriptors)).not.toContain('polylinePoints');
        expect(candidates).toEqual(qualityPoolSnapshot);
    });

    it('does not modify the supplied Quality Pool result during selection', () => {
        const candidates = [candidate(1, 0), candidate(2, 1)];
        const qualityPool: MultiSupportQualityPoolResult = {
            validPoolSize: 2,
            requestedFraction: 1,
            minPoolSize: 0,
            targetPoolSize: 2,
            actualPoolSize: 2,
            candidates,
            excludedDiagnosticsUnavailable: 0,
            scoreMin: 0,
            scoreMax: 1,
            warnings: [],
        };
        const snapshot = JSON.parse(JSON.stringify(qualityPool));

        selectMaxMinShapeDiverseCandidates([descriptor(1, 0, 0), descriptor(2, 1, 1)], 2);
        expect(qualityPool).toEqual(snapshot);
    });
});
