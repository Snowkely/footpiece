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
import type {
    NearbyMultiSupportSearchConfig,
    NearbyMultiSupportSearchConfigFit,
    NearbyMultiSupportSearchSeed,
} from '../geometry/targetMultiSupportOuterCurveSearch';
import {
    DEFAULT_NEARBY_MULTI_SUPPORT_SEARCH_CONFIG,
    estimateNearbyMultiSupportSearchCandidateCount,
    MAX_NEARBY_SEARCH_EVALUATIONS,
} from '../geometry/targetMultiSupportOuterCurveSearch';
import type { NearbyMultiSupportSearchController } from '../hooks/useNearbyMultiSupportSearch';
import NearbyValidCandidateHistory from './NearbyValidCandidateHistory';

const { Text } = Typography;

interface NearbyMultiSupportSearchControlsProps {
    manualSeed: NearbyMultiSupportSearchSeed;
    inputsAvailable: boolean;
    controller: NearbyMultiSupportSearchController;
    onApplyCandidate: (candidate: NearbyMultiSupportSearchSeed) => void;
}

type ConfigKey = keyof NearbyMultiSupportSearchConfig;

const CONFIG_FIELDS: Array<{
    key: ConfigKey;
    label: string;
    step: number;
    precision: number;
    unit?: string;
}> = [
    { key: 'alphaRadius', label: 'Alpha radius', step: 0.01, precision: 2 },
    { key: 'alphaStep', label: 'Alpha step', step: 0.01, precision: 3 },
    { key: 'thetaRadiusDeg', label: 'Theta radius', step: 0.5, precision: 1, unit: '°' },
    { key: 'thetaStepDeg', label: 'Theta step', step: 0.5, precision: 1, unit: '°' },
    { key: 'lambdaRadiusCm', label: 'Lambda radius', step: 0.1, precision: 2, unit: 'cm' },
    { key: 'lambdaStepCm', label: 'Lambda step', step: 0.1, precision: 2, unit: 'cm' },
];

function cloneDefaultConfig(): NearbyMultiSupportSearchConfig {
    return { ...DEFAULT_NEARBY_MULTI_SUPPORT_SEARCH_CONFIG };
}

