import { Alert, Card, Form, InputNumber, Slider, Typography } from 'antd';
import type { GeometryValidationError, TargetWPrimeGeometry } from '../types';

const { Text } = Typography;
const WPRIME_OFFSET_MAX_CM = 8;

interface TargetWPrimeControlsProps {
    outwardOffsetCm: number;
    geometry?: TargetWPrimeGeometry;
    errors: GeometryValidationError[];
    onOutwardOffsetChange: (outwardOffsetCm: number) => void;
}

function formatNumber(value?: number, digits = 3): string {
    return value === undefined || !Number.isFinite(value) ? '—' : value.toFixed(digits);
}

function formatPoint(point?: { x: number; y: number }): string {
    return point ? `(${formatNumber(point.x)}, ${formatNumber(point.y)}) cm` : '—';
}

const TargetWPrimeControls: React.FC<TargetWPrimeControlsProps> = ({
    outwardOffsetCm,
    geometry,
    errors,
    onOutwardOffsetChange,
}) => (
    <Card className="foot-drafting-panel" title="Target W' Construction">
        <Text type="secondary" className="foot-drafting-panel-intro">
            Step 5 extends the aligned M&apos;-W longitudinal ray from W. The offset is an
            independent exploration parameter, not a drafting constraint.
        </Text>

        <div className="foot-drafting-control-summary">
            <span>
                Toe direction: ({formatNumber(geometry?.toeOutwardDirection.x)},{' '}
                {formatNumber(geometry?.toeOutwardDirection.y)})
            </span>
            <span>W: {formatPoint(geometry?.W)}</span>
            <span>W&apos;: {formatPoint(geometry?.WPrime)}</span>
            <span>WW&apos;: {formatNumber(geometry?.distanceFromW)} cm</span>
        </div>

        <Form layout="vertical" requiredMark={false} className="foot-drafting-form">
            <Form.Item label="W' Outward Offset">
                <div className="foot-drafting-slider-input">
                    <Slider
                        aria-label="W prime outward offset"
                        min={0}
                        max={WPRIME_OFFSET_MAX_CM}
                        step={0.1}
                        value={outwardOffsetCm}
                        onChange={onOutwardOffsetChange}
                    />
                    <InputNumber
                        aria-label="W prime outward offset value"
                        min={0}
                        max={WPRIME_OFFSET_MAX_CM}
                        step={0.1}
                        precision={1}
                        addonAfter="cm"
                        value={outwardOffsetCm}
                        onChange={(value) => value !== null && onOutwardOffsetChange(value)}
                    />
                </div>
            </Form.Item>
        </Form>

        {errors.map((error) => (
            <Alert
                key={error.code}
                type="error"
                showIcon
                message={error.code}
                description={error.message}
            />
        ))}
    </Card>
);

export default TargetWPrimeControls;
