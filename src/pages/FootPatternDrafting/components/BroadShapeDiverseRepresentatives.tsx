import { Alert, Button, Collapse, Select, Tag, Typography } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import type {
    MultiSupportQualityPoolResult,
    QualityPoolCandidateSummary,
} from '../geometry/multiSupportQualityPool';
import {
    buildShapeDescriptors,
    REPRESENTATIVE_RESULT_COUNT,
    REPRESENTATIVE_RESULT_COUNT_OPTIONS,
    selectMaxMinShapeDiverseCandidates,
} from '../geometry/multiSupportShapeDiversity';
import type { NearbyMultiSupportSearchSeed } from '../geometry/targetMultiSupportOuterCurveSearch';
import type { NearbyMultiSupportSearchStatus } from '../hooks/useNearbyMultiSupportSearch';
import type { GeometryBuildResult, TargetMultiSupportOuterCurveCandidate } from '../types';

const { Text } = Typography;

interface BroadShapeDiverseRepresentativesProps {
    qualityPool?: MultiSupportQualityPoolResult;
    status: NearbyMultiSupportSearchStatus;
    rebuildCandidate: (
        candidateId: number,
    ) => GeometryBuildResult<TargetMultiSupportOuterCurveCandidate>;
    onPreviewCandidate: (candidateId: number) => void;
    onApplyCandidate: (candidate: NearbyMultiSupportSearchSeed) => void;
}

