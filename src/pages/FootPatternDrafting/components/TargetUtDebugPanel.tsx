import { Alert, Card, Tag, Typography } from 'antd';
import type { GeometryValidationError, TargetUtGeometry } from '../types';
import { formatUpQtRatio } from './targetUtDisplay';

const { Text } = Typography;

interface TargetUtDebugPanelProps {
    a?: number;
    distribution: number;
    geometry?: TargetUtGeometry;
    errors: GeometryValidationError[];
}

function formatNumber(value?: number, digits = 6): string {
    return value === undefined || !Number.isFinite(value) ? '—' : value.toFixed(digits);
}

const DebugRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="foot-drafting-value-row">
        <Text>{label}</Text>
        <Text className="foot-drafting-debug-value">{value}</Text>
    </div>
);

const CheckRow: React.FC<{
    label: string;
    pass?: boolean;
    details: string;
}> = ({ label, pass, details }) => (
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

const TargetUtDebugPanel: React.FC<TargetUtDebugPanelProps> = ({
    a,
    distribution,
    geometry,
    errors,
}) => (
    <Card size="small" title="Target U/T" className="foot-drafting-debug-card">
        <DebugRow label="a" value={`${formatNumber(geometry?.checks.utLength.expected ?? a)} cm`} />
        <DebugRow label="PQ" value={`${formatNumber(geometry?.pqLengthCm)} cm`} />
        <DebugRow label="Extra" value={`${formatNumber(geometry?.extraLengthCm)} cm`} />
        <DebugRow label="α" value={formatNumber(geometry?.distribution ?? distribution, 3)} />
        <DebugRow label="α definition" value="UP / (UP + QT)" />
        <DebugRow label="UP : QT" value={formatUpQtRatio(geometry?.distribution ?? distribution)} />
        <DebugRow label="UP" value={`${formatNumber(geometry?.upLengthCm)} cm`} />
        <DebugRow label="QT" value={`${formatNumber(geometry?.qtLengthCm)} cm`} />
        <DebugRow label="UT" value={`${formatNumber(geometry?.targetUtLengthCm)} cm`} />
        <DebugRow
            label="UT − a error"
            value={`${formatNumber(geometry?.checks.utLength.errorCm)} cm`}
        />
        <DebugRow
            label="PQ direction"
            value={
                geometry
                    ? `(${formatNumber(geometry.pqDirection.x)}, ${formatNumber(
                          geometry.pqDirection.y,
                      )})`
                    : '—'
            }
        />

        <CheckRow
            label="U-P-Q-T collinear"
            pass={geometry?.checks.collinearity.pass}
            details={`max line error ${formatNumber(
                geometry?.checks.collinearity.maximumLineDistanceCm,
            )} cm`}
        />
        <CheckRow
            label="P/Q direction order"
            pass={geometry?.checks.directionOrder.pass}
            details="P remains between U/Q and Q remains between P/T"
        />
        <CheckRow
            label="UT = a"
            pass={geometry?.checks.utLength.pass}
            details={`error ${formatNumber(geometry?.checks.utLength.errorCm)} cm`}
        />
        <CheckRow
            label="UP + PQ + QT = a"
            pass={geometry?.checks.decomposition.pass}
            details={`error ${formatNumber(geometry?.checks.decomposition.errorCm)} cm`}
        />
        <CheckRow
            label="P unchanged"
            pass={geometry?.checks.pUnchanged.pass}
            details={`coordinate delta ${formatNumber(geometry?.checks.pUnchanged.distanceCm)} cm`}
        />
        <CheckRow
            label="Q unchanged"
            pass={geometry?.checks.qUnchanged.pass}
            details={`coordinate delta ${formatNumber(geometry?.checks.qUnchanged.distanceCm)} cm`}
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

export default TargetUtDebugPanel;
