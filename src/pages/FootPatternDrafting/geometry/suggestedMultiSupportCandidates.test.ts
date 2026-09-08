import {
    buildSuggestedDiversityThresholdSequence,
    DEFAULT_SUGGESTED_CANDIDATE_RANKING_CONFIG,
    selectSuggestedMultiSupportCandidates,
    suggestedCandidateParameterDistance,
    type SuggestedCandidateCount,
    type SuggestedCandidateRankingConfig,
} from './suggestedMultiSupportCandidates';
import type { NearbyMultiSupportSearchCandidateSummary } from './targetMultiSupportOuterCurveSearch';

const searchConfig = {
    alphaRadius: 0.2,
    alphaStep: 0.02,
    thetaRadiusDeg: 4,
    thetaStepDeg: 0.5,
    lambdaRadiusCm: 2,
    lambdaStepCm: 0.1,
};

function candidate(
    id: number,
    metric: number,
    parameters: Partial<
        Pick<NearbyMultiSupportSearchCandidateSummary, 'alpha' | 'thetaDeg' | 'lambdaCm'>
    > = {},
): NearbyMultiSupportSearchCandidateSummary {
    return {
        id,
        alpha: parameters.alpha ?? 0.5,
        thetaDeg: parameters.thetaDeg ?? 10,
        lambdaCm: parameters.lambdaCm ?? 2,
        distanceFromSeed: 0,
        referenceLengthCm: 35,
        outerLengthCm: 36.5,
        extraLengthCm: 1.5,
        diagnostics: {
            lEndpointTangentMismatchDeg: metric,
            gPrimeEndpointTangentMismatchDeg: metric,
            wPrimeTangentAngleToFootAxisDeg: 90,
            maxToeTurningDeg: metric,
            meanToeTurningDeg: metric / 2,
            toeTurningVariationDeg: metric,
            supportChordTurningAnglesDeg: { W3Prime: 1, WPrime: 1, W2Prime: 1 },
        },
    };
}

function config(
    overrides: Partial<SuggestedCandidateRankingConfig> = {},
): SuggestedCandidateRankingConfig {
    return {
        ...DEFAULT_SUGGESTED_CANDIDATE_RANKING_CONFIG,
        ...overrides,
        weights: {
            ...DEFAULT_SUGGESTED_CANDIDATE_RANKING_CONFIG.weights,
            ...overrides.weights,
        },
    };
}