const BroadShapeDiverseRepresentatives: React.FC<BroadShapeDiverseRepresentativesProps> = ({
    qualityPool,
    status,
    rebuildCandidate,
    onPreviewCandidate,
    onApplyCandidate,
}) => {
    const [requestedCount, setRequestedCount] = useState(REPRESENTATIVE_RESULT_COUNT);
    const [selectedCandidateId, setSelectedCandidateId] = useState<number>();
    const descriptors = useMemo(() => {
        if (status !== 'COMPLETED' || !qualityPool) return undefined;
        return buildShapeDescriptors({
            candidates: qualityPool.candidates,
            buildCandidateCurve: (candidate: QualityPoolCandidateSummary) =>
                rebuildCandidate(candidate.sourceCandidateId),
        });
    }, [qualityPool, rebuildCandidate, status]);
    const selection = useMemo(() => {
        if (!descriptors) return undefined;
        return descriptors.geometry
            ? selectMaxMinShapeDiverseCandidates(descriptors.geometry, requestedCount)
            : { errors: descriptors.errors };
    }, [descriptors, requestedCount]);
    const representatives = selection?.geometry?.representatives ?? [];

    useEffect(() => {
        if (!representatives.some((item) => item.sourceBroadCandidateId === selectedCandidateId)) {
            setSelectedCandidateId(representatives[0]?.sourceBroadCandidateId);
        }
    }, [representatives, selectedCandidateId]);

    if (status !== 'COMPLETED') {
        return (
            <section className="foot-drafting-shape-representatives">
                <Text strong>Shape-Diverse Representative Results</Text>
                <Text type="secondary" className="foot-drafting-quality-pool-note">
                    Representative selection is available after Broad Search completes.
                </Text>
            </section>
        );
    }

    if (!qualityPool) return null;
    const selectedIndex = representatives.findIndex(
        (item) => item.sourceBroadCandidateId === selectedCandidateId,
    );
    const selected = selectedIndex >= 0 ? representatives[selectedIndex] : undefined;

    const preview = (candidateId: number) => {
        setSelectedCandidateId(candidateId);
        onPreviewCandidate(candidateId);
    };

    return (
        <section className="foot-drafting-shape-representatives">
            <div className="foot-drafting-quality-pool-heading">
                <Text strong>Shape-Diverse Representative Results</Text>
                <Tag color="cyan">{selection?.geometry?.actualCount ?? 0}</Tag>
            </div>
            <Text type="secondary" className="foot-drafting-quality-pool-note">
                Max-Min Shape Diversity Selection over the completed Quality Pool. Curve shape is
                compared in the shared drafting coordinates without alignment.
            </Text>

            {selection?.errors.map((error) => (
                <Alert
                    key={error.code}
                    showIcon
                    type="error"
                    message={error.code}
                    description={error.message}
                />
            ))}

            {selection?.geometry && (
                <>
                    <div className="foot-drafting-shape-summary">
                        <span>Quality Pool: {selection.geometry.qualityPoolSize}</span>
                        <span>Representative Results: {selection.geometry.actualCount}</span>
                        <span>Descriptor points: {selection.geometry.descriptorPointCount}</span>
                        <span>
                            Pairwise shape distance min/mean/max:{' '}
                            {selection.geometry.minimumPairwiseDistanceCm.toFixed(4)} /{' '}
                            {selection.geometry.meanPairwiseDistanceCm.toFixed(4)} /{' '}
                            {selection.geometry.maximumPairwiseDistanceCm.toFixed(4)} cm
                        </span>
                    </div>

                    <label className="foot-drafting-representative-count">
                        Representative count
                        <Select
                            aria-label="Representative count"
                            value={requestedCount}
                            options={REPRESENTATIVE_RESULT_COUNT_OPTIONS.map((value) => ({
                                value,
                                label: value,
                            }))}
                            onChange={setRequestedCount}
                        />
                    </label>

                    <div className="foot-drafting-representative-navigation">
                        <Text className="foot-drafting-representative-navigation-label">
                            {selectedIndex >= 0
                                ? `Representative #${selectedIndex + 1}`
                                : 'No representative selected'}
                        </Text>
                        <div className="foot-drafting-representative-navigation-actions">
                            <Button
                                size="small"
                                disabled={selectedIndex <= 0}
                                onClick={() =>
                                    preview(
                                        representatives[selectedIndex - 1].sourceBroadCandidateId,
                                    )
                                }
                            >
                                Previous Representative
                            </Button>
                            <Button
                                size="small"
                                disabled={
                                    selectedIndex < 0 || selectedIndex >= representatives.length - 1
                                }
                                onClick={() =>
                                    preview(
                                        representatives[selectedIndex + 1].sourceBroadCandidateId,
                                    )
                                }
                            >
                                Next Representative
                            </Button>
                        </div>
                    </div>

                    <div className="foot-drafting-representative-list" role="list">
                        {representatives.map((representative) => {
                            const selectedCard =
                                representative.sourceBroadCandidateId === selectedCandidateId;
                            return (
                                <button
                                    key={representative.sourceBroadCandidateId}
                                    type="button"
                                    role="listitem"
                                    aria-label={`Preview Representative #${representative.representativeIndex}`}
                                    aria-pressed={selectedCard}
                                    className={`foot-drafting-representative-item${
                                        selectedCard ? ' is-selected' : ''
                                    }`}
                                    onClick={() => preview(representative.sourceBroadCandidateId)}
                                >
                                    <strong>
                                        Representative #{representative.representativeIndex}
                                    </strong>
                                    <span>
                                        Broad Candidate #{representative.sourceBroadCandidateId}
                                    </span>
                                    <span>
                                        α {representative.alpha.toFixed(3)} · θ{' '}
                                        {representative.thetaDeg.toFixed(1)}° · λ{' '}
                                        {representative.lambdaCm.toFixed(2)} cm
                                    </span>
                                    <span>
                                        soft {representative.softScore.toFixed(4)} · outer{' '}
                                        {representative.outerLengthCm.toFixed(3)} cm · extra{' '}
                                        {representative.extraLengthCm.toFixed(3)} cm
                                    </span>
                                    <span>
                                        Minimum shape distance:{' '}
                                        {representative.minimumShapeDistanceToPreviousCm ===
                                        undefined
                                            ? 'N/A — seed quality representative'
                                            : `${representative.minimumShapeDistanceToPreviousCm.toFixed(
                                                  4,
                                              )} cm`}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <Button
                        type="primary"
                        ghost
                        block
                        className="foot-drafting-broad-apply"
                        disabled={!selected}
                        onClick={() => selected && onApplyCandidate(selected)}
                    >
                        Apply to Manual
                    </Button>

                    <Collapse
                        ghost
                        className="foot-drafting-quality-pool-collapse"
                        items={[
                            {
                                key: 'shape-matrix',
                                label: 'Shape Distance Matrix (cm)',
                                children: (
                                    <div className="foot-drafting-shape-matrix">
                                        {selection.geometry!.pairwiseShapeDistanceMatrixCm.map(
                                            (row, rowIndex) => (
                                                <div
                                                    key={`shape-row-${rowIndex}`}
                                                    className="foot-drafting-shape-matrix-row"
                                                >
                                                    <strong>#{rowIndex + 1}</strong>
                                                    {row.map((value, columnIndex) => (
                                                        <span
                                                            key={`shape-${rowIndex}-${columnIndex}`}
                                                        >
                                                            {value.toFixed(4)}
                                                        </span>
                                                    ))}
                                                </div>
                                            ),
                                        )}
                                    </div>
                                ),
                            },
                        ]}
                    />
                </>
            )}
        </section>
    );
};

export default BroadShapeDiverseRepresentatives;
