import { Card, Form, InputNumber, Slider, Typography } from 'antd';
import type { LufCurveGeometry, LufCurveParameters } from '../types';

const { Text } = Typography;
const F_PRIME_OFFSET_MAX_CM = 10;

interface LufCurveControlsProps {
    value: LufCurveParameters;
    geometry?: LufCurveGeometry;
    onChange: (value: LufCurveParameters) => void;
}

function formatCentimeters(value?: number): string {
    return value === undefined || !Number.isFinite(value) ? '—' : `${value.toFixed(3)} cm`;
}

const LufCurveControls: React.FC<LufCurveControlsProps> = ({ value, geometry, onChange }) => {
    const updateValue = (change: Partial<LufCurveParameters>) => {
        onChange({ ...value, ...change });
    };

    return (
        <Card
            className="foot-drafting-panel foot-drafting-curve-controls"
            title="LUF'TG' candidate controls"
        >
            <Text type="secondary" className="foot-drafting-panel-intro">
                Interactive prototype only. Adjust alpha and F&apos; offset to inspect one
                continuous candidate spline; no automatic search is applied.
            </Text>

            <Form layout="vertical" requiredMark={false} className="foot-drafting-form">
                <Form.Item label="UP/QT distribution (alpha)">
                    <div className="foot-drafting-slider-input">
                        <Slider
                            aria-label="UP/QT distribution (alpha)"
                            min={0}
                            max={1}
                            step={0.01}
                            value={value.upQtDistribution}
                            onChange={(nextValue) => updateValue({ upQtDistribution: nextValue })}
                        />
                        <InputNumber
                            aria-label="UP/QT distribution alpha value"
                            min={0}
                            max={1}
                            step={0.01}
                            precision={2}
                            value={value.upQtDistribution}
                            onChange={(nextValue) =>
                                nextValue !== null && updateValue({ upQtDistribution: nextValue })
                            }
                        />
                    </div>
                </Form.Item>

                <div className="foot-drafting-control-summary">
                    <span>alpha: {value.upQtDistribution.toFixed(2)}</span>
                    <span>UP: {formatCentimeters(geometry?.upLengthCm)}</span>
                    <span>QT: {formatCentimeters(geometry?.qtLengthCm)}</span>
                </div>

                <Form.Item label="F' outward offset">
                    <div className="foot-drafting-slider-input">
                        <Slider
                            aria-label="F prime outward offset"
                            min={0}
                            max={F_PRIME_OFFSET_MAX_CM}
                            step={0.1}
                            value={value.fPrimeOffsetCm}
                            onChange={(nextValue) => updateValue({ fPrimeOffsetCm: nextValue })}
                        />
                        <InputNumber
                            aria-label="F prime outward offset value"
                            min={0}
                            max={F_PRIME_OFFSET_MAX_CM}
                            step={0.1}
                            precision={2}
                            addonAfter="cm"
                            value={value.fPrimeOffsetCm}
                            onChange={(nextValue) =>
                                nextValue !== null && updateValue({ fPrimeOffsetCm: nextValue })
                            }
                        />
                    </div>
                </Form.Item>
            </Form>
        </Card>
    );
};

export default LufCurveControls;
