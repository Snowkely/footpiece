import {
    Alert,
    Button,
    Card,
    Collapse,
    Form,
    InputNumber,
    Progress,
    Space,
    Tag,
    Typography,
} from 'antd';
import React, { useMemo, useState } from 'react';
import type { BroadMultiSupportSearchConfig } from '../geometry/broadMultiSupportSearch';
import {
    DEFAULT_BROAD_MULTI_SUPPORT_SEARCH_CONFIG,
    fitBroadSearchConfigToEvaluationLimit,
    MAX_BROAD_SEARCH_EVALUATIONS,
} from '../geometry/broadMultiSupportSearch';
import type { NearbyMultiSupportSearchSeed } from '../geometry/targetMultiSupportOuterCurveSearch';
import type { BroadMultiSupportSearchController } from '../hooks/useBroadMultiSupportSearch';
import BroadQualityPool from './BroadQualityPool';
import BroadValidCandidateHistory from './BroadValidCandidateHistory';

const { Text } = Typography;

interface BroadMultiSupportSearchControlsProps {
    manualPreview: NearbyMultiSupportSearchSeed;
    inputsAvailable: boolean;
    controller: BroadMultiSupportSearchController;
    onApplyCandidate: (candidate: NearbyMultiSupportSearchSeed) => void;
}

type ConfigKey = keyof BroadMultiSupportSearchConfig;

const CONFIG_FIELDS: Array<{
    key: ConfigKey;
    label: string;
    min: number;
    max: number;
    step: number;
    precision: number;
    unit?: string;
}> = [
    { key: 'alphaMin', label: 'Alpha min', min: 0, max: 1, step: 0.05, precision: 2 },
    { key: 'alphaMax', label: 'Alpha max', min: 0, max: 1, step: 0.05, precision: 2 },
    { key: 'alphaStep', label: 'Alpha step', min: 0.001, max: 1, step: 0.01, precision: 3 },
    { key: 'thetaMinDeg', label: 'Theta min', min: 2, max: 30, step: 0.5, precision: 1, unit: '°' },
    { key: 'thetaMaxDeg', label: 'Theta max', min: 2, max: 30, step: 0.5, precision: 1, unit: '°' },
    {
        key: 'thetaStepDeg',
        label: 'Theta step',
        min: 0.1,
        max: 28,
        step: 0.5,
        precision: 2,
        unit: '°',
    },
    {
        key: 'lambdaMinCm',
        label: 'Lambda min',
        min: 0,
        max: 8,
        step: 0.1,
        precision: 2,
        unit: 'cm',
    },
    {
        key: 'lambdaMaxCm',
        label: 'Lambda max',
        min: 0,
        max: 8,
        step: 0.1,
        precision: 2,
        unit: 'cm',
    },
    {
        key: 'lambdaStepCm',
        label: 'Lambda step',
        min: 0.01,
        max: 8,
        step: 0.1,
        precision: 2,
        unit: 'cm',
    },
];

function cloneDefaultConfig(): BroadMultiSupportSearchConfig {
    return { ...DEFAULT_BROAD_MULTI_SUPPORT_SEARCH_CONFIG };
}

