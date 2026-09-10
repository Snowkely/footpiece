import type { BroadMultiSupportSearchCandidateSummary } from './broadMultiSupportSearch';
import {
    buildMultiSupportQualityPool,
    DEFAULT_MULTI_SUPPORT_QUALITY_POOL_CONFIG,
} from './multiSupportQualityPool';
import { rankMultiSupportCandidatesBySoftScore } from './suggestedMultiSupportCandidates';

function candidate(id: number, metric = id): BroadMultiSupportSearchCandidateSummary {
    return {
        id,
        alpha: (id % 20) / 20,
        thetaDeg: 2 + (id % 28),
        lambdaCm: (id % 16) / 2,
        referenceLengthCm: 35,
        outerLengthCm: 36.5,
        extraLengthCm: 1.5,
        diagnostics: {
            lEndpointTangentMismatchDeg: metric,
            gPrimeEndpointTangentMismatchDeg: metric * 1.1,
            wPrimeTangentAngleToFootAxisDeg: 90,
            maxToeTurningDeg: metric * 0.8,
            meanToeTurningDeg: metric / 2,
            toeTurningVariationDeg: metric * 0.6,
            supportChordTurningAnglesDeg: { W3Prime: 1, WPrime: 1, W2Prime: 1 },
        },
    };
}

describe('multi-support Quality Pool sizing', () => {
    it.each([
        [190, 48],
        [40, 20],
        [12, 12],
    ])(
        'keeps the configured fraction/minimum within %i Broad VALID candidates',
        (size, expected) => {
            const result = buildMultiSupportQualityPool({
                validCandidates: Array.from({ length: size }, (_, index) => candidate(index + 1)),
            }).geometry!;

            expect(result.validPoolSize).toBe(size);
            expect(result.targetPoolSize).toBe(expected);
            expect(result.actualPoolSize).toBe(expected);
            expect(result.actualPoolSize).toBeLessThanOrEqual(size);
        },
    );

    it.each([
        [0.1, 20],
        [0.2, 20],
        [0.25, 25],
        [0.3, 30],
        [0.5, 50],
    ])('calculates fraction %f without requiring another Broad Search', (fraction, expected) => {
        const validCandidates = Array.from({ length: 100 }, (_, index) => candidate(index + 1));
        const result = buildMultiSupportQualityPool({
            validCandidates,
            qualityPoolConfig: {
                ...DEFAULT_MULTI_SUPPORT_QUALITY_POOL_CONFIG,
                fraction,
            },
        }).geometry!;

        expect(result.actualPoolSize).toBe(expected);
    });

    it('fails closed for an invalid fraction or minimum size', () => {
        const base = { validCandidates: [candidate(1)] };
        expect(
            buildMultiSupportQualityPool({
                ...base,
                qualityPoolConfig: { fraction: 0, minPoolSize: 20 },
            }).errors[0].code,
        ).toBe('QUALITY_POOL_CONFIG_INVALID');
        expect(
            buildMultiSupportQualityPool({
                ...base,
                qualityPoolConfig: { fraction: 0.25, minPoolSize: -1 },
            }).errors[0].code,
        ).toBe('QUALITY_POOL_CONFIG_INVALID');
    });
});

describe('multi-support Quality Pool ranking', () => {
    it('reuses the Step 8 soft score, sorts ascending, and uses source ID as tie-break', () => {
        const validCandidates = [candidate(9, 5), candidate(2, 5), candidate(5, 5)];
        const sharedRanking = rankMultiSupportCandidatesBySoftScore(validCandidates).geometry!;
        const pool = buildMultiSupportQualityPool({
            validCandidates,
            qualityPoolConfig: { fraction: 1, minPoolSize: 0 },
        }).geometry!;

        expect(pool.candidates.map((value) => value.sourceCandidateId)).toEqual([2, 5, 9]);
        expect(pool.candidates.map((value) => value.softScore)).toEqual(
            sharedRanking.candidates.map((value) => value.softScore),
        );
        expect(
            buildMultiSupportQualityPool({
                validCandidates,
                qualityPoolConfig: { fraction: 1, minPoolSize: 0 },
            }).geometry,
        ).toEqual(pool);
    });

    it('renormalizes remaining metrics and excludes only all-missing diagnostics', () => {
        const complete = candidate(1, 1);
        const partial = candidate(2, 2);
        partial.diagnostics.maxToeTurningDeg = undefined;
        partial.diagnostics.toeTurningVariationDeg = undefined;
        const unavailable = candidate(3, 3);
        unavailable.diagnostics.lEndpointTangentMismatchDeg = undefined;
        unavailable.diagnostics.gPrimeEndpointTangentMismatchDeg = undefined;
        unavailable.diagnostics.maxToeTurningDeg = undefined;
        unavailable.diagnostics.toeTurningVariationDeg = undefined;
        const result = buildMultiSupportQualityPool({
            validCandidates: [complete, partial, unavailable],
            qualityPoolConfig: { fraction: 1, minPoolSize: 0 },
        }).geometry!;

        expect(result.validPoolSize).toBe(3);
        expect(result.actualPoolSize).toBe(2);
        expect(result.excludedDiagnosticsUnavailable).toBe(1);
        expect(result.warnings[0].code).toBe('QUALITY_POOL_DIAGNOSTICS_UNAVAILABLE');
        expect(result.candidates.map((value) => value.sourceCandidateId)).not.toContain(3);
    });

    it('returns lightweight summaries without mutating Broad VALID history', () => {
        const validCandidates = [candidate(1), candidate(2), candidate(3)];
        const snapshot = JSON.parse(JSON.stringify(validCandidates));
        const result = buildMultiSupportQualityPool({
            validCandidates,
            qualityPoolConfig: { fraction: 1, minPoolSize: 0 },
        }).geometry!;

        expect(validCandidates).toEqual(snapshot);
        expect(JSON.stringify(result)).not.toContain('polylinePoints');
        expect(
            result.candidates.every((value) =>
                snapshot.some(({ id }: { id: number }) => id === value.sourceCandidateId),
            ),
        ).toBe(true);
    });
});
