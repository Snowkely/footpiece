import { Button, Empty, Tag, Typography } from 'antd';
import React from 'react';
import type { NearbyMultiSupportSearchCandidateSummary } from '../geometry/targetMultiSupportOuterCurveSearch';
import type { NearbyMultiSupportSearchStatus } from '../hooks/useNearbyMultiSupportSearch';

const { Text } = Typography;

interface NearbyValidCandidateHistoryProps {
    candidates: NearbyMultiSupportSearchCandidateSummary[];
    selectedCandidateId?: number;
    status: NearbyMultiSupportSearchStatus;
    onSelect: (candidateId: number) => void;
    onPrevious: () => void;
    onNext: () => void;
}

function formatDiagnostic(value?: number): string {
    return value === undefined || !Number.isFinite(value) ? '—' : `${value.toFixed(2)}°`;
}

const NearbyValidCandidateHistory: React.FC<NearbyValidCandidateHistoryProps> = ({
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
            <div className="foot-drafting-nearby-history-heading">
                <Text strong>Nearby Valid Candidate History</Text>
                <Tag color="cyan">{candidates.length} valid</Tag>
            </div>

            <div className="foot-drafting-nearby-navigation">
                <Button size="small" disabled={selectedIndex <= 0} onClick={onPrevious}>
                    Previous
                </Button>
                <Text type="secondary">
                    {selectedIndex >= 0
                        ? `Candidate #${candidates[selectedIndex].id}`
                        : 'No search preview selected'}
                </Text>
                <Button
                    size="small"
                    disabled={selectedIndex < 0 || selectedIndex >= candidates.length - 1}
                    onClick={onNext}
                >
                    Next
                </Button>
            </div>

            {waitingForNext && (
                <Text type="secondary" className="foot-drafting-nearby-waiting">
                    Waiting for next nearby valid candidate…
                </Text>
            )}

            {!candidates.length ? (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Valid candidates will stream here in discovery order."
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
                                aria-label={`Preview candidate #${candidate.id}`}
                                aria-pressed={selected}
                                className={`foot-drafting-nearby-history-item${
                                    selected ? ' is-selected' : ''
                                }`}
                                onClick={() => onSelect(candidate.id)}
                            >
                                <span className="foot-drafting-nearby-history-title">
                                    <strong>#{candidate.id}</strong>
                                    <span>distance {candidate.distanceFromSeed.toFixed(3)}</span>
                                </span>
                                <span>
                                    α {candidate.alpha.toFixed(3)} · θ{' '}
                                    {candidate.thetaDeg.toFixed(1)}° · λ{' '}
                                    {candidate.lambdaCm.toFixed(2)} cm
                                </span>
                                <span>
                                    outer {candidate.outerLengthCm.toFixed(3)} cm · extra{' '}
                                    {candidate.extraLengthCm.toFixed(3)} cm
                                </span>
                                <span>
                                    tangent L{' '}
                                    {formatDiagnostic(
                                        candidate.diagnostics.lEndpointTangentMismatchDeg,
                                    )}{' '}
                                    · G&apos;{' '}
                                    {formatDiagnostic(
                                        candidate.diagnostics.gPrimeEndpointTangentMismatchDeg,
                                    )}{' '}
                                    · W&apos;{' '}
                                    {formatDiagnostic(
                                        candidate.diagnostics.wPrimeTangentAngleToFootAxisDeg,
                                    )}
                                </span>
                                <span>
                                    toe turn max{' '}
                                    {formatDiagnostic(candidate.diagnostics.maxToeTurningDeg)}
                                    {' · '}mean{' '}
                                    {formatDiagnostic(candidate.diagnostics.meanToeTurningDeg)}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default NearbyValidCandidateHistory;
