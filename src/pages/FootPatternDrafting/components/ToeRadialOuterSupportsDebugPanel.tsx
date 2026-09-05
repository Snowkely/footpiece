import { Alert, Card, Tag, Typography } from 'antd';
import type {
    GeometryValidationError,
    ToeRadialOuterSupportGeometry,
    ToeRadialOuterSupportPoint,
} from '../types';

const { Text } = Typography;

interface ToeRadialOuterSupportsDebugPanelProps {
    thetaDeg: number;
    outwardOffsetCm: number;
    geometry?: ToeRadialOuterSupportGeometry;
    errors: GeometryValidationError[];
}

function formatNumber(value?: number, digits = 6): string {
    return value === undefined || !Number.isFinite(value) ? '—' : value.toFixed(digits);
}

function formatPoint(point?: { x: number; y: number }): string {
    return point ? `(${formatNumber(point.x)}, ${formatNumber(point.y)}) cm` : '—';
}

const DebugRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="foot-drafting-value-row">
        <Text>{label}</Text>
        <Text className="foot-drafting-debug-value">{value}</Text>
    </div>
);

const CheckRow: React.FC<{ label: string; pass?: boolean; details: string }> = ({
    label,
    pass,
    details,
}) => (
    <div className="foot-drafting-check-row">
        <div>
            <Text>{label}</Text>
            <div className="foot-drafting-check-values">{details}</div>
        </div>
        <Tag color={pass === undefined ? 'default' : pass ? 'success' : 'error'}>
            {pass === undefined ? 'WAIT' : pass ? 'PASS' : 'FAIL'}
        </Tag>
    </div>
);

const SupportRows: React.FC<{
    id: string;
    support?: ToeRadialOuterSupportPoint;
}> = ({ id, support }) => (
    <>
        <DebugRow label={`${id} reference`} value={formatPoint(support?.referencePoint)} />
        <DebugRow label={`${id}' outer`} value={formatPoint(support?.outerPoint)} />
        <DebugRow
            label={`${id} direction`}
            value={
                support
                    ? `(${formatNumber(support.direction.x)}, ${formatNumber(support.direction.y)})`
                    : '—'
            }
        />
        <DebugRow
            label={`${id} radial distances`}
            value={`${formatNumber(support?.referenceDistanceFromMs)} → ${formatNumber(
                support?.outerDistanceFromMs,
            )} cm`}
        />
        <DebugRow
            label={`${id} outward delta`}
            value={`${formatNumber(support?.outwardDistance)} cm · radial error ${formatNumber(
                support?.radialDistanceErrorCm,
                9,
            )} cm`}
        />
    </>
);

const ToeRadialOuterSupportsDebugPanel: React.FC<ToeRadialOuterSupportsDebugPanelProps> = ({
    thetaDeg,
    outwardOffsetCm,
    geometry,
    errors,
}) => (
    <Card size="small" title="Toe Radial Outer Supports" className="foot-drafting-debug-card">
        <DebugRow label="Ms" value={formatPoint(geometry?.origin)} />
        <DebugRow label="θ" value={`${formatNumber(geometry?.thetaDeg ?? thetaDeg, 3)}°`} />
        <DebugRow
            label="λ"
            value={`${formatNumber(geometry?.outwardOffsetCm ?? outwardOffsetCm)} cm`}
        />

        <SupportRows id="W1" support={geometry?.W1Prime} />
        <SupportRows id="W2" support={geometry?.W2Prime} />
        <SupportRows id="W" support={geometry?.WPrime} />
        <SupportRows id="W3" support={geometry?.W3Prime} />
        <SupportRows id="W4" support={geometry?.W4Prime} />

        <CheckRow
            label="All radial collinearity"
            pass={geometry?.checks.allRadiallyCollinear.pass}
            details={`max error ${formatNumber(
                geometry?.checks.allRadiallyCollinear.maximumErrorCm,
                9,
            )} cm`}
        />
        <CheckRow
            label="All outward"
            pass={geometry?.checks.allOutward.pass}
            details={`projections ${
                geometry
                    ? geometry.checks.allOutward.projectionsCm
                          .map((value) => formatNumber(value, 6))
                          .join(' / ')
                    : '—'
            } cm`}
        />
        <CheckRow
            label="All offset distances = λ"
            pass={geometry?.checks.allOffsetsEqual.pass}
            details={`max error ${formatNumber(
                geometry?.checks.allOffsetsEqual.maximumErrorCm,
                9,
            )} cm`}
        />
        <CheckRow
            label="MsWi' = MsWi + λ"
            pass={geometry?.checks.allRadialDistanceIncrements.pass}
            details={`max error ${formatNumber(
                geometry?.checks.allRadialDistanceIncrements.maximumErrorCm,
                9,
            )} cm`}
        />
        <CheckRow
            label="All radial angles preserved"
            pass={geometry?.checks.allAnglesPreserved.pass}
            details={`max error ${formatNumber(
                geometry
                    ? (geometry.checks.allAnglesPreserved.maximumErrorRad * 180) / Math.PI
                    : undefined,
                9,
            )}°`}
        />
        <CheckRow
            label="Center W' matches Step 5"
            pass={geometry?.checks.centerWPrimeMatchesStep5.pass}
            details={`mismatch ${formatNumber(
                geometry?.checks.centerWPrimeMatchesStep5.mismatchCm,
                9,
            )} cm`}
        />

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

export default ToeRadialOuterSupportsDebugPanel;
