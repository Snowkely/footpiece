import { Card, Tag, Typography } from 'antd';
import React from 'react';
import type { NearbyMultiSupportSearchStatus } from '../hooks/useNearbyMultiSupportSearch';
import type { SuggestedMultiSupportCandidatesController } from '../hooks/useSuggestedMultiSupportCandidates';

const { Text } = Typography;

interface SuggestedMultiSupportCandidatesDebugPanelProps {
    status: NearbyMultiSupportSearchStatus;
    controller: SuggestedMultiSupportCandidatesController;
}

const DebugRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="foot-drafting-value-row">
        <Text>{label}</Text>
        <Text className="foot-drafting-debug-value">{value}</Text>
    </div>
);

function number(value?: number, digits = 4): string {
    return value === undefined || !Number.isFinite(value) ? '—' : value.toFixed(digits);
}

const SuggestedMultiSupportCandidatesDebugPanel: React.FC<
    SuggestedMultiSupportCandidatesDebugPanelProps
> = ({ status, controller }) => {
    const selection = controller.selection;
    const weights = selection?.rankingConfig.weights ?? controller.rankingConfig.weights;

    return (
        <Card
            size="small"
            title="Suggested Candidate Selection"
            className="foot-drafting-debug-card"
        >
            <DebugRow label="Search status" value={<Tag>{status}</Tag>} />
            <DebugRow label="Valid pool size" value={selection?.validPoolSize ?? '—'} />
            <DebugRow
                label="Requested / returned"
                value={selection ? `${selection.requestedCount} / ${selection.actualCount}` : '—'}
            />
            <DebugRow
                label="Soft metrics"
                value="L tangent · G' tangent · max toe turn · toe variation"
            />
            <DebugRow
                label="Normalized weights"
                value={`${number(weights.lEndpointMismatch, 2)} / ${number(
                    weights.gPrimeEndpointMismatch,
                    2,
                )} / ${number(weights.maxToeTurning, 2)} / ${number(
                    weights.toeTurningVariation,
                    2,
                )}`}
            />
            <DebugRow label="Normalization" value="min-max within current VALID pool" />
            <DebugRow
                label="Requested diversity"
                value={number(selection?.requestedDiversityThreshold, 2)}
            />
            <DebugRow label="Used diversity" value={number(selection?.usedDiversityThreshold, 2)} />
            <DebugRow
                label="Excluded diagnostics unavailable"
                value={selection?.excludedBecauseDiagnosticsUnavailable ?? '—'}
            />
            <DebugRow
                label="Selected suggested preview"
                value={
                    controller.selectedCandidateId === undefined
                        ? '—'
                        : `source #${controller.selectedCandidateId}${
                              controller.previewIsCurrentSuggestion ? '' : ' (not in current set)'
                          }`
                }
            />

            {selection?.suggestions.map((suggestion) => (
                <div
                    className="foot-drafting-suggestion-debug-entry"
                    key={suggestion.sourceCandidateId}
                >
                    <Text strong>
                        Suggested #{suggestion.suggestionIndex} · source #
                        {suggestion.sourceCandidateId}
                    </Text>
                    <DebugRow
                        label="Parameters"
                        value={`α ${suggestion.alpha.toFixed(3)} · θ ${suggestion.thetaDeg.toFixed(
                            1,
                        )}° · λ ${suggestion.lambdaCm.toFixed(2)} cm`}
                    />
                    <DebugRow label="Soft score" value={number(suggestion.softScore, 6)} />
                    <DebugRow
                        label="Raw metrics"
                        value={`L ${number(
                            suggestion.rawMetrics.lEndpointMismatchDeg,
                            3,
                        )}° · G' ${number(
                            suggestion.rawMetrics.gPrimeEndpointMismatchDeg,
                            3,
                        )}° · max ${number(
                            suggestion.rawMetrics.maxToeTurningDeg,
                            3,
                        )}° · var ${number(suggestion.rawMetrics.toeTurningVariationDeg, 3)}°`}
                    />
                    <DebugRow
                        label="Normalized metrics"
                        value={`L ${number(
                            suggestion.normalizedMetrics.lEndpointMismatch,
                            3,
                        )} · G' ${number(
                            suggestion.normalizedMetrics.gPrimeEndpointMismatch,
                            3,
                        )} · max ${number(
                            suggestion.normalizedMetrics.maxToeTurning,
                            3,
                        )} · var ${number(suggestion.normalizedMetrics.toeTurningVariation, 3)}`}
                    />
                    <DebugRow
                        label="Lengths outer / extra"
                        value={`${suggestion.outerLengthCm.toFixed(
                            4,
                        )} / ${suggestion.extraLengthCm.toFixed(4)} cm`}
                    />
                    <DebugRow
                        label="Minimum selected distance"
                        value={number(suggestion.minimumDistanceToOtherSelected, 4)}
                    />
                </div>
            ))}
        </Card>
    );
};

export default SuggestedMultiSupportCandidatesDebugPanel;