describe('suggested candidate normalization and score', () => {
    it('uses equal default weights and min-max normalizes best/worst to zero/one', () => {
        const result = selectSuggestedMultiSupportCandidates({
            validCandidates: [candidate(1, 10), candidate(2, 20)],
            effectiveSearchConfig: searchConfig,
        }).geometry!;

        expect(result.rankingConfig.weights).toEqual({
            lEndpointMismatch: 0.25,
            gPrimeEndpointMismatch: 0.25,
            maxToeTurning: 0.25,
            toeTurningVariation: 0.25,
        });
        expect(result.suggestions[0].sourceCandidateId).toBe(1);
        expect(result.suggestions[0].softScore).toBe(0);
        expect(result.suggestions[0].normalizedMetrics).toEqual({
            lEndpointMismatch: 0,
            gPrimeEndpointMismatch: 0,
            maxToeTurning: 0,
            toeTurningVariation: 0,
        });
        expect(result.suggestions[1].normalizedMetrics).toEqual({
            lEndpointMismatch: 1,
            gPrimeEndpointMismatch: 1,
            maxToeTurning: 1,
            toeTurningVariation: 1,
        });
    });

    it('maps a constant metric range to zero without division by zero', () => {
        const first = candidate(1, 5);
        const second = candidate(2, 5, { alpha: 0.7 });
        const result = selectSuggestedMultiSupportCandidates({
            validCandidates: [first, second],
            effectiveSearchConfig: searchConfig,
        }).geometry!;

        result.suggestions.forEach((suggestion) => {
            expect(Object.values(suggestion.normalizedMetrics)).toEqual([0, 0, 0, 0]);
            expect(suggestion.softScore).toBe(0);
        });
    });

    it('normalizes arbitrary non-negative weights and reweights available metrics', () => {
        const complete = candidate(1, 1);
        const partial = candidate(2, 10, { alpha: 0.7 });
        partial.diagnostics.gPrimeEndpointTangentMismatchDeg = undefined;
        partial.diagnostics.maxToeTurningDeg = undefined;
        partial.diagnostics.toeTurningVariationDeg = undefined;
        const result = selectSuggestedMultiSupportCandidates({
            validCandidates: [complete, partial],
            effectiveSearchConfig: searchConfig,
            rankingConfig: config({
                weights: {
                    lEndpointMismatch: 2,
                    gPrimeEndpointMismatch: 1,
                    maxToeTurning: 1,
                    toeTurningVariation: 0,
                },
            }),
        }).geometry!;
        const partialSuggestion = result.suggestions.find(
            (value) => value.sourceCandidateId === partial.id,
        )!;

        expect(result.rankingConfig.weights).toEqual({
            lEndpointMismatch: 0.5,
            gPrimeEndpointMismatch: 0.25,
            maxToeTurning: 0.25,
            toeTurningVariation: 0,
        });
        expect(partialSuggestion.normalizedMetrics.gPrimeEndpointMismatch).toBeUndefined();
        expect(partialSuggestion.softScore).toBe(1);
    });

    it('excludes candidates with all four ranking diagnostics unavailable without mutating them', () => {
        const available = candidate(1, 2);
        const unavailable = candidate(2, 3);
        unavailable.diagnostics.lEndpointTangentMismatchDeg = undefined;
        unavailable.diagnostics.gPrimeEndpointTangentMismatchDeg = undefined;
        unavailable.diagnostics.maxToeTurningDeg = undefined;
        unavailable.diagnostics.toeTurningVariationDeg = undefined;
        const snapshot = JSON.parse(JSON.stringify([available, unavailable]));
        const result = selectSuggestedMultiSupportCandidates({
            validCandidates: [available, unavailable],
            effectiveSearchConfig: searchConfig,
        }).geometry!;

        expect(result.excludedBecauseDiagnosticsUnavailable).toBe(1);
        expect(result.warnings[0].code).toBe('SUGGESTED_CANDIDATE_DIAGNOSTICS_UNAVAILABLE');
        expect(result.suggestions.map((value) => value.sourceCandidateId)).toEqual([1]);
        expect([available, unavailable]).toEqual(snapshot);
    });

    it('uses stable source Candidate ID order for tied scores and is deterministic', () => {
        const candidates = [candidate(9, 4), candidate(2, 4), candidate(5, 4)];
        const input = {
            validCandidates: candidates,
            effectiveSearchConfig: searchConfig,
            rankingConfig: config({ diversityThreshold: 0 }),
        };
        const first = selectSuggestedMultiSupportCandidates(input);

        expect(first.geometry?.suggestions.map((value) => value.sourceCandidateId)).toEqual([
            2, 5, 9,
        ]);
        expect(selectSuggestedMultiSupportCandidates(input)).toEqual(first);
    });
});

