import { act, renderHook, waitFor } from '@testing-library/react';
import type {
    BroadMultiSupportSearchCandidateSummary,
    BroadMultiSupportSearchEvaluation,
    BroadMultiSupportSearchResult,
    BroadMultiSupportSearchSession,
} from '../geometry/broadMultiSupportSearch';
import { DEFAULT_BROAD_MULTI_SUPPORT_SEARCH_CONFIG } from '../geometry/broadMultiSupportSearch';
import type { NearbyMultiSupportSearchInputs } from '../geometry/targetMultiSupportOuterCurveSearch';
import type { TargetMultiSupportOuterCurveCandidate } from '../types';
import type { BroadMultiSupportSearchHookDependencies } from './useBroadMultiSupportSearch';
import { useBroadMultiSupportSearch } from './useBroadMultiSupportSearch';

function summary(id: number, alpha: number): BroadMultiSupportSearchCandidateSummary {
    return {
        id,
        alpha,
        thetaDeg: 10,
        lambdaCm: 1,
        referenceLengthCm: 35.7,
        outerLengthCm: 37,
        extraLengthCm: 1.3,
        diagnostics: {
            maxToeTurningDeg: 5,
            meanToeTurningDeg: 2,
            supportChordTurningAnglesDeg: { W3Prime: 1, WPrime: 1, W2Prime: 1 },
        },
    };
}

function searchResult(
    candidates: BroadMultiSupportSearchCandidateSummary[],
    evaluated: number,
): BroadMultiSupportSearchResult {
    return {
        requestedConfig: { ...DEFAULT_BROAD_MULTI_SUPPORT_SEARCH_CONFIG },
        config: { ...DEFAULT_BROAD_MULTI_SUPPORT_SEARCH_CONFIG },
        requestedEstimatedCount: 24_969,
        totalCandidateCount: 13_464,
        evaluatedCandidateCount: evaluated,
        validCandidateCount: candidates.length,
        invalidCandidateCount: evaluated - candidates.length,
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
            alpha: { builds: 1, hits: 0 },
            theta: { builds: 1, hits: 0 },
            lambda: { builds: 1, hits: 0 },
            thetaLambda: { builds: 1, hits: 0 },
        },
        invalidThetaSkippedCandidates: 0,
        resolutionAdjusted: true,
        stepMultiplier: 1.25,
        adjustmentRounds: 1,
    };
}

function evaluation(
    candidateSummary: BroadMultiSupportSearchCandidateSummary,
    candidate: TargetMultiSupportOuterCurveCandidate,
): BroadMultiSupportSearchEvaluation {
    return {
        tuple: {
            alpha: candidateSummary.alpha,
            thetaDeg: candidateSummary.thetaDeg,
            lambdaCm: candidateSummary.lambdaCm,
            key: String(candidateSummary.id),
        },
        candidate,
        discoveredCandidate: candidateSummary,
    };
}

describe('useBroadMultiSupportSearch', () => {
    it('streams an independent lightweight history and keeps the first preview selected', async () => {
        const firstSummary = summary(1, 0.4);
        const secondSummary = summary(2, 0.45);
        const firstPreview = { alpha: 0.4 } as TargetMultiSupportOuterCurveCandidate;
        const secondPreview = { alpha: 0.45 } as TargetMultiSupportOuterCurveCandidate;
        let snapshot = searchResult([], 0);
        const fakeSession = {
            getSnapshot: () => snapshot,
            rebuildCandidate: jest.fn(),
        } as unknown as BroadMultiSupportSearchSession;
        const createSession = jest.fn(() => ({ geometry: fakeSession, errors: [] }));
        const dependencies: BroadMultiSupportSearchHookDependencies = {
            createSession,
            runSession: async (_session, options) => {
                snapshot = searchResult([firstSummary], 1);
                options.onValidCandidate?.(evaluation(firstSummary, firstPreview), snapshot);
                await Promise.resolve();
                snapshot = searchResult([firstSummary, secondSummary], 2);
                options.onValidCandidate?.(evaluation(secondSummary, secondPreview), snapshot);
                options.onProgress?.(snapshot);
                return 'COMPLETED';
            },
            now: () => 10,
        };
        const { result: hook } = renderHook(() =>
            useBroadMultiSupportSearch({} as NearbyMultiSupportSearchInputs, dependencies),
        );
        const mutableConfig = { ...DEFAULT_BROAD_MULTI_SUPPORT_SEARCH_CONFIG };

        act(() => hook.current.start(mutableConfig));
        mutableConfig.alphaStep = 0.9;

        await waitFor(() => expect(hook.current.status).toBe('COMPLETED'));
        expect(createSession).toHaveBeenCalledWith(
            expect.anything(),
            DEFAULT_BROAD_MULTI_SUPPORT_SEARCH_CONFIG,
        );
        expect(hook.current.result?.validCandidateCount).toBe(2);
        expect(hook.current.selectedCandidateId).toBe(1);
        expect(hook.current.previewCandidate).toBe(firstPreview);
    });

    it('cancels future chunks without discarding streamed broad history', async () => {
        const firstSummary = summary(1, 0.4);
        const firstPreview = { alpha: 0.4 } as TargetMultiSupportOuterCurveCandidate;
        let snapshot = searchResult([], 0);
        let finishRunner: (() => void) | undefined;
        const fakeSession = {
            getSnapshot: () => snapshot,
            rebuildCandidate: jest.fn(),
        } as unknown as BroadMultiSupportSearchSession;
        const dependencies: BroadMultiSupportSearchHookDependencies = {
            createSession: () => ({ geometry: fakeSession, errors: [] }),
            runSession: async (_session, options) => {
                snapshot = searchResult([firstSummary], 1);
                options.onValidCandidate?.(evaluation(firstSummary, firstPreview), snapshot);
                await new Promise<void>((resolve) => {
                    finishRunner = resolve;
                });
                return options.shouldCancel() ? 'CANCELLED' : 'COMPLETED';
            },
            now: () => 100,
        };
        const { result: hook } = renderHook(() =>
            useBroadMultiSupportSearch({} as NearbyMultiSupportSearchInputs, dependencies),
        );

        act(() => hook.current.start({ ...DEFAULT_BROAD_MULTI_SUPPORT_SEARCH_CONFIG }));
        await waitFor(() => expect(hook.current.result?.validCandidateCount).toBe(1));
        act(() => hook.current.cancel());

        expect(hook.current.status).toBe('CANCELLED');
        expect(hook.current.result?.validCandidates).toEqual([firstSummary]);

        await act(async () => {
            finishRunner?.();
            await Promise.resolve();
        });
        expect(hook.current.status).toBe('CANCELLED');
    });
});
