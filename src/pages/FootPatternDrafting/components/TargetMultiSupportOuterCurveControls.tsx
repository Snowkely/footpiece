import { Alert, Card, Tag, Typography } from 'antd';
import type { GeometryValidationError, TargetMultiSupportOuterCurveCandidate } from '../types';

const { Text } = Typography;

interface TargetMultiSupportOuterCurveControlsProps {
    alpha: number;
    thetaDeg: number;
    outwardOffsetCm: number;
    candidate?: TargetMultiSupportOuterCurveCandidate;
    errors: GeometryValidationError[];
}

const TargetMultiSupportOuterCurveControls: React.FC<TargetMultiSupportOuterCurveControlsProps> = ({
    alpha,
    thetaDeg,
    outwardOffsetCm,
    candidate,
    errors,
}) => (
    <Card className="foot-drafting-panel" title="Multi-Support Outer Curve">
        <Text type="secondary" className="foot-drafting-panel-intro">
            Step 6C evaluates one nine-anchor centripetal Catmull-Rom curve from the current manual
            α, θ, and λ. It does not modify or search those parameters.
        </Text>

        <Alert
            type={
                candidate
                    ? candidate.valid
                        ? 'success'
                        : 'warning'
                    : errors.length
                    ? 'error'
                    : 'info'
            }
            showIcon
            message={candidate ? 'MULTI-SUPPORT OUTER CURVE READY' : 'STEP 6C · WAITING FOR INPUTS'}
            description={
                candidate
                    ? `CURRENT MULTI-SUPPORT CANDIDATE: ${
                          candidate.valid ? 'VALID · READY FOR MANUAL SHAPE REVIEW' : 'INVALID'
                      }`
                    : 'Complete valid Step 4 U/T and Step 6B toe outer supports.'
            }
        />

        <div className="foot-drafting-control-summary">
            <span>
                α <Tag>{(candidate?.alpha ?? alpha).toFixed(3)}</Tag>
            </span>
            <span>
                θ <Tag>{(candidate?.thetaDeg ?? thetaDeg).toFixed(1)}°</Tag>
            </span>
            <span>
                λ <Tag>{(candidate?.outwardOffsetCm ?? outwardOffsetCm).toFixed(2)} cm</Tag>
            </span>
            <span>Model: 9-anchor centripetal Catmull-Rom</span>
            <span>
                Order: L · U · W4&apos; · W3&apos; · W&apos; · W2&apos; · W1&apos; · T · G&apos;
            </span>
        </div>

        {candidate?.rejectionReasons.map((reason) => (
            <Tag key={reason} color="warning">
                {reason.replace('OUTER_CURVE_', '')}
            </Tag>
        ))}

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

export default TargetMultiSupportOuterCurveControls;