describe('suggested candidate diversity', () => {
    it('normalizes parameter distance by effective search radii and ignores zero radii', () => {
        const first = candidate(1, 1, { alpha: 0.5, thetaDeg: 10, lambdaCm: 2 });
        const second = candidate(2, 2, { alpha: 0.6, thetaDeg: 12, lambdaCm: 3 });

        expect(suggestedCandidateParameterDistance(first, second, searchConfig)).toBeCloseTo(
            Math.sqrt(0.5 ** 2 + 0.5 ** 2 + 0.5 ** 2),
            12,
        );
        expect(
            suggestedCandidateParameterDistance(first, second, {
                alphaRadius: 0,
                thetaRadiusDeg: 0,
                lambdaRadiusCm: 2,
            }),
        ).toBeCloseTo(0.5, 12);
    });

    it('selects the lowest score first, skips near duplicates, and compares every selected item', () => {
        const candidates = [
            candidate(1, 1, { alpha: 0.5, thetaDeg: 10, lambdaCm: 2 }),
            candidate(2, 2, { alpha: 0.51, thetaDeg: 10, lambdaCm: 2 }),
            candidate(3, 3, { alpha: 0.7, thetaDeg: 10, lambdaCm: 2 }),
            candidate(4, 4, { alpha: 0.7, thetaDeg: 14, lambdaCm: 4 }),
        ];
        const result = selectSuggestedMultiSupportCandidates({
            validCandidates: candidates,
            effectiveSearchConfig: searchConfig,
            rankingConfig: config({ resultCount: 3, diversityThreshold: 0.15 }),
        }).geometry!;

        expect(result.suggestions.map((value) => value.sourceCandidateId)).toEqual([1, 3, 4]);
        expect(result.usedDiversityThreshold).toBe(0.15);
        result.suggestions.forEach((suggestion) => {
            expect(suggestion.minimumDistanceToOtherSelected).toBeGreaterThanOrEqual(0.15);
        });
    });

    it('relaxes 0.15 to 0.10, 0.05, then 0 to fill the requested count', () => {
        expect(buildSuggestedDiversityThresholdSequence(0.15)).toEqual([0.15, 0.1, 0.05, 0]);
        const candidates = [candidate(1, 1), candidate(2, 2), candidate(3, 3)];
        const result = selectSuggestedMultiSupportCandidates({
            validCandidates: candidates,
            effectiveSearchConfig: searchConfig,
            rankingConfig: config({ resultCount: 3, diversityThreshold: 0.15 }),
        }).geometry!;

        expect(result.actualCount).toBe(3);
        expect(result.usedDiversityThreshold).toBe(0);
    });
});

describe('suggested candidate count and validation', () => {
    it.each([3, 5, 8] as SuggestedCandidateCount[])(
        'returns at most the requested %i candidates',
        (resultCount) => {
            const candidates = Array.from({ length: 10 }, (_, index) =>
                candidate(index + 1, index + 1, { alpha: index / 10 }),
            );
            const result = selectSuggestedMultiSupportCandidates({
                validCandidates: candidates,
                effectiveSearchConfig: searchConfig,
                rankingConfig: config({ resultCount, diversityThreshold: 0 }),
            }).geometry!;

            expect(result.actualCount).toBe(resultCount);
        },
    );

    it('returns only the available rankable VALID history when the pool is smaller', () => {
        const result = selectSuggestedMultiSupportCandidates({
            validCandidates: [candidate(1, 1), candidate(2, 2)],
            effectiveSearchConfig: searchConfig,
        }).geometry!;

        expect(result.validPoolSize).toBe(2);
        expect(result.actualCount).toBe(2);
    });

    it('fails closed for invalid result count, weights, threshold, or radii', () => {
        const base = { validCandidates: [candidate(1, 1)], effectiveSearchConfig: searchConfig };
        const invalidCount = selectSuggestedMultiSupportCandidates({
            ...base,
            rankingConfig: config({ resultCount: 4 as SuggestedCandidateCount }),
        });
        const invalidWeights = selectSuggestedMultiSupportCandidates({
            ...base,
            rankingConfig: config({
                weights: {
                    lEndpointMismatch: 0,
                    gPrimeEndpointMismatch: 0,
                    maxToeTurning: 0,
                    toeTurningVariation: 0,
                },
            }),
        });
        const invalidThreshold = selectSuggestedMultiSupportCandidates({
            ...base,
            rankingConfig: config({ diversityThreshold: -1 }),
        });
        const invalidRadii = selectSuggestedMultiSupportCandidates({
            ...base,
            effectiveSearchConfig: { ...searchConfig, alphaRadius: Number.NaN },
        });

        [invalidCount, invalidWeights, invalidThreshold, invalidRadii].forEach((result) => {
            expect(result.geometry).toBeUndefined();
            expect(result.errors[0].code).toBe('SUGGESTED_CANDIDATE_CONFIG_INVALID');
        });
    });
});
