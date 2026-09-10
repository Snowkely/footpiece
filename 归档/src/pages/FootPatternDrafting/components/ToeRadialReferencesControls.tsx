import { Alert, Card, Form, InputNumber, Slider, Tag, Typography } from 'antd';
import {
    TOE_RADIAL_ANGLE_MAX_DEG,
    TOE_RADIAL_ANGLE_MIN_DEG,
    TOE_RADIAL_ANGLE_STEP_DEG,
} from '../geometry/toeRadialReferences';
import type { GeometryValidationError, ToeRadialReferenceGeometry } from '../types';

const { Text } = Typography;

interface ToeRadialReferencesControlsProps {
    thetaDeg: number;
    geometry?: ToeRadialReferenceGeometry;
    errors: GeometryValidationError[];
    onThetaChange: (thetaDeg: number) => void;
}

function signedAngle(multiplier: number, thetaDeg: number): string {
    const angle = multiplier * thetaDeg;
    return `${angle > 0 ? '+' : ''}${angle.toFixed(1)}°`;
}

const ToeRadialReferencesControls: React.FC<ToeRadialReferencesControlsProps> = ({
    thetaDeg,
    geometry,
    errors,
    onThetaChange,
}) => (
    <Card className="foot-drafting-panel" title="Toe Radial References">
        <Text type="secondary" className="foot-drafting-panel-intro">
            Step 6A intersects four equal-angle rays from aligned source Ms with the existing target
            Q-W-P toe section. These are reference landmarks only; no outer points or spline are
            generated.
        </Text>

        <Alert
            type={geometry ? 'success' : errors.length ? 'error' : 'info'}
            showIcon
            message={geometry ? 'TOE RADIAL REFERENCES READY' : 'NEW TOE RADIAL MODEL · STEP 6A'}
            description={
                geometry
                    ? `θ = ${geometry.thetaDeg.toFixed(
                          1,
                      )}° · Q-W1-W2-W-W3-W4-P PASS · WAITING FOR OUTER RADIAL SUPPORT POINTS`
                    : 'Complete valid automatic Ms/W and Step 3 target reference geometry.'
            }
        />

        <div className="foot-drafting-control-summary">
            <span>
                W1 <Tag>{signedAngle(-2, thetaDeg)}</Tag>
            </span>
            <span>
                W2 <Tag>{signedAngle(-1, thetaDeg)}</Tag>
            </span>
            <span>
                W <Tag>0.0°</Tag>
            </span>
            <span>
                W3 <Tag>{signedAngle(1, thetaDeg)}</Tag>
            </span>
            <span>
                W4 <Tag>{signedAngle(2, thetaDeg)}</Tag>
            </span>
        </div>

        <Form layout="vertical" requiredMark={false} className="foot-drafting-form">
            <Form.Item
                label="Equal angular step θ"
                extra="Exploration parameter only. Negative angles face Q; positive angles face P."
            >
                <div className="foot-drafting-slider-input">
                    <Slider
                        aria-label="Toe radial equal angular step theta"
                        min={TOE_RADIAL_ANGLE_MIN_DEG}
                        max={TOE_RADIAL_ANGLE_MAX_DEG}
                        step={TOE_RADIAL_ANGLE_STEP_DEG}
                        value={thetaDeg}
                        onChange={onThetaChange}
                    />
                    <InputNumber
                        aria-label="Toe radial equal angular step theta value"
                        min={TOE_RADIAL_ANGLE_MIN_DEG}
                        max={TOE_RADIAL_ANGLE_MAX_DEG}
                        step={TOE_RADIAL_ANGLE_STEP_DEG}
                        precision={1}
                        addonAfter="°"
                        value={thetaDeg}
                        onChange={(value) => value !== null && onThetaChange(value)}
                    />
                </div>
            </Form.Item>
        </Form>

        <Text type="secondary" className="foot-drafting-panel-intro">
            OLD OUTER CURVE MODEL: available / paused
        </Text>

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

export default ToeRadialReferencesControls;
