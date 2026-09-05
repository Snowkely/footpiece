import type {
    NearbyMultiSupportSearchEvaluation,
    NearbyMultiSupportSearchResult,
    NearbyMultiSupportSearchSession,
} from './targetMultiSupportOuterCurveSearch';

export const DEFAULT_NEARBY_SEARCH_CHUNK_SIZE = 20;

export type NearbyMultiSupportSearchRunOutcome = 'COMPLETED' | 'CANCELLED';

export interface NearbyMultiSupportSearchRunnerOptions {
    chunkSize?: number;
    shouldCancel: () => boolean;
    onValidCandidate?: (
        evaluation: NearbyMultiSupportSearchEvaluation,
        snapshot: NearbyMultiSupportSearchResult,
    ) => void;
    onProgress?: (snapshot: NearbyMultiSupportSearchResult) => void;
    yieldControl?: () => Promise<void>;
}

function yieldToEventLoop(): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, 0);
    });
}

/**
 * Runs a deterministic search session in small main-thread chunks. The engine
 * remains synchronous/pure with respect to its geometry inputs; this runner only
 * schedules progress and cancellation around it.
 */
export async function runNearbyMultiSupportSearchSession(
    session: NearbyMultiSupportSearchSession,
    {
        chunkSize = DEFAULT_NEARBY_SEARCH_CHUNK_SIZE,
        shouldCancel,
        onValidCandidate,
        onProgress,
        yieldControl = yieldToEventLoop,
    }: NearbyMultiSupportSearchRunnerOptions,
): Promise<NearbyMultiSupportSearchRunOutcome> {
    if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
        throw new Error('Nearby search chunk size must be a positive integer.');
    }

    let firstValidYielded = false;
    while (session.hasPending()) {
        for (let index = 0; index < chunkSize && session.hasPending(); index += 1) {
            if (shouldCancel()) {
                return 'CANCELLED';
            }
            const evaluation = session.evaluateNext();
            if (evaluation?.discoveredCandidate) {
                onValidCandidate?.(evaluation, session.getSnapshot());
                if (!firstValidYielded && session.hasPending()) {
                    firstValidYielded = true;
                    await yieldControl();
                }
            }
        }

        onProgress?.(session.getSnapshot());
        if (session.hasPending()) {
            await yieldControl();
        }
    }

    onProgress?.(session.getSnapshot());
    return shouldCancel() ? 'CANCELLED' : 'COMPLETED';
}
