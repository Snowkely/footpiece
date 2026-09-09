import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
    BroadMultiSupportSearchCandidateSummary,
    BroadMultiSupportSearchConfig,
    BroadMultiSupportSearchEvaluation,
    BroadMultiSupportSearchResult,
    BroadMultiSupportSearchSession,
} from '../geometry/broadMultiSupportSearch';
import { createBroadMultiSupportSearchSession } from '../geometry/broadMultiSupportSearch';
import type { NearbyMultiSupportSearchInputs } from '../geometry/targetMultiSupportOuterCurveSearch';
import type {
    ChunkedSearchRunnerOptions,
    NearbyMultiSupportSearchRunOutcome,
} from '../geometry/targetMultiSupportOuterCurveSearchRunner';
import { runChunkedSearchSession } from '../geometry/targetMultiSupportOuterCurveSearchRunner';
import type { GeometryValidationError, TargetMultiSupportOuterCurveCandidate } from '../types';
import type { NearbyMultiSupportSearchStatus } from './useNearbyMultiSupportSearch';

interface ActiveRun {
    generation: number;
    cancelled: boolean;
}

type BroadRunner = (
    session: BroadMultiSupportSearchSession,
    options: ChunkedSearchRunnerOptions<
        BroadMultiSupportSearchEvaluation,
        BroadMultiSupportSearchResult
    >,
) => Promise<NearbyMultiSupportSearchRunOutcome>;

export interface BroadMultiSupportSearchController {
    status: NearbyMultiSupportSearchStatus;
    result?: BroadMultiSupportSearchResult;
    selectedCandidateId?: number;
    selectedCandidate?: BroadMultiSupportSearchCandidateSummary;
    previewCandidate?: TargetMultiSupportOuterCurveCandidate;
    elapsedMs: number;
    errors: GeometryValidationError[];
    start: (config: BroadMultiSupportSearchConfig) => void;
    cancel: () => void;
    clear: () => void;
    rebuildCandidate: (
        candidateId: number,
    ) => GeometryBuildResult<TargetMultiSupportOuterCurveCandidate>;
    selectCandidate: (candidateId: number) => void;
    selectPrevious: () => void;
    selectNext: () => void;
}

export interface BroadMultiSupportSearchHookDependencies {
    createSession: typeof createBroadMultiSupportSearchSession;
    runSession: BroadRunner;
    now: () => number;
}

const defaultDependencies: BroadMultiSupportSearchHookDependencies = {
    createSession: createBroadMultiSupportSearchSession,
    runSession: (session, options) =>
        runChunkedSearchSession<BroadMultiSupportSearchEvaluation, BroadMultiSupportSearchResult>(
            session,
            options,
        ),
    now: () => performance.now(),
};

