import { Alert, Card, Tag, Typography } from 'antd';
import type { GeometryValidationError, TargetWPrimeGeometry } from '../types';

const { Text } = Typography;

interface TargetWPrimeDebugPanelProps {
    geometry?: TargetWPrimeGeometry;
    errors: GeometryValidationError[];
    outwardOffsetCm: number;
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

const TargetWPrimeDebugPanel: React.FC<TargetWPrimeDebugPanelProps> = ({
    geometry,
    errors,
    outwardOffsetCm,
}) => (
    <Card size="small" title="Target W'" className="foot-drafting-debug-card">
        <DebugRow label="M'" value={formatPoint(geometry?.MPrime)} />
        <DebugRow label="W" value={formatPoint(geometry?.W)} />
        <DebugRow
            label="Toe outward direction"
            value={
                geometry
                    ? `(${formatNumber(geometry.toeOutwardDirection.x)}, ${formatNumber(
                          geometry.toeOutwardDirection.y,
                      )})`
                    : '—'
            }
        />
        <DebugRow
            label="Front O→M' direction"
            value={
                geometry
                    ? `(${formatNumber(geometry.frontFootDirection.x)}, ${formatNumber(
                          geometry.frontFootDirection.y,
                      )})`
                    : '—'
            }
        />
        <DebugRow label="Direction dot" value={formatNumber(geometry?.directionDot, 9)} />
        <DebugRow
            label="Outward offset"
            value={`${formatNumber(geometry?.outwardOffsetCm ?? outwardOffsetCm)} cm`}
        />
        <DebugRow label="W'" value={formatPoint(geometry?.WPrime)} />
        <DebugRow label="M'W" value={`${formatNumber(geometry?.distanceFromMPrimeToW)} cm`} />
        <DebugRow label="WW'" value={`${formatNumber(geometry?.distanceFromW)} cm`} />
        <DebugRow label="M'W'" value={`${formatNumber(geometry?.distanceFromMPrime)} cm`} />

        <CheckRow
            label="M'-W-W' collinear"
            pass={geometry?.checks.collinearity.pass}
            details={`max line error ${formatNumber(
                geometry?.checks.collinearity.maximumLineDistanceCm,
            )} cm`}
        />
        <CheckRow
            label="Direction alignment"
            pass={geometry?.checks.directionAlignment.pass}
            details={`dot ${formatNumber(geometry?.checks.directionAlignment.dot, 9)} · must be > ${
                geometry?.checks.directionAlignment.minimumDot ?? '—'
            }`}
        />
        <CheckRow
            label="WW' = offset"
            pass={geometry?.checks.offsetDistance.pass}
            details={`error ${formatNumber(geometry?.checks.offsetDistance.errorCm)} cm`}
        />
        <CheckRow
            label="W outward side"
            pass={geometry?.checks.directionOrder.pass}
            details={`W→W' projection ${formatNumber(
                geometry?.checks.directionOrder.wToWPrimeProjectionCm,
            )} cm`}
        />
        <CheckRow
            label="W unchanged"
            pass={geometry?.checks.wUnchanged.pass}
            details={`coordinate delta ${formatNumber(geometry?.checks.wUnchanged.distanceCm)} cm`}
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

export default TargetWPrimeDebugPanel;
