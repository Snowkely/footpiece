import { Alert, Card, Tag, Typography } from 'antd';
import type {
    GeometryValidationError,
    ToeRadialReferenceGeometry,
    ToeRadialReferencePoint,
} from '../types';

const { Text } = Typography;

interface ToeRadialReferencesDebugPanelProps {
    thetaDeg: number;
    geometry?: ToeRadialReferenceGeometry;
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

const ReferenceRows: React.FC<{
    id: string;
    reference?: ToeRadialReferencePoint;
}> = ({ id, reference }) => (
    <>
        <DebugRow label={id} value={formatPoint(reference?.point)} />
        <DebugRow
            label={`${id} angle / distance`}
            value={`${formatNumber(
                reference ? (reference.angleRad * 180) / Math.PI : undefined,
                3,
            )}° / ${formatNumber(reference?.distanceFromMs)} cm`}
        />
        <DebugRow
            label={`${id} toe identity`}
            value={
                reference
                    ? `segment ${reference.toeArcSegmentIndex} + t ${formatNumber(
                          reference.toeArcSegmentT,
                      )}`
                    : '—'
            }
        />
    </>
);

const ToeRadialReferencesDebugPanel: React.FC<ToeRadialReferencesDebugPanelProps> = ({
    thetaDeg,
    geometry,
    errors,
}) => {
    const actualAngles = geometry?.checks.equalAngles.actualRad.map(
        (angle) => (angle * 180) / Math.PI,
    );

    return (
        <Card
            size="small"
            title="Toe Radial Reference Geometry"
            className="foot-drafting-debug-card"
        >
            <DebugRow label="Ms" value={formatPoint(geometry?.origin)} />
            <DebugRow label="W" value={formatPoint(geometry?.W)} />
            <DebugRow
                label="Center direction"
                value={
                    geometry
                        ? `(${formatNumber(geometry.centerDirection.x)}, ${formatNumber(
                              geometry.centerDirection.y,
                          )})`
                        : '—'
                }
            />
            <DebugRow label="θ" value={`${formatNumber(geometry?.thetaDeg ?? thetaDeg, 3)}°`} />

            <ReferenceRows id="W1" reference={geometry?.W1} />
            <ReferenceRows id="W2" reference={geometry?.W2} />
            <ReferenceRows id="W3" reference={geometry?.W3} />
            <ReferenceRows id="W4" reference={geometry?.W4} />

            <DebugRow
                label="Adjacent actual angles"
                value={
                    actualAngles
                        ? actualAngles.map((angle) => `${formatNumber(angle, 4)}°`).join(' / ')
                        : '—'
                }
            />
            <DebugRow
                label="Expected"
                value={`${formatNumber(geometry?.thetaDeg ?? thetaDeg, 4)}°`}
            />
            <DebugRow
                label="Order"
                value={geometry?.order.join(' → ') ?? 'Q → W1 → W2 → W → W3 → W4 → P'}
            />

            <CheckRow
                label="Equal adjacent angles"
                pass={geometry?.checks.equalAngles.pass}
                details={`max error ${formatNumber(
                    geometry
                        ? (geometry.checks.equalAngles.maximumErrorRad * 180) / Math.PI
                        : undefined,
                    8,
                )}°`}
            />
            <CheckRow
                label="Q-W1-W2-W-W3-W4-P order"
                pass={geometry?.checks.orderValid.pass}
                details="Validated from continuous Q-W-P polyline identities"
            />
            <CheckRow
                label="All W1-W4 on toe arc"
                pass={geometry?.checks.allOnToeArc.pass}
                details={`max reconstruction error ${formatNumber(
                    geometry?.checks.allOnToeArc.maximumDistanceErrorCm,
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
};

export default ToeRadialReferencesDebugPanel;