export function useBroadMultiSupportSearch(
    inputs?: NearbyMultiSupportSearchInputs,
    dependencies: BroadMultiSupportSearchHookDependencies = defaultDependencies,
): BroadMultiSupportSearchController {
    const [status, setStatus] = useState<NearbyMultiSupportSearchStatus>('IDLE');
    const [result, setResult] = useState<BroadMultiSupportSearchResult>();
    const [selectedCandidateId, setSelectedCandidateId] = useState<number>();
    const [previewCandidate, setPreviewCandidate] =
        useState<TargetMultiSupportOuterCurveCandidate>();
    const [elapsedMs, setElapsedMs] = useState(0);
    const [errors, setErrors] = useState<GeometryValidationError[]>([]);
    const sessionRef = useRef<BroadMultiSupportSearchSession>();
    const activeRunRef = useRef<ActiveRun>();
    const selectedCandidateIdRef = useRef<number>();
    const startedAtRef = useRef(0);
    const generationRef = useRef(0);

    const setSelectedId = useCallback((candidateId?: number) => {
        selectedCandidateIdRef.current = candidateId;
        setSelectedCandidateId(candidateId);
    }, []);

    const runSession = useCallback(
        (session: BroadMultiSupportSearchSession) => {
            const activeRun: ActiveRun = {
                generation: generationRef.current + 1,
                cancelled: false,
            };
            generationRef.current = activeRun.generation;
            activeRunRef.current = activeRun;
            setStatus('RUNNING');

            void dependencies
                .runSession(session, {
                    shouldCancel: () => activeRun.cancelled,
                    onValidCandidate: (evaluation, snapshot) => {
                        if (activeRunRef.current !== activeRun) {
                            return;
                        }
                        setResult(snapshot);
                        if (
                            selectedCandidateIdRef.current === undefined &&
                            evaluation.discoveredCandidate &&
                            evaluation.candidate
                        ) {
                            setSelectedId(evaluation.discoveredCandidate.id);
                            setPreviewCandidate(evaluation.candidate);
                        }
                        setElapsedMs(dependencies.now() - startedAtRef.current);
                    },
                    onProgress: (snapshot) => {
                        if (activeRunRef.current !== activeRun) {
                            return;
                        }
                        setResult(snapshot);
                        setElapsedMs(dependencies.now() - startedAtRef.current);
                    },
                })
                .then((outcome) => {
                    if (activeRunRef.current !== activeRun) {
                        return;
                    }
                    setResult(session.getSnapshot());
                    setElapsedMs(dependencies.now() - startedAtRef.current);
                    setStatus(outcome);
                })
                .catch((error: unknown) => {
                    if (activeRunRef.current !== activeRun) {
                        return;
                    }
                    setStatus('ERROR');
                    setErrors([
                        {
                            code: 'BROAD_SEARCH_RUNNER_ERROR',
                            message:
                                error instanceof Error ? error.message : 'Broad search failed.',
                        },
                    ]);
                });
        },
        [dependencies, setSelectedId],
    );

    const start = useCallback(
        (config: BroadMultiSupportSearchConfig) => {
            if (!inputs) {
                setStatus('ERROR');
                setErrors([
                    {
                        code: 'BROAD_SEARCH_INPUTS_UNAVAILABLE',
                        message: 'Complete valid Step 1–6C fixed geometry before broad search.',
                    },
                ]);
                return;
            }
            if (activeRunRef.current) {
                activeRunRef.current.cancelled = true;
            }
            const sessionResult = dependencies.createSession(inputs, { ...config });
            if (!sessionResult.geometry) {
                setStatus('ERROR');
                setErrors(sessionResult.errors);
                return;
            }

            sessionRef.current = sessionResult.geometry;
            setResult(sessionResult.geometry.getSnapshot());
            setSelectedId(undefined);
            setPreviewCandidate(undefined);
            setErrors([]);
            setElapsedMs(0);
            startedAtRef.current = dependencies.now();
            runSession(sessionResult.geometry);
        },
        [dependencies, inputs, runSession, setSelectedId],
    );

    const cancel = useCallback(() => {
        if (activeRunRef.current && status === 'RUNNING') {
            activeRunRef.current.cancelled = true;
            setStatus('CANCELLED');
            setElapsedMs(dependencies.now() - startedAtRef.current);
        }
    }, [dependencies, status]);

    const clear = useCallback(() => {
        if (activeRunRef.current) {
            activeRunRef.current.cancelled = true;
        }
        activeRunRef.current = undefined;
        sessionRef.current = undefined;
        setStatus('IDLE');
        setResult(undefined);
        setSelectedId(undefined);
        setPreviewCandidate(undefined);
        setElapsedMs(0);
        setErrors([]);
    }, [setSelectedId]);

    const selectCandidate = useCallback(
        (candidateId: number) => {
            const session = sessionRef.current;
            const summary = session
                ?.getSnapshot()
                .validCandidates.find((candidate) => candidate.id === candidateId);
            if (!session || !summary) {
                return;
            }
            const preview = session.rebuildCandidate(summary);
            if (!preview.geometry) {
                setErrors(preview.errors);
                return;
            }
            setErrors([]);
            setSelectedId(summary.id);
            setPreviewCandidate(preview.geometry);
        },
        [setSelectedId],
    );

    const rebuildCandidate = useCallback(
        (candidateId: number): GeometryBuildResult<TargetMultiSupportOuterCurveCandidate> => {
            const session = sessionRef.current;
            const summary = session
                ?.getSnapshot()
                .validCandidates.find((candidate) => candidate.id === candidateId);
            if (!session || !summary) {
                return {
                    errors: [
                        {
                            code: 'BROAD_SEARCH_CANDIDATE_UNAVAILABLE',
                            message: `Broad Candidate #${candidateId} is not available in this result session.`,
                        },
                    ],
                };
            }
            return session.rebuildCandidate(summary);
        },
        [],
    );

    const selectedCandidate = useMemo(
        () => result?.validCandidates.find((candidate) => candidate.id === selectedCandidateId),
        [result, selectedCandidateId],
    );
    const selectedIndex = selectedCandidate
        ? result?.validCandidates.findIndex((candidate) => candidate.id === selectedCandidate.id) ??
          -1
        : -1;
    const selectPrevious = useCallback(() => {
        if (result && selectedIndex > 0) {
            selectCandidate(result.validCandidates[selectedIndex - 1].id);
        }
    }, [result, selectCandidate, selectedIndex]);
    const selectNext = useCallback(() => {
        if (result && selectedIndex >= 0 && selectedIndex < result.validCandidates.length - 1) {
            selectCandidate(result.validCandidates[selectedIndex + 1].id);
        }
    }, [result, selectCandidate, selectedIndex]);

    useEffect(
        () => () => {
            if (activeRunRef.current) {
                activeRunRef.current.cancelled = true;
            }
        },
        [],
    );

    return {
        status,
        result,
        selectedCandidateId,
        selectedCandidate,
        previewCandidate,
        elapsedMs,
        errors,
        start,
        cancel,
        clear,
        rebuildCandidate,
        selectCandidate,
        selectPrevious,
        selectNext,
    };
}
