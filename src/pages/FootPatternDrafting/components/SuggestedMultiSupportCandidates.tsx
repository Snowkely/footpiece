import {
    Alert,
    Button,
    Collapse,
    Empty,
    Form,
    InputNumber,
    Select,
    Space,
    Tag,
    Typography,
} from 'antd';
import React from 'react';
import type {
    SuggestedCandidateCount,
    SuggestedCandidateMetricWeights,
    SuggestedCandidateRankingConfig,
} from '../geometry/suggestedMultiSupportCandidates';
import { DEFAULT_SUGGESTED_CANDIDATE_RANKING_CONFIG } from '../geometry/suggestedMultiSupportCandidates';
import type { NearbyMultiSupportSearchStatus } from '../hooks/useNearbyMultiSupportSearch';
import type { SuggestedMultiSupportCandidatesController } from '../hooks/useSuggestedMultiSupportCandidates';

const { Text } = Typography;

interface SuggestedMultiSupportCandidatesProps {
    status: NearbyMultiSupportSearchStatus;
    controller: SuggestedMultiSupportCandidatesController;
    onApplyCandidate: () => void;
}

const WEIGHT_FIELDS: Array<{ key: keyof SuggestedCandidateMetricWeights; label: string }> = [
    { key: 'lEndpointMismatch', label: 'L endpoint' },
    { key: 'gPrimeEndpointMismatch', label: "G' endpoint" },
    { key: 'maxToeTurning', label: 'Max toe turning' },
    { key: 'toeTurningVariation', label: 'Toe turning variation' },
];

function heading(status: NearbyMultiSupportSearchStatus): string {
    if (status === 'RUNNING') {
        return 'Suggested So Far';
    }
    if (status === 'CANCELLED') {
        return 'Suggested From Partial Results';
    }
    return 'Suggested Results';
}

function formatDegrees(value?: number): string {
    return value === undefined || !Number.isFinite(value) ? '—' : `${value.toFixed(2)}°`;
}

