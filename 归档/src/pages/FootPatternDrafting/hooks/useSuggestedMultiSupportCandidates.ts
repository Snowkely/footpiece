import { useCallback, useMemo, useState } from 'react';
import {
    DEFAULT_SUGGESTED_CANDIDATE_RANKING_CONFIG,
    selectSuggestedMultiSupportCandidates,
    type SuggestedCandidateRankingConfig,
    type SuggestedCandidateSelectionResult,
    type SuggestedMultiSupportCandidate,
} from '../geometry/suggestedMultiSupportCandidates';
import type { NearbyMultiSupportSearchCandidateSummary } from '../geometry/targetMultiSupportOuterCurveSearch';
import type { GeometryValidationError } from '../types';
import type { NearbyMultiSupportSearchController } from './useNearbyMultiSupportSearch';

export interface SuggestedMultiSupportCandidatesController {
    rankingConfig: SuggestedCandidateRankingConfig;
    selection?: SuggestedCandidateSelectionResult;
    errors: GeometryValidationError[];
    selectedCandidateId?: number;
    selectedSuggestion?: SuggestedMultiSupportCandidate;
    selectedSourceCandidate?: NearbyMultiSupportSearchCandidateSummary;
    previewIsCurrentSuggestion: boolean;
    setRankingConfig: (config: SuggestedCandidateRankingConfig) => void;
    selectSuggestion: (sourceCandidateId: number) => void;
    selectPrevious: () => void;
    selectNext: () => void;
    clearSelection: () => void;
}

function cloneDefaultConfig(): SuggestedCandidateRankingConfig {
    return {
        ...DEFAULT_SUGGESTED_CANDIDATE_RANKING_CONFIG,
        weights: { ...DEFAULT_SUGGESTED_CANDIDATE_RANKING_CONFIG.weights },
    };
}

export function useSuggestedMultiSupportCandidates(
    nearbySearch: NearbyMultiSupportSearchController,
): SuggestedMultiSupportCandidatesController {
    const [rankingConfig, setRankingConfigState] =
        useState<SuggestedCandidateRankingConfig>(cloneDefaultConfig);
    const [selectedCandidateId, setSelectedCandidateId] = useState<number>();
    const selectionResult = useMemo(() => {
        if (!nearbySearch.result) {
            return undefined;
        }
        return selectSuggestedMultiSupportCandidates({
            validCandidates: nearbySearch.result.validCandidates,
            effectiveSearchConfig: nearbySearch.result.config,
            rankingConfig,
        });
    }, [nearbySearch.result, rankingConfig]);
    const selection = selectionResult?.geometry;
    const selectedSuggestion = selection?.suggestions.find(
        (candidate) => candidate.sourceCandidateId === selectedCandidateId,
    );
    const selectedSourceCandidate = nearbySearch.result?.validCandidates.find(
        (candidate) => candidate.id === selectedCandidateId,
    );
    const selectedIndex = selectedSuggestion
        ? selection?.suggestions.findIndex(
              (candidate) => candidate.sourceCandidateId === selectedSuggestion.sourceCandidateId,
          ) ?? -1
        : -1;

    const setRankingConfig = useCallback((config: SuggestedCandidateRankingConfig) => {
        setRankingConfigState({ ...config, weights: { ...config.weights } });
    }, []);

    const selectSuggestion = useCallback(
        (sourceCandidateId: number) => {
            setSelectedCandidateId(sourceCandidateId);
            nearbySearch.selectCandidate(sourceCandidateId);
        },
        [nearbySearch.selectCandidate],
    );
    const selectPrevious = useCallback(() => {
        if (selection && selectedIndex > 0) {
            selectSuggestion(selection.suggestions[selectedIndex - 1].sourceCandidateId);
        }
    }, [selectSuggestion, selectedIndex, selection]);
    const selectNext = useCallback(() => {
        if (selection && selectedIndex >= 0 && selectedIndex < selection.suggestions.length - 1) {
            selectSuggestion(selection.suggestions[selectedIndex + 1].sourceCandidateId);
        }
    }, [selectSuggestion, selectedIndex, selection]);
    const clearSelection = useCallback(() => setSelectedCandidateId(undefined), []);

    return {
        rankingConfig,
        selection,
        errors: selectionResult?.errors ?? [],
        selectedCandidateId,
        selectedSuggestion,
        selectedSourceCandidate,
        previewIsCurrentSuggestion: Boolean(selectedSuggestion),
        setRankingConfig,
        selectSuggestion,
        selectPrevious,
        selectNext,
        clearSelection,
    };
}
