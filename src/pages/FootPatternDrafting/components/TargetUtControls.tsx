import { Alert, Card, Form, InputNumber, Slider, Typography } from 'antd';
import type { GeometryValidationError, TargetUtGeometry } from '../types';
import { formatUpQtRatio } from './targetUtDisplay';

const { Text } = Typography;

interface TargetUtControlsProps {
    a?: number;
    distribution: number;
    geometry?: TargetUtGeometry;
    errors: GeometryValidationError[];
    onDistributionChange: (distribution: number) => void;
}

function formatCentimeters(value?: number): string {
    return value === undefined || !Number.isFinite(value) ? '—' : `${value.toFixed(3)} cm`;
}

const TargetUtControls: React.FC<TargetUtControlsProps> = ({
    a,
    distribution,
    geometry,
    errors,
    onDistributionChange,
}) => (
    <Card className="foot-drafting-panel" title="Target U/T Construction">
        <Text type="secondary" className="foot-drafting-panel-intro">
            Step 4 extends the aligned P-Q level to total length a. α = UP / (UP + QT), with UP = α
            × (a − PQ) and QT = (1 − α) × (a − PQ).
        </Text>

        <div className="foot-drafting-control-summary">
            <span>a: {formatCentimeters(a)}</span>
            <span>PQ: {formatCentimeters(geometry?.pqLengthCm)}</span>
            <span>Extra: {formatCentimeters(geometry?.extraLengthCm)}</span>
            <span>UP: {formatCentimeters(geometry?.upLengthCm)}</span>
            <span>QT: {formatCentimeters(geometry?.qtLengthCm)}</span>
            <span>UP : QT = {formatUpQtRatio(distribution)}</span>
        </div>

        <Form layout="vertical" requiredMark={false} className="foot-drafting-form">
            <Form.Item label="UP/QT Distribution α" extra="α = UP / (UP + QT)">
                <div className="foot-drafting-slider-input">
                    <Slider
                        aria-label="UP / QT distribution alpha"
                        min={0}
                        max={1}
                        step={0.001}
                        value={distribution}
                        onChange={onDistributionChange}
                    />
                    <InputNumber
                        aria-label="UP / QT distribution alpha value"
                        min={0}
                        max={1}
                        step={0.001}
                        precision={3}
                        value={distribution}
                        onChange={(value) => value !== null && onDistributionChange(value)}
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

export default TargetUtControls;