const SuggestedMultiSupportCandidates: React.FC<SuggestedMultiSupportCandidatesProps> = ({
    status,
    controller,
    onApplyCandidate,
}) => {
    const { selection, rankingConfig } = controller;
    const selectedIndex =
        selection?.suggestions.findIndex(
            (candidate) => candidate.sourceCandidateId === controller.selectedCandidateId,
        ) ?? -1;

    const updateConfig = (next: Partial<SuggestedCandidateRankingConfig>) => {
        controller.setRankingConfig({
            ...rankingConfig,
            ...next,
            weights: next.weights ?? rankingConfig.weights,
        });
    };
    const updateWeight = (key: keyof SuggestedCandidateMetricWeights, value: number | null) => {
        if (value === null) {
            return;
        }
        updateConfig({ weights: { ...rankingConfig.weights, [key]: value } });
    };

    return (
        <section className="foot-drafting-suggested" aria-label="Suggested candidates">
            <div className="foot-drafting-nearby-history-heading">
                <Text strong>{heading(status)}</Text>
                <Tag color="purple">{selection?.actualCount ?? 0} candidates</Tag>
            </div>

            <Text type="secondary" className="foot-drafting-suggestion-note">
                Soft score is relative to the current VALID candidate pool. Suggestions are useful
                alternatives, not a unique best or optimal result.
            </Text>

            {status === 'RUNNING' && (
                <Text type="secondary" className="foot-drafting-suggestion-streaming-note">
                    Suggestions update as new VALID candidates are found. Final suggestions are
                    settled when the search completes.
                </Text>
            )}

            {status === 'CANCELLED' && (
                <Alert
                    showIcon
                    type="warning"
                    message="Search was cancelled"
                    description="Suggestions are based on partial results."
                />
            )}

            {selection && selection.actualCount < selection.requestedCount && (
                <Alert
                    showIcon
                    type="info"
                    message={`${selection.actualCount} Suggested Candidates`}
                    description={`Requested: ${selection.requestedCount}. Only ${selection.actualCount} rankable valid candidates are available.`}
                />
            )}

            {controller.selectedCandidateId !== undefined &&
                !controller.previewIsCurrentSuggestion &&
                controller.selectedSourceCandidate && (
                    <Alert
                        showIcon
                        type="info"
                        message="Preview retained"
                        description="This preview is no longer in the current Suggested set. Select another suggestion to change it."
                    />
                )}

            <div className="foot-drafting-suggested-navigation">
                <Text type="secondary" className="foot-drafting-suggested-navigation-label">
                    {selectedIndex >= 0
                        ? `Suggested Candidate #${selection?.suggestions[selectedIndex].suggestionIndex}`
                        : 'No suggested preview selected'}
                </Text>
                <div className="foot-drafting-suggested-navigation-actions">
                    <Button
                        size="small"
                        disabled={selectedIndex <= 0}
                        onClick={controller.selectPrevious}
                    >
                        Previous Suggested
                    </Button>
                    <Button
                        size="small"
                        disabled={
                            selectedIndex < 0 ||
                            selectedIndex >= (selection?.suggestions.length ?? 0) - 1
                        }
                        onClick={controller.selectNext}
                    >
                        Next Suggested
                    </Button>
                </div>
            </div>

            {!selection?.suggestions.length ? (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                        status === 'RUNNING'
                            ? 'Suggested candidates will update as VALID results stream in.'
                            : 'Run Nearby Search to build a VALID candidate pool.'
                    }
                />
            ) : (
                <div className="foot-drafting-suggested-list" role="list">
                    {selection.suggestions.map((suggestion) => {
                        const selected =
                            suggestion.sourceCandidateId === controller.selectedCandidateId;
                        return (
                            <button
                                type="button"
                                role="listitem"
                                key={suggestion.sourceCandidateId}
                                aria-label={`Preview suggested candidate #${suggestion.suggestionIndex}`}
                                aria-pressed={selected}
                                className={`foot-drafting-nearby-history-item foot-drafting-suggested-item${
                                    selected ? ' is-selected' : ''
                                }`}
                                onClick={() =>
                                    controller.selectSuggestion(suggestion.sourceCandidateId)
                                }
                            >
                                <span className="foot-drafting-nearby-history-title">
                                    <strong>
                                        Suggested Candidate #{suggestion.suggestionIndex}
                                    </strong>
                                    <span>source #{suggestion.sourceCandidateId}</span>
                                </span>
                                <span>
                                    α {suggestion.alpha.toFixed(3)} · θ{' '}
                                    {suggestion.thetaDeg.toFixed(1)}° · λ{' '}
                                    {suggestion.lambdaCm.toFixed(2)} cm
                                </span>
                                <span>
                                    soft score {suggestion.softScore.toFixed(4)} · extra +
                                    {suggestion.extraLengthCm.toFixed(3)} cm
                                </span>
                                <span>
                                    L {formatDegrees(suggestion.rawMetrics.lEndpointMismatchDeg)} ·
                                    G&apos;{' '}
                                    {formatDegrees(suggestion.rawMetrics.gPrimeEndpointMismatchDeg)}{' '}
                                    · toe max{' '}
                                    {formatDegrees(suggestion.rawMetrics.maxToeTurningDeg)} ·
                                    variation{' '}
                                    {formatDegrees(suggestion.rawMetrics.toeTurningVariationDeg)}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {controller.errors.map((error) => (
                <Alert
                    key={error.code}
                    showIcon
                    type="error"
                    message={error.code}
                    description={error.message}
                />
            ))}
            {selection?.warnings.map((warning) => (
                <Alert
                    key={warning.code}
                    showIcon
                    type="warning"
                    message={warning.code}
                    description={warning.message}
                />
            ))}

            <Button
                type="primary"
                ghost
                block
                disabled={!controller.selectedSourceCandidate}
                onClick={onApplyCandidate}
            >
                Apply Suggested Candidate
            </Button>

            <Collapse
                ghost
                className="foot-drafting-nearby-config foot-drafting-suggestion-config"
                items={[
                    {
                        key: 'advanced-suggestions',
                        label: 'Advanced Suggestion Settings',
                        children: (
                            <>
                                <Form layout="vertical" requiredMark={false}>
                                    <Form.Item label="Suggested count">
                                        <Select<SuggestedCandidateCount>
                                            value={rankingConfig.resultCount}
                                            options={[3, 5, 8].map((value) => ({
                                                label: value,
                                                value: value as SuggestedCandidateCount,
                                            }))}
                                            onChange={(value) =>
                                                updateConfig({ resultCount: value })
                                            }
                                        />
                                    </Form.Item>
                                    <div className="foot-drafting-nearby-config-grid">
                                        {WEIGHT_FIELDS.map((field) => (
                                            <Form.Item
                                                key={field.key}
                                                label={`${field.label} weight`}
                                            >
                                                <InputNumber
                                                    min={0}
                                                    step={0.05}
                                                    precision={2}
                                                    value={rankingConfig.weights[field.key]}
                                                    onChange={(value) =>
                                                        updateWeight(field.key, value)
                                                    }
                                                />
                                            </Form.Item>
                                        ))}
                                    </div>
                                    <Form.Item label="Diversity threshold">
                                        <InputNumber
                                            min={0}
                                            step={0.05}
                                            precision={2}
                                            value={rankingConfig.diversityThreshold}
                                            onChange={(value) =>
                                                value !== null &&
                                                updateConfig({ diversityThreshold: value })
                                            }
                                        />
                                    </Form.Item>
                                </Form>
                                <Space wrap>
                                    <Button
                                        size="small"
                                        onClick={() =>
                                            controller.setRankingConfig({
                                                ...DEFAULT_SUGGESTED_CANDIDATE_RANKING_CONFIG,
                                                weights: {
                                                    ...DEFAULT_SUGGESTED_CANDIDATE_RANKING_CONFIG.weights,
                                                },
                                            })
                                        }
                                    >
                                        Reset Suggestion Defaults
                                    </Button>
                                    <Text type="secondary">
                                        Min-max normalization within the current VALID pool.
                                    </Text>
                                </Space>
                            </>
                        ),
                    },
                ]}
            />
        </section>
    );
};

export default SuggestedMultiSupportCandidates;
