import { act, renderHook } from '@testing-library/react';
import type {
    NearbyMultiSupportSearchCandidateSummary,
    NearbyMultiSupportSearchResult,
} from '../geometry/targetMultiSupportOuterCurveSearch';
import type { NearbyMultiSupportSearchController } from './useNearbyMultiSupportSearch';
import { useSuggestedMultiSupportCandidates } from './useSuggestedMultiSupportCandidates';

function candidate(id: number, metric: number): NearbyMultiSupportSearchCandidateSummary {
    return {
        id,
        alpha: 0.4 + id * 0.01,
        thetaDeg: 8 + id * 0.1,
        lambdaCm: 2 + id * 0.02,
        distanceFromSeed: id,
        referenceLengthCm: 35,
        outerLengthCm: 36.5,
        extraLengthCm: 1.5,
        diagnostics: {
            lEndpointTangentMismatchDeg: metric,
            gPrimeEndpointTangentMismatchDeg: metric,
            maxToeTurningDeg: metric,
            meanToeTurningDeg: metric,
            toeTurningVariationDeg: metric,
            supportChordTurningAnglesDeg: { W3Prime: 1, WPrime: 1, W2Prime: 1 },
        },
    };
}

function searchResult(
    candidates: NearbyMultiSupportSearchCandidateSummary[],
): NearbyMultiSupportSearchResult {
    return {
        seed: { alpha: 0.5, thetaDeg: 10, lambdaCm: 2 },
        config: {
            alphaRadius: 0.15,
            alphaStep: 0.02,
            thetaRadiusDeg: 3,
            thetaStepDeg: 0.5,
            lambdaRadiusCm: 1,
            lambdaStepCm: 0.1,
        },
        totalCandidateCount: 100,
        evaluatedCandidateCount: candidates.length,
        validCandidateCount: candidates.length,
        invalidCandidateCount: 0,
        validCandidates: candidates,
        rejectionStats: {
            tooShort: 0,
            tooLong: 0,
            insideReference: 0,
            referenceIntersection: 0,
            selfIntersection: 0,
            utBuildError: 0,
            toeReferenceBuildError: 0,
            wPrimeBuildError: 0,
            toeOuterSupportBuildError: 0,
            outerCurveBuildError: 0,
        },
        cacheStats: {
            alpha: { builds: 0, hits: 0 },
            theta: { builds: 0, hits: 0 },
            lambda: { builds: 0, hits: 0 },
            thetaLambda: { builds: 0, hits: 0 },
        },
        invalidThetaSkippedCandidates: 0,
    };
}

function nearbyController(
    candidates: NearbyMultiSupportSearchCandidateSummary[],
    selectCandidate: jest.Mock,
): NearbyMultiSupportSearchController {
    return {
        status: 'RUNNING',
        result: searchResult(candidates),
        elapsedMs: 0,
        errors: [],
        start: jest.fn(),
        cancel: jest.fn(),
        expand: jest.fn(),
        clear: jest.fn(),
        selectCandidate,
        selectPrevious: jest.fn(),
        selectNext: jest.fn(),
    };
}

describe('useSuggestedMultiSupportCandidates', () => {
    it('keeps an explicit preview stable while streaming re-ranking changes the Suggested set', () => {
        const selectCandidate = jest.fn();
        const initial = [candidate(1, 1), candidate(2, 20)];
        const { result, rerender } = renderHook(
            ({ nearby }) => useSuggestedMultiSupportCandidates(nearby),
            { initialProps: { nearby: nearbyController(initial, selectCandidate) } },
        );

        act(() => result.current.selectSuggestion(2));
        expect(selectCandidate).toHaveBeenCalledWith(2);
        selectCandidate.mockClear();

        const expanded = [
            candidate(1, 1),
            candidate(2, 20),
            candidate(3, 2),
            candidate(4, 3),
            candidate(5, 4),
            candidate(6, 5),
            candidate(7, 6),
            candidate(8, 7),
        ];
        rerender({ nearby: nearbyController(expanded, selectCandidate) });

        expect(result.current.selectedCandidateId).toBe(2);
        expect(result.current.selectedSourceCandidate?.id).toBe(2);
        expect(result.current.previewIsCurrentSuggestion).toBe(false);
        expect(result.current.selection?.validPoolSize).toBe(8);
        expect(result.current.selection?.actualCount).toBe(5);
        expect(selectCandidate).not.toHaveBeenCalled();
    });

    it('navigates only within the current Suggested list', () => {
        const selectCandidate = jest.fn();
        const candidates = [candidate(1, 1), candidate(2, 2), candidate(3, 3)];
        const { result } = renderHook(() =>
            useSuggestedMultiSupportCandidates(nearbyController(candidates, selectCandidate)),
        );

        act(() => result.current.selectSuggestion(2));
        act(() => result.current.selectPrevious());
        act(() => result.current.selectNext());

        expect(selectCandidate.mock.calls.map(([id]) => id)).toEqual([2, 1, 2]);
    });
});