const NearbyMultiSupportSearchControls: React.FC<NearbyMultiSupportSearchControlsProps> = ({
    manualSeed,
    inputsAvailable,
    controller,
    onApplyCandidate,
}) => {
    const [config, setConfig] = useState<NearbyMultiSupportSearchConfig>(cloneDefaultConfig);
    const [expansionFeedback, setExpansionFeedback] = useState<NearbyMultiSupportSearchConfigFit>();
    const estimate = useMemo(
        () => estimateNearbyMultiSupportSearchCandidateCount(manualSeed, config),
        [config, manualSeed],
    );
    const result = controller.result;
    const progressPercent = result?.totalCandidateCount
        ? (result.evaluatedCandidateCount / result.totalCandidateCount) * 100
        : 0;
    const running = controller.status === 'RUNNING';
    const startLabel = result ? 'Start New Nearby Search' : 'Start Nearby Search';

    const updateConfig = (key: ConfigKey, value: number | null) => {
        if (value !== null) {
            setConfig((current) => ({ ...current, [key]: value }));
        }
    };

    const handleExpand = () => {
        const fittedConfig = controller.expand();
        if (!fittedConfig) {
            return;
        }
        setConfig({ ...fittedConfig.config });
        setExpansionFeedback(fittedConfig);
    };

    return (
        <Card className="foot-drafting-panel" title="Nearby Multi-Support Search">
            <Text type="secondary" className="foot-drafting-panel-intro">
                Step 7 searches outward from a frozen manual α / θ / λ seed. It streams every valid
                candidate in discovery order and does not rank or auto-apply results.
            </Text>

            <div className="foot-drafting-control-summary">
                <span>
                    Manual α <Tag>{manualSeed.alpha.toFixed(3)}</Tag>
                </span>
                <span>
                    Manual θ <Tag>{manualSeed.thetaDeg.toFixed(1)}°</Tag>
                </span>
                <span>
                    Manual λ <Tag>{manualSeed.lambdaCm.toFixed(2)} cm</Tag>
                </span>
            </div>

            {controller.seed && (
                <div className="foot-drafting-nearby-seed" data-testid="frozen-search-seed">
                    <Text strong>Frozen Search Seed</Text>
                    <span>α {controller.seed.alpha.toFixed(3)}</span>
                    <span>θ {controller.seed.thetaDeg.toFixed(1)}°</span>
                    <span>λ {controller.seed.lambdaCm.toFixed(2)} cm</span>
                </div>
            )}

            <Space wrap className="foot-drafting-nearby-actions">
                <Button
                    type="primary"
                    disabled={!inputsAvailable || running || !estimate.geometry}
                    onClick={() => {
                        setExpansionFeedback(undefined);
                        controller.start({ ...manualSeed }, { ...config });
                    }}
                >
                    {startLabel}
                </Button>
                <Button danger disabled={!running} onClick={controller.cancel}>
                    Stop Nearby Search
                </Button>
                <Button disabled={controller.status !== 'COMPLETED'} onClick={handleExpand}>
                    Expand Search Area
                </Button>
                <Button
                    disabled={running || !result}
                    onClick={() => {
                        setExpansionFeedback(undefined);
                        controller.clear();
                    }}
                >
                    Clear Search
                </Button>
            </Space>

            <div className="foot-drafting-nearby-status">
                <span>
                    Status <Tag color={running ? 'processing' : undefined}>{controller.status}</Tag>
                </span>
                <span>
                    Estimated candidates{' '}
                    <strong>{estimate.geometry?.toLocaleString() ?? 'invalid config'}</strong>
                </span>
                {result && (
                    <>
                        <span>
                            Evaluated {result.evaluatedCandidateCount.toLocaleString()} /{' '}
                            {result.totalCandidateCount.toLocaleString()}
                        </span>
                        <span>Valid found {result.validCandidateCount.toLocaleString()}</span>
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

            {estimate.errors.map((error) => (
                <Alert
                    key={error.code}
                    type="error"
                    showIcon
                    message={error.code}
                    description={error.message}
                />
            ))}
            {controller.errors.map((error) => (
                <Alert
                    key={error.code}
                    type="error"
                    showIcon
                    message={error.code}
                    description={error.message}
                />
            ))}

            {expansionFeedback && (
                <Alert
                    data-testid="nearby-search-expansion-feedback"
                    type={expansionFeedback.adjusted ? 'warning' : 'success'}
                    showIcon
                    message={
                        expansionFeedback.adjusted
                            ? 'Expanded search area · resolution adjusted automatically'
                            : 'Expanded search area · search resolution unchanged'
                    }
                    description={
                        expansionFeedback.adjusted ? (
                            <div>
                                <div>
                                    Expanded search area exceeds the evaluation limit, so only the
                                    step sizes were increased; the expanded radii and frozen seed
                                    were preserved.
                                </div>
                                <div>
                                    Alpha step: {expansionFeedback.requestedConfig.alphaStep} →{' '}
                                    {expansionFeedback.config.alphaStep}
                                </div>
                                <div>
                                    Theta step: {expansionFeedback.requestedConfig.thetaStepDeg}° →{' '}
                                    {expansionFeedback.config.thetaStepDeg}°
                                </div>
                                <div>
                                    Lambda step: {expansionFeedback.requestedConfig.lambdaStepCm} →{' '}
                                    {expansionFeedback.config.lambdaStepCm} cm
                                </div>
                                <div>
                                    Estimated candidates:{' '}
                                    {expansionFeedback.estimatedCount.toLocaleString()} · Maximum:{' '}
                                    {MAX_NEARBY_SEARCH_EVALUATIONS.toLocaleString()}
                                </div>
                            </div>
                        ) : (
                            `Search resolution unchanged. Estimated candidates: ${expansionFeedback.estimatedCount.toLocaleString()}.`
                        )
                    }
                />
            )}

            <Collapse
                ghost
                className="foot-drafting-nearby-config"
                items={[
                    {
                        key: 'advanced',
                        label: 'Advanced Nearby Search Config',
                        children: (
                            <>
                                <Form layout="vertical" requiredMark={false}>
                                    <div className="foot-drafting-nearby-config-grid">
                                        {CONFIG_FIELDS.map((field) => (
                                            <Form.Item key={field.key} label={field.label}>
                                                <InputNumber
                                                    min={0}
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
                                <Space wrap>
                                    <Button
                                        size="small"
                                        onClick={() => setConfig(cloneDefaultConfig())}
                                    >
                                        Reset Nearby Defaults
                                    </Button>
                                    <Text type="secondary">
                                        Safety limit:{' '}
                                        {MAX_NEARBY_SEARCH_EVALUATIONS.toLocaleString()} evaluations
                                    </Text>
                                </Space>
                            </>
                        ),
                    },
                ]}
            />

            <NearbyValidCandidateHistory
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
                disabled={!controller.selectedCandidate}
                onClick={() =>
                    controller.selectedCandidate && onApplyCandidate(controller.selectedCandidate)
                }
            >
                Apply Candidate to Manual Controls
            </Button>
        </Card>
    );
};

export default NearbyMultiSupportSearchControls;
