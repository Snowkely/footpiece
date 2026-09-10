import { Alert, Collapse, Select, Tag, Typography } from 'antd';
import React, { useMemo, useState } from 'react';
import type { BroadMultiSupportSearchCandidateSummary } from '../geometry/broadMultiSupportSearch';
import {
    buildMultiSupportQualityPool,
    DEFAULT_MULTI_SUPPORT_QUALITY_POOL_CONFIG,
    QUALITY_POOL_FRACTION_OPTIONS,
} from '../geometry/multiSupportQualityPool';
import type { NearbyMultiSupportSearchSeed } from '../geometry/targetMultiSupportOuterCurveSearch';
import type { NearbyMultiSupportSearchStatus } from '../hooks/useNearbyMultiSupportSearch';
import type { GeometryBuildResult, TargetMultiSupportOuterCurveCandidate } from '../types';
import BroadShapeDiverseRepresentatives from './BroadShapeDiverseRepresentatives';

const { Text } = Typography;

interface BroadQualityPoolProps {
    validCandidates: readonly BroadMultiSupportSearchCandidateSummary[];
    status: NearbyMultiSupportSearchStatus;
    rebuildCandidate: (
        candidateId: number,
    ) => GeometryBuildResult<TargetMultiSupportOuterCurveCandidate>;
    onPreviewCandidate: (candidateId: number) => void;
    onApplyCandidate: (candidate: NearbyMultiSupportSearchSeed) => void;
}

function heading(status: NearbyMultiSupportSearchStatus): string {
    if (status === 'RUNNING') return 'Quality Pool So Far';
    if (status === 'CANCELLED') return 'Quality Pool From Partial Broad Results';
    return 'Quality Pool';
}

const BroadQualityPool: React.FC<BroadQualityPoolProps> = ({
    validCandidates,
    status,
    rebuildCandidate,
    onPreviewCandidate,
    onApplyCandidate,
}) => {
    const [fraction, setFraction] = useState(DEFAULT_MULTI_SUPPORT_QUALITY_POOL_CONFIG.fraction);
    const result = useMemo(
        () =>
            buildMultiSupportQualityPool({
                validCandidates,
                qualityPoolConfig: {
                    fraction,
                    minPoolSize: DEFAULT_MULTI_SUPPORT_QUALITY_POOL_CONFIG.minPoolSize,
                },
            }),
        [fraction, validCandidates],
    );
    const pool = result.geometry;

    return (
        <section className="foot-drafting-quality-pool">
            <div className="foot-drafting-quality-pool-heading">
                <Text strong>{heading(status)}</Text>
                <Tag color="blue">{pool?.actualPoolSize ?? 0}</Tag>
            </div>
            <div className="foot-drafting-quality-pool-summary">
                <span>Broad VALID: {pool?.validPoolSize ?? validCandidates.length}</span>
                <span>Quality Pool: {pool?.actualPoolSize ?? 0}</span>
                <span>Quality fraction: {(fraction * 100).toFixed(0)}%</span>
                <span>
                    Soft score: {pool?.scoreMin?.toFixed(4) ?? '—'} →{' '}
                    {pool?.scoreMax?.toFixed(4) ?? '—'}
                </span>
                <span>Diagnostics unavailable: {pool?.excludedDiagnosticsUnavailable ?? 0}</span>
            </div>

            {status === 'RUNNING' && (
                <Text type="secondary" className="foot-drafting-quality-pool-note">
                    Recomputed from the current streaming Broad VALID pool. No Viewer preview is
                    changed.
                </Text>
            )}
            {status === 'CANCELLED' && (
                <Text type="secondary" className="foot-drafting-quality-pool-note">
                    Broad search was cancelled. This pool is based on partial Broad results.
                </Text>
            )}

            {result.errors.map((error) => (
                <Alert
                    key={error.code}
                    showIcon
                    type="error"
                    message={error.code}
                    description={error.message}
                />
            ))}
            {pool?.warnings.map((warning) => (
                <Alert
                    key={warning.code}
                    showIcon
                    type="warning"
                    message={warning.code}
                    description={warning.message}
                />
            ))}

            <Collapse
                ghost
                className="foot-drafting-quality-pool-collapse"
                items={[
                    {
                        key: 'quality-settings',
                        label: 'Advanced Quality Pool Settings',
                        children: (
                            <div className="foot-drafting-quality-pool-settings">
                                <label htmlFor="quality-pool-fraction">Quality Pool Fraction</label>
                                <Select
                                    id="quality-pool-fraction"
                                    aria-label="Quality Pool Fraction"
                                    value={fraction}
                                    options={QUALITY_POOL_FRACTION_OPTIONS.map((value) => ({
                                        value,
                                        label: `${value * 100}%`,
                                    }))}
                                    onChange={setFraction}
                                />
                                <Text type="secondary">
                                    Minimum Pool Size:{' '}
                                    {DEFAULT_MULTI_SUPPORT_QUALITY_POOL_CONFIG.minPoolSize}
                                </Text>
                            </div>
                        ),
                    },
                ]}
            />

            <Collapse
                ghost
                className="foot-drafting-quality-pool-collapse"
                items={[
                    {
                        key: 'quality-list',
                        label: `Quality Pool (${pool?.actualPoolSize ?? 0})`,
                        children: (
                            <div className="foot-drafting-quality-pool-list" role="list">
                                {pool?.candidates.map((candidate) => (
                                    <div
                                        key={candidate.sourceCandidateId}
                                        className="foot-drafting-quality-pool-item"
                                        role="listitem"
                                    >
                                        <strong>#{candidate.sourceCandidateId}</strong>
                                        <span>α {candidate.alpha.toFixed(3)}</span>
                                        <span>θ {candidate.thetaDeg.toFixed(1)}°</span>
                                        <span>λ {candidate.lambdaCm.toFixed(2)} cm</span>
                                        <span>score {candidate.softScore.toFixed(4)}</span>
                                    </div>
                                ))}
                            </div>
                        ),
                    },
                ]}
            />

            <BroadShapeDiverseRepresentatives
                qualityPool={pool}
                status={status}
                rebuildCandidate={rebuildCandidate}
                onPreviewCandidate={onPreviewCandidate}
                onApplyCandidate={onApplyCandidate}
            />
        </section>
    );
};

export default BroadQualityPool;
