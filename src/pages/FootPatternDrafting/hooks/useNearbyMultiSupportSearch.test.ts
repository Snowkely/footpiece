import { act, renderHook, waitFor } from '@testing-library/react';
import type {
    NearbyMultiSupportSearchCandidateSummary,
    NearbyMultiSupportSearchInputs,
    NearbyMultiSupportSearchResult,
    NearbyMultiSupportSearchSession,
    NearbyMultiSupportSearchTuple,
} from '../geometry/targetMultiSupportOuterCurveSearch';
import {
    DEFAULT_NEARBY_MULTI_SUPPORT_SEARCH_CONFIG,
    fitSearchConfigToEvaluationLimit,
} from '../geometry/targetMultiSupportOuterCurveSearch';
import type { TargetMultiSupportOuterCurveCandidate } from '../types';
import type { NearbyMultiSupportSearchHookDependencies } from './useNearbyMultiSupportSearch';
import { useNearbyMultiSupportSearch } from './useNearbyMultiSupportSearch';

const seed = { alpha: 0.5, thetaDeg: 8.5, lambdaCm: 2.2 };

function summary(id: number, alpha: number): NearbyMultiSupportSearchCandidateSummary {
    return {
        id,
        alpha,
        thetaDeg: seed.thetaDeg,
        lambdaCm: seed.lambdaCm,
        distanceFromSeed: id - 1,
        referenceLengthCm: 35.7,
        outerLengthCm: 37,
        extraLengthCm: 1.3,
        diagnostics: {
            maxToeTurningDeg: 5,
            meanToeTurningDeg: 2,
            supportChordTurningAnglesDeg: {
                W3Prime: 1,
                WPrime: 1,
                W2Prime: 1,
            },
        },
    };
}

function result(
    validCandidates: NearbyMultiSupportSearchCandidateSummary[],
    evaluatedCandidateCount: number,
): NearbyMultiSupportSearchResult {
    return {
        seed: { ...seed },
        config: { ...DEFAULT_NEARBY_MULTI_SUPPORT_SEARCH_CONFIG },
        totalCandidateCount: 100,
        evaluatedCandidateCount,
        validCandidateCount: validCandidates.length,
        invalidCandidateCount: evaluatedCandidateCount - validCandidates.length,
        validCandidates,
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
    };
}

function tuple(alpha: number): NearbyMultiSupportSearchTuple {
    return {
        alpha,
        thetaDeg: seed.thetaDeg,
        lambdaCm: seed.lambdaCm,
        key: `${alpha}|${seed.thetaDeg}|${seed.lambdaCm}`,
        distanceFromSeed: Math.abs(alpha - seed.alpha),
    };
}

describe('useNearbyMultiSupportSearch', () => {
    it('freezes the seed and keeps the first streamed valid candidate selected', async () => {
        const firstSummary = summary(1, 0.5);
        const secondSummary = summary(2, 0.52);
        const firstPreview = {
            alpha: 0.5,
            valid: true,
            polylinePoints: [],
        } as unknown as TargetMultiSupportOuterCurveCandidate;
        const secondPreview = {
            alpha: 0.52,
            valid: true,
            polylinePoints: [],
        } as unknown as TargetMultiSupportOuterCurveCandidate;
        let snapshot = result([], 0);
        const fakeSession = {
            getSnapshot: () => snapshot,
            rebuildCandidate: jest.fn(),
        } as unknown as NearbyMultiSupportSearchSession;
        const dependencies: NearbyMultiSupportSearchHookDependencies = {
            createSession: () => ({ geometry: fakeSession, errors: [] }),
            runSession: async (_session, options) => {
                snapshot = result([firstSummary], 1);
                options.onValidCandidate?.(
                    {
                        tuple: tuple(0.5),
                        candidate: firstPreview,
                        discoveredCandidate: firstSummary,
                    },
                    snapshot,
                );
                await Promise.resolve();
                snapshot = result([firstSummary, secondSummary], 2);
                options.onValidCandidate?.(
                    {
                        tuple: tuple(0.52),
                        candidate: secondPreview,
                        discoveredCandidate: secondSummary,
                    },
                    snapshot,
                );
                options.onProgress?.(snapshot);
                return 'COMPLETED';
            },
            expandConfig: (config) => ({ ...config }),
            fitConfig: fitSearchConfigToEvaluationLimit,
            now: () => 0,
        };

        const fixedInputs = {} as NearbyMultiSupportSearchInputs;
        const { result: hook } = renderHook(() =>
            useNearbyMultiSupportSearch(fixedInputs, dependencies),
        );
        const mutableSeed = { ...seed };
        act(() => {
            hook.current.start(mutableSeed, {
                ...DEFAULT_NEARBY_MULTI_SUPPORT_SEARCH_CONFIG,
            });
        });
        mutableSeed.alpha = 0.9;
        mutableSeed.thetaDeg = 20;
        mutableSeed.lambdaCm = 5;

        await waitFor(() => expect(hook.current.status).toBe('COMPLETED'));
        expect(hook.current.seed).toEqual(seed);
        expect(hook.current.result?.validCandidateCount).toBe(2);
        expect(hook.current.selectedCandidateId).toBe(1);
        expect(hook.current.previewCandidate).toBe(firstPreview);
        expect(hook.current.previewCandidate).not.toBe(secondPreview);
    });

    it('marks cancellation without discarding already streamed history', async () => {
        const firstSummary = summary(1, 0.5);
        const firstPreview = {
            alpha: 0.5,
            valid: true,
            polylinePoints: [],
        } as unknown as TargetMultiSupportOuterCurveCandidate;
        let snapshot = result([], 0);
        let finishRunner: (() => void) | undefined;
        const fakeSession = {
            getSnapshot: () => snapshot,
            rebuildCandidate: jest.fn(),
        } as unknown as NearbyMultiSupportSearchSession;
        const dependencies: NearbyMultiSupportSearchHookDependencies = {
            createSession: () => ({ geometry: fakeSession, errors: [] }),
            runSession: async (_session, options) => {
                snapshot = result([firstSummary], 1);
                options.onValidCandidate?.(
                    {
                        tuple: tuple(0.5),
                        candidate: firstPreview,
                        discoveredCandidate: firstSummary,
                    },
                    snapshot,
                );
                await new Promise<void>((resolve) => {
                    finishRunner = resolve;
                });
                return options.shouldCancel() ? 'CANCELLED' : 'COMPLETED';
            },
            expandConfig: (config) => ({ ...config }),
            fitConfig: fitSearchConfigToEvaluationLimit,
            now: () => 100,
        };
        const { result: hook } = renderHook(() =>
            useNearbyMultiSupportSearch({} as NearbyMultiSupportSearchInputs, dependencies),
        );

        act(() => {
            hook.current.start(seed, { ...DEFAULT_NEARBY_MULTI_SUPPORT_SEARCH_CONFIG });
        });
        await waitFor(() => expect(hook.current.result?.validCandidateCount).toBe(1));
        act(() => hook.current.cancel());

        expect(hook.current.status).toBe('CANCELLED');
        expect(hook.current.result?.validCandidates).toEqual([firstSummary]);

        await act(async () => {
            finishRunner?.();
            await Promise.resolve();
        });
        expect(hook.current.status).toBe('CANCELLED');
        expect(hook.current.result?.validCandidates).toEqual([firstSummary]);
    });
});
