import { Alert, Card, Tag, Typography } from 'antd';
import type { GeometryValidationError, ToeRadialOuterSupportGeometry } from '../types';

const { Text } = Typography;

interface ToeRadialOuterSupportsControlsProps {
    thetaDeg: number;
    outwardOffsetCm: number;
    geometry?: ToeRadialOuterSupportGeometry;
    errors: GeometryValidationError[];
}

const ToeRadialOuterSupportsControls: React.FC<ToeRadialOuterSupportsControlsProps> = ({
    thetaDeg,
    outwardOffsetCm,
    geometry,
    errors,
}) => (
    <Card className="foot-drafting-panel" title="Toe Outer Radial Supports">
        <Text type="secondary" className="foot-drafting-panel-intro">
            Step 6B uses the existing Step 5 offset λ for every Step 6A radial reference. It does
            not add another offset control or generate an outer curve.
        </Text>

        <Alert
            type={geometry ? 'success' : errors.length ? 'error' : 'info'}
            showIcon
            message={geometry ? 'TOE OUTER SUPPORTS READY' : 'STEP 6B · WAITING FOR INPUTS'}
            description={
                geometry
                    ? "Reference: W1 W2 W W3 W4 · Outer: W1' W2' W' W3' W4' · WAITING FOR MULTI-SUPPORT OUTER CURVE"
                    : 'Complete valid Step 5 W′ and Step 6A toe radial references.'
            }
        />

        <div className="foot-drafting-control-summary">
            <span>
                θ <Tag>{(geometry?.thetaDeg ?? thetaDeg).toFixed(1)}°</Tag>
            </span>
            <span>
                Outward offset λ{' '}
                <Tag>{(geometry?.outwardOffsetCm ?? outwardOffsetCm).toFixed(2)} cm</Tag>
            </span>
            <span>Reference: W1 · W2 · W · W3 · W4</span>
            <span>Outer: W1&apos; · W2&apos; · W&apos; · W3&apos; · W4&apos;</span>
        </div>

        <Text type="secondary" className="foot-drafting-panel-intro">
            All support points use the same radial outward offset.
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

export default ToeRadialOuterSupportsControls;