const BroadMultiSupportSearchControls: React.FC<BroadMultiSupportSearchControlsProps> = ({
    manualPreview,
    inputsAvailable,
    controller,
    onApplyCandidate,
}) => {
    const [config, setConfig] = useState<BroadMultiSupportSearchConfig>(cloneDefaultConfig);
    const fit = useMemo(() => fitBroadSearchConfigToEvaluationLimit(config), [config]);
    const result = controller.result;
    const running = controller.status === 'RUNNING';
    const progressPercent = result?.totalCandidateCount
        ? (result.evaluatedCandidateCount / result.totalCandidateCount) * 100
        : 0;
    const effectiveConfig = fit.geometry?.config;

    const updateConfig = (key: ConfigKey, value: number | null) => {
        if (value !== null) {
            setConfig((current) => ({ ...current, [key]: value }));
        }
    };

    return (
        <Card className="foot-drafting-panel" title="Broad Multi-Support Search">
            <Text type="secondary" className="foot-drafting-panel-intro">
                Step 9A scans the legal α / θ / λ domain using a deterministic coarse grid. It is
                independent of the current manual preview and retains only lightweight VALID
                summaries.
            </Text>

            <div className="foot-drafting-control-summary">
                <span>
                    Manual preview α <Tag>{manualPreview.alpha.toFixed(3)}</Tag>
                </span>
                <span>
                    θ <Tag>{manualPreview.thetaDeg.toFixed(1)}°</Tag>
                </span>
                <span>
                    λ <Tag>{manualPreview.lambdaCm.toFixed(2)} cm</Tag>
                </span>
                <Text type="secondary">Not used as a Broad Search seed.</Text>
            </div>

            <div className="foot-drafting-broad-grid-summary">
                <Text strong>Full-domain coarse grid</Text>
                <span>
                    α: {config.alphaMin} → {config.alphaMax}
                </span>
                <span>
                    θ: {config.thetaMinDeg}° → {config.thetaMaxDeg}°
                </span>
                <span>
                    λ: {config.lambdaMinCm} → {config.lambdaMaxCm} cm
                </span>
                <span>
                    Requested steps: α {config.alphaStep} · θ {config.thetaStepDeg}° · λ{' '}
                    {config.lambdaStepCm} cm
                </span>
                <span>
                    Effective steps: α {effectiveConfig?.alphaStep ?? '—'} · θ{' '}
                    {effectiveConfig?.thetaStepDeg ?? '—'}° · λ{' '}
                    {effectiveConfig?.lambdaStepCm ?? '—'} cm
                </span>
                <span>
                    Estimated candidates:{' '}
                    <strong>{fit.geometry?.estimatedCount.toLocaleString() ?? 'invalid'}</strong> ·
                    Maximum {MAX_BROAD_SEARCH_EVALUATIONS.toLocaleString()}
                </span>
            </div>

            {fit.geometry?.adjusted && (
                <Alert
                    showIcon
                    type="warning"
                    message="Broad resolution adjusted automatically"
                    description={`Requested ${fit.geometry.requestedEstimatedCount.toLocaleString()} candidates exceeded the limit. Coarse steps were multiplied by ${fit.geometry.stepMultiplier.toFixed(
                        2,
                    )} to fit ${fit.geometry.estimatedCount.toLocaleString()} evaluations.`}
                />
            )}
            {fit.errors.map((error) => (
                <Alert
                    key={error.code}
                    showIcon
                    type="error"
                    message={error.code}
                    description={error.message}
                />
            ))}
            {controller.errors.map((error) => (
                <Alert
                    key={error.code}
                    showIcon
                    type="error"
                    message={error.code}
                    description={error.message}
                />
            ))}

            <Space wrap className="foot-drafting-nearby-actions">
                <Button
                    type="primary"
                    disabled={!inputsAvailable || running || !fit.geometry}
                    onClick={() => controller.start({ ...config })}
                >
                    {result ? 'Start New Broad Search' : 'Run Broad Search'}
                </Button>
                <Button danger disabled={!running} onClick={controller.cancel}>
                    Cancel Broad Search
                </Button>
                <Button disabled={running || !result} onClick={controller.clear}>
                    Clear Broad Search
                </Button>
            </Space>

            <div className="foot-drafting-nearby-status">
                <span>
                    Status <Tag color={running ? 'processing' : undefined}>{controller.status}</Tag>
                </span>
                {result && (
                    <>
                        <span>
                            Evaluated {result.evaluatedCandidateCount.toLocaleString()} /{' '}
                            {result.totalCandidateCount.toLocaleString()}
                        </span>
                        <span>Valid {result.validCandidateCount.toLocaleString()}</span>
                        <span>Invalid {result.invalidCandidateCount.toLocaleString()}</span>
                        <span>Elapsed {(controller.elapsedMs / 1000).toFixed(2)} s</span>
                    </>
                )}
            </div>
            {result && (
                <Progress
                    percent={Math.min(100, progressPercent)}
                    status={
                        controller.status === 'ERROR' ? 'exception' : running ? 'active' : 'normal'
                    }
                    format={() => `${result.evaluatedCandidateCount}/${result.totalCandidateCount}`}
                />
            )}

            <BroadQualityPool
                validCandidates={result?.validCandidates ?? []}
                status={controller.status}
                rebuildCandidate={controller.rebuildCandidate}
                onPreviewCandidate={controller.selectCandidate}
                onApplyCandidate={onApplyCandidate}
            />

            <Collapse
                ghost
                className="foot-drafting-nearby-config"
                items={[
                    {
                        key: 'broad-config',
                        label: 'Advanced Broad Search Config',
                        children: (
                            <>
                                <Form layout="vertical" requiredMark={false}>
                                    <div className="foot-drafting-nearby-config-grid">
                                        {CONFIG_FIELDS.map((field) => (
                                            <Form.Item key={field.key} label={field.label}>
                                                <InputNumber
                                                    min={field.min}
                                                    max={field.max}
                                                    step={field.step}
                                                    precision={field.precision}
                                                    addonAfter={field.unit}
                                                    value={config[field.key]}
                                                    onChange={(value) =>
                                                        updateConfig(field.key, value)
                                                    }
                                                />
                                            </Form.Item>
                                        ))}
                                    </div>
                                </Form>
                                <Button
                                    size="small"
                                    onClick={() => setConfig(cloneDefaultConfig())}
                                >
                                    Reset Broad Defaults
                                </Button>
                            </>
                        ),
                    },
                ]}
            />

            <BroadValidCandidateHistory
                candidates={result?.validCandidates ?? []}
                selectedCandidateId={controller.selectedCandidateId}
                status={controller.status}
                onSelect={controller.selectCandidate}
                onPrevious={controller.selectPrevious}
                onNext={controller.selectNext}
            />
            <Button
                type="primary"
                ghost
                block
                className="foot-drafting-broad-apply"
                disabled={!controller.selectedCandidate}
                onClick={() =>
                    controller.selectedCandidate && onApplyCandidate(controller.selectedCandidate)
                }
            >
                Apply to Manual
            </Button>

            {result && (
                <div className="foot-drafting-broad-diagnostics">
                    <Text strong>Broad Search Diagnostics</Text>
                    <span>Too short: {result.rejectionStats.tooShort}</span>
                    <span>Too long: {result.rejectionStats.tooLong}</span>
                    <span>Inside reference: {result.rejectionStats.insideReference}</span>
                    <span>
                        Reference intersection: {result.rejectionStats.referenceIntersection}
                    </span>
                    <span>Self intersection: {result.rejectionStats.selfIntersection}</span>
                    <span>
                        Build errors: UT {result.rejectionStats.utBuildError} · toe refs{' '}
                        {result.rejectionStats.toeReferenceBuildError} · W&apos;{' '}
                        {result.rejectionStats.wPrimeBuildError} · supports{' '}
                        {result.rejectionStats.toeOuterSupportBuildError} · curve{' '}
                        {result.rejectionStats.outerCurveBuildError}
                    </span>
                    <span>
                        Invalid-theta skipped tuples: {result.invalidThetaSkippedCandidates}
                    </span>
                    <span>
                        Cache α {result.cacheStats.alpha.builds}/{result.cacheStats.alpha.hits} · θ{' '}
                        {result.cacheStats.theta.builds}/{result.cacheStats.theta.hits} · λ{' '}
                        {result.cacheStats.lambda.builds}/{result.cacheStats.lambda.hits} · θλ{' '}
                        {result.cacheStats.thetaLambda.builds}/{result.cacheStats.thetaLambda.hits}
                    </span>
                </div>
            )}
        </Card>
    );
};

export default BroadMultiSupportSearchControls;
