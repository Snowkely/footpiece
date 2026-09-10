import { Card, Tag, Typography } from 'antd';
import React from 'react';
import type { NearbyMultiSupportSearchController } from '../hooks/useNearbyMultiSupportSearch';

const { Text } = Typography;

interface NearbyMultiSupportSearchDebugPanelProps {
    controller: NearbyMultiSupportSearchController;
}

const DebugRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="foot-drafting-value-row">
        <Text>{label}</Text>
        <Text className="foot-drafting-debug-value">{value}</Text>
    </div>
);

const NearbyMultiSupportSearchDebugPanel: React.FC<NearbyMultiSupportSearchDebugPanelProps> = ({
    controller,
}) => {
    const { result, selectedCandidate } = controller;
    const rejection = result?.rejectionStats;
    const cache = result?.cacheStats;

    return (
        <Card size="small" title="Nearby Multi-Support Search" className="foot-drafting-debug-card">
            <DebugRow
                label="Status"
                value={
                    <Tag color={controller.status === 'RUNNING' ? 'processing' : undefined}>
                        {controller.status}
                    </Tag>
                }
            />
            <DebugRow
                label="Frozen seed"
                value={
                    controller.seed
                        ? `α ${controller.seed.alpha.toFixed(
                              3,
                          )} · θ ${controller.seed.thetaDeg.toFixed(
                              1,
                          )}° · λ ${controller.seed.lambdaCm.toFixed(2)} cm`
                        : '—'
                }
            />
            <DebugRow
                label="Config"
                value={
                    result
                        ? `α ±${result.config.alphaRadius}/${result.config.alphaStep} · θ ±${result.config.thetaRadiusDeg}/${result.config.thetaStepDeg}° · λ ±${result.config.lambdaRadiusCm}/${result.config.lambdaStepCm} cm`
                        : '—'
                }
            />
            <DebugRow label="Candidate count" value={result?.totalCandidateCount ?? '—'} />
            <DebugRow
                label="Progress"
                value={
                    result ? `${result.evaluatedCandidateCount}/${result.totalCandidateCount}` : '—'
                }
            />
            <DebugRow label="Elapsed" value={`${(controller.elapsedMs / 1000).toFixed(2)} s`} />
            <DebugRow
                label="Valid / invalid"
                value={
                    result ? `${result.validCandidateCount} / ${result.invalidCandidateCount}` : '—'
                }
            />
            <DebugRow label="Too short" value={rejection?.tooShort ?? '—'} />
            <DebugRow label="Too long" value={rejection?.tooLong ?? '—'} />
            <DebugRow label="Inside reference" value={rejection?.insideReference ?? '—'} />
            <DebugRow
                label="Reference intersection"
                value={rejection?.referenceIntersection ?? '—'}
            />
            <DebugRow label="Self intersection" value={rejection?.selfIntersection ?? '—'} />
            <DebugRow label="Step 4 build errors" value={rejection?.utBuildError ?? '—'} />
            <DebugRow
                label="Step 6A build errors"
                value={rejection?.toeReferenceBuildError ?? '—'}
            />
            <DebugRow label="Step 5 build errors" value={rejection?.wPrimeBuildError ?? '—'} />
            <DebugRow
                label="Step 6B build errors"
                value={rejection?.toeOuterSupportBuildError ?? '—'}
            />
            <DebugRow label="Step 6C build errors" value={rejection?.outerCurveBuildError ?? '—'} />
            <DebugRow
                label="Invalid θ skipped"
                value={result?.invalidThetaSkippedCandidates ?? '—'}
            />
            <DebugRow
                label="α cache builds / hits"
                value={cache ? `${cache.alpha.builds} / ${cache.alpha.hits}` : '—'}
            />
            <DebugRow
                label="θ cache builds / hits"
                value={cache ? `${cache.theta.builds} / ${cache.theta.hits}` : '—'}
            />
            <DebugRow
                label="λ cache builds / hits"
                value={cache ? `${cache.lambda.builds} / ${cache.lambda.hits}` : '—'}
            />
            <DebugRow
                label="θ+λ cache builds / hits"
                value={cache ? `${cache.thetaLambda.builds} / ${cache.thetaLambda.hits}` : '—'}
            />
            <DebugRow
                label="Selected preview"
                value={
                    selectedCandidate
                        ? `#${selectedCandidate.id} · α ${selectedCandidate.alpha.toFixed(
                              3,
                          )} · θ ${selectedCandidate.thetaDeg.toFixed(
                              1,
                          )}° · λ ${selectedCandidate.lambdaCm.toFixed(2)} cm`
                        : '—'
                }
            />
            <DebugRow
                label="Preview length / extra"
                value={
                    selectedCandidate
                        ? `${selectedCandidate.outerLengthCm.toFixed(
                              4,
                          )} / ${selectedCandidate.extraLengthCm.toFixed(4)} cm`
                        : '—'
                }
            />
            <Text type="secondary" className="foot-drafting-search-count-note">
                Rejection counts can overlap because one invalid curve can have multiple reasons.
            </Text>
        </Card>
    );
};

export default NearbyMultiSupportSearchDebugPanel;
