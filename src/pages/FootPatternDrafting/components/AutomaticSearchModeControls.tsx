import { Segmented, Typography } from 'antd';
import React from 'react';
import type { NearbyMultiSupportSearchSeed } from '../geometry/targetMultiSupportOuterCurveSearch';
import type { BroadMultiSupportSearchController } from '../hooks/useBroadMultiSupportSearch';
import type { NearbyMultiSupportSearchController } from '../hooks/useNearbyMultiSupportSearch';
import type { SuggestedMultiSupportCandidatesController } from '../hooks/useSuggestedMultiSupportCandidates';
import BroadMultiSupportSearchControls from './BroadMultiSupportSearchControls';
import NearbyMultiSupportSearchControls from './NearbyMultiSupportSearchControls';

const { Text } = Typography;

export type AutomaticSearchMode = 'nearby' | 'broad';

interface AutomaticSearchModeControlsProps {
    mode: AutomaticSearchMode;
    manualSeed: NearbyMultiSupportSearchSeed;
    inputsAvailable: boolean;
    nearbyController: NearbyMultiSupportSearchController;
    broadController: BroadMultiSupportSearchController;
    suggestedCandidates: SuggestedMultiSupportCandidatesController;
    onModeChange: (mode: AutomaticSearchMode) => void;
    onApplyCandidate: (candidate: NearbyMultiSupportSearchSeed) => void;
}

const AutomaticSearchModeControls: React.FC<AutomaticSearchModeControlsProps> = ({
    mode,
    manualSeed,
    inputsAvailable,
    nearbyController,
    broadController,
    suggestedCandidates,
    onModeChange,
    onApplyCandidate,
}) => (
    <section className="foot-drafting-search-mode">
        <div className="foot-drafting-search-mode-heading">
            <Text strong>Automatic Search Mode</Text>
            <Segmented<AutomaticSearchMode>
                block
                value={mode}
                options={[
                    { label: 'Nearby Search', value: 'nearby' },
                    { label: 'Broad Search', value: 'broad' },
                ]}
                onChange={onModeChange}
            />
        </div>
        {mode === 'nearby' ? (
            <NearbyMultiSupportSearchControls
                manualSeed={manualSeed}
                inputsAvailable={inputsAvailable}
                controller={nearbyController}
                suggestedCandidates={suggestedCandidates}
                onApplyCandidate={onApplyCandidate}
            />
        ) : (
            <BroadMultiSupportSearchControls
                manualPreview={manualSeed}
                inputsAvailable={inputsAvailable}
                controller={broadController}
                onApplyCandidate={onApplyCandidate}
            />
        )}
    </section>
);

export default AutomaticSearchModeControls;
