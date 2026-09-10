import { Button, Collapse, Empty, Tag, Typography } from 'antd';
import React from 'react';
import type { BroadMultiSupportSearchCandidateSummary } from '../geometry/broadMultiSupportSearch';
import type { NearbyMultiSupportSearchStatus } from '../hooks/useNearbyMultiSupportSearch';

const { Text } = Typography;

interface BroadValidCandidateHistoryProps {
    candidates: BroadMultiSupportSearchCandidateSummary[];
    selectedCandidateId?: number;
    status: NearbyMultiSupportSearchStatus;
    onSelect: (candidateId: number) => void;
    onPrevious: () => void;
    onNext: () => void;
}

function formatDiagnostic(value?: number): string {
    return value === undefined || !Number.isFinite(value) ? '—' : `${value.toFixed(2)}°`;
}

const BroadValidCandidateHistory: React.FC<BroadValidCandidateHistoryProps> = ({
    candidates,
    selectedCandidateId,
    status,
    onSelect,
    onPrevious,
    onNext,
}) => {
    const selectedIndex = candidates.findIndex((candidate) => candidate.id === selectedCandidateId);
    const waitingForNext =
        status === 'RUNNING' && selectedIndex >= 0 && selectedIndex === candidates.length - 1;

    return (
        <div className="foot-drafting-nearby-history">
            <Collapse
                ghost
                className="foot-drafting-broad-history-collapse"
                items={[
                    {
                        key: 'broad-history',
                        label: (
                            <div className="foot-drafting-nearby-history-heading">
                                <Text strong>Broad Valid Candidate History</Text>
                                <Tag color="geekblue">{candidates.length} valid</Tag>
                            </div>
                        ),
                        children: (
                            <>
                                <div className="foot-drafting-nearby-navigation">
                                    <Button
                                        size="small"
                                        disabled={selectedIndex <= 0}
                                        onClick={onPrevious}
                                    >
                                        Previous
                                    </Button>
                                    <Text type="secondary">
                                        {selectedIndex >= 0
                                            ? `Broad Candidate #${candidates[selectedIndex].id}`
                                            : 'No broad preview selected'}
                                    </Text>
                                    <Button
                                        size="small"
                                        disabled={
                                            selectedIndex < 0 ||
                                            selectedIndex >= candidates.length - 1
                                        }
                                        onClick={onNext}
                                    >
                                        Next
                                    </Button>
                                </div>

                                {waitingForNext && (
                                    <Text type="secondary" className="foot-drafting-nearby-waiting">
                                        Waiting for next broad valid candidate…
                                    </Text>
                                )}

                                {!candidates.length ? (
                                    <Empty
                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                        description="Broad VALID candidates will stream here in deterministic grid order."
                                    />
                                ) : (
                                    <div className="foot-drafting-nearby-history-list" role="list">
                                        {candidates.map((candidate) => {
                                            const selected = candidate.id === selectedCandidateId;
                                            return (
                                                <button
                                                    key={candidate.id}
                                                    type="button"
                                                    role="listitem"
                                                    aria-label={`Preview broad candidate #${candidate.id}`}
                                                    aria-pressed={selected}
                                                    className={`foot-drafting-nearby-history-item foot-drafting-broad-history-item${
                                                        selected ? ' is-selected' : ''
                                                    }`}
                                                    onClick={() => onSelect(candidate.id)}
                                                >
                                                    <span className="foot-drafting-nearby-history-title">
                                                        <strong>#{candidate.id}</strong>
                                                        <span>global coarse grid</span>
                                                    </span>
                                                    <span>
                                                        α {candidate.alpha.toFixed(3)} · θ{' '}
                                                        {candidate.thetaDeg.toFixed(1)}° · λ{' '}
                                                        {candidate.lambdaCm.toFixed(2)} cm
                                                    </span>
                                                    <span>
                                                        outer {candidate.outerLengthCm.toFixed(3)}{' '}
                                                        cm · extra{' '}
                                                        {candidate.extraLengthCm.toFixed(3)} cm
                                                    </span>
                                                    <span>
                                                        tangent L{' '}
                                                        {formatDiagnostic(
                                                            candidate.diagnostics
                                                                .lEndpointTangentMismatchDeg,
                                                        )}{' '}
                                                        · G&apos;{' '}
                                                        {formatDiagnostic(
                                                            candidate.diagnostics
                                                                .gPrimeEndpointTangentMismatchDeg,
                                                        )}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        ),
                    },
                ]}
            />
        </div>
    );
};

export default BroadValidCandidateHistory;
