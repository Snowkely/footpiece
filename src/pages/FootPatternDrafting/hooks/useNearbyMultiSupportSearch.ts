import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
    NearbyMultiSupportSearchCandidateSummary,
    NearbyMultiSupportSearchConfig,
    NearbyMultiSupportSearchConfigFit,
    NearbyMultiSupportSearchInputs,
    NearbyMultiSupportSearchResult,
    NearbyMultiSupportSearchSeed,
    NearbyMultiSupportSearchSession,
} from '../geometry/targetMultiSupportOuterCurveSearch';
import {
    createNearbyMultiSupportSearchSession,
    expandNearbyMultiSupportSearchConfig,
    fitSearchConfigToEvaluationLimit,
} from '../geometry/targetMultiSupportOuterCurveSearch';
import { runNearbyMultiSupportSearchSession } from '../geometry/targetMultiSupportOuterCurveSearchRunner';
import type { GeometryValidationError, TargetMultiSupportOuterCurveCandidate } from '../types';

export type NearbyMultiSupportSearchStatus =
    | 'IDLE'
    | 'RUNNING'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'ERROR';

interface ActiveRun {
    generation: number;
    cancelled: boolean;
}

export interface NearbyMultiSupportSearchController {
    status: NearbyMultiSupportSearchStatus;
    result?: NearbyMultiSupportSearchResult;
    seed?: NearbyMultiSupportSearchSeed;
    selectedCandidateId?: number;
    selectedCandidate?: NearbyMultiSupportSearchCandidateSummary;
    previewCandidate?: TargetMultiSupportOuterCurveCandidate;
    elapsedMs: number;
    errors: GeometryValidationError[];
    start: (seed: NearbyMultiSupportSearchSeed, config: NearbyMultiSupportSearchConfig) => void;
    cancel: () => void;
    expand: () => NearbyMultiSupportSearchConfigFit | undefined;
    clear: () => void;
    selectCandidate: (candidateId: number) => void;
    selectPrevious: () => void;
    selectNext: () => void;
}

export interface NearbyMultiSupportSearchHookDependencies {
    createSession: typeof createNearbyMultiSupportSearchSession;
    runSession: typeof runNearbyMultiSupportSearchSession;
    expandConfig: typeof expandNearbyMultiSupportSearchConfig;
    fitConfig: typeof fitSearchConfigToEvaluationLimit;
    now: () => number;
}

const defaultHookDependencies: NearbyMultiSupportSearchHookDependencies = {
    createSession: createNearbyMultiSupportSearchSession,
    runSession: runNearbyMultiSupportSearchSession,
    expandConfig: expandNearbyMultiSupportSearchConfig,
    fitConfig: fitSearchConfigToEvaluationLimit,
    now: () => performance.now(),
};

export function useNearbyMultiSupportSearch(
    inputs?: NearbyMultiSupportSearchInputs,
    dependencies: NearbyMultiSupportSearchHookDependencies = defaultHookDependencies,
): NearbyMultiSupportSearchController {
    const [status, setStatus] = useState<NearbyMultiSupportSearchStatus>('IDLE');
    const [result, setResult] = useState<NearbyMultiSupportSearchResult>();
    const [seed, setSeed] = useState<NearbyMultiSupportSearchSeed>();
    const [selectedCandidateId, setSelectedCandidateId] = useState<number>();
    const [previewCandidate, setPreviewCandidate] =
        useState<TargetMultiSupportOuterCurveCandidate>();
    const [elapsedMs, setElapsedMs] = useState(0);
    const [errors, setErrors] = useState<GeometryValidationError[]>([]);
    const sessionRef = useRef<NearbyMultiSupportSearchSession>();
    const activeRunRef = useRef<ActiveRun>();
    const selectedCandidateIdRef = useRef<number>();
    const startedAtRef = useRef(0);
    const generationRef = useRef(0);

    const setSelectedId = useCallback((candidateId?: number) => {
        selectedCandidateIdRef.current = candidateId;
        setSelectedCandidateId(candidateId);
    }, []);

    const runSession = useCallback(
        (session: NearbyMultiSupportSearchSession) => {
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
                            code: 'NEARBY_SEARCH_RUNNER_ERROR',
                            message:
                                error instanceof Error ? error.message : 'Nearby search failed.',
                        },
                    ]);
                });
        },
        [dependencies, setSelectedId],
    );

    const start = useCallback(
        (nextSeed: NearbyMultiSupportSearchSeed, config: NearbyMultiSupportSearchConfig) => {
            if (!inputs) {
                setStatus('ERROR');
                setErrors([
                    {
                        code: 'NEARBY_SEARCH_INPUTS_UNAVAILABLE',
                        message: 'Complete valid Step 1–6C fixed geometry before nearby search.',
                    },
                ]);
                return;
            }

            if (activeRunRef.current) {
                activeRunRef.current.cancelled = true;
            }
            const sessionResult = dependencies.createSession(inputs, nextSeed, config);
            if (!sessionResult.geometry) {
                setStatus('ERROR');
                setErrors(sessionResult.errors);
                return;
            }

            sessionRef.current = sessionResult.geometry;
            const frozenSeed = { ...nextSeed };
            setSeed(frozenSeed);
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

    const expand = useCallback(() => {
        const session = sessionRef.current;
        if (!session || !result || status === 'RUNNING') {
            return;
        }
        const requestedConfig = dependencies.expandConfig(result.config);
        const fittedConfig = dependencies.fitConfig(result.seed, requestedConfig);
        if (!fittedConfig.geometry) {
            setStatus('ERROR');
            setErrors(fittedConfig.errors);
            return undefined;
        }
        const extension = session.extend(fittedConfig.geometry.config);
        if (!extension.geometry) {
            setStatus('ERROR');
            setErrors(extension.errors);
            return undefined;
        }
        setErrors([]);
        setResult(session.getSnapshot());
        startedAtRef.current = dependencies.now() - elapsedMs;
        runSession(session);
        return fittedConfig.geometry;
    }, [dependencies, elapsedMs, result, runSession, status]);

    const clear = useCallback(() => {
        if (activeRunRef.current) {
            activeRunRef.current.cancelled = true;
        }
        activeRunRef.current = undefined;
        sessionRef.current = undefined;
        setStatus('IDLE');
        setResult(undefined);
        setSeed(undefined);
        setSelectedId(undefined);
        setPreviewCandidate(undefined);
        setElapsedMs(0);
        setErrors([]);
    }, [setSelectedId]);

    const selectCandidate = useCallback(
        (candidateId: number) => {
            const session = sessionRef.current;
            if (!session) {
                return;
            }
            const summary = session
                .getSnapshot()
                .validCandidates.find((candidate) => candidate.id === candidateId);
            if (!summary) {
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
        seed,
        selectedCandidateId,
        selectedCandidate,
        previewCandidate,
        elapsedMs,
        errors,
        start,
        cancel,
        expand,
        clear,
        selectCandidate,
        selectPrevious,
        selectNext,
    };
}
