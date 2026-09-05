import { Card, Tag, Typography } from 'antd';
import type { AlignedFootPieceGeometry, LufCurveGeometry, LufCurveParameters } from '../types';

const { Text } = Typography;

interface LufCurveDebugPanelProps {
    parameters: LufCurveParameters;
    a?: number;
    footPiece?: AlignedFootPieceGeometry;
    curve?: LufCurveGeometry;
}

function formatNumber(value?: number, digits = 3): string {
    return value === undefined || !Number.isFinite(value) ? '—' : value.toFixed(digits);
}

function formatCentimeters(value?: number): string {
    return value === undefined || !Number.isFinite(value) ? '—' : `${value.toFixed(3)} cm`;
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

const CheckRow: React.FC<{
    label: string;
    details: React.ReactNode;
    pass?: boolean;
}> = ({ label, details, pass }) => (
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

const LufCurveDebugPanel: React.FC<LufCurveDebugPanelProps> = ({
    parameters,
    a,
    footPiece,
    curve,
}) => {
    const utCheck = curve?.checks.utLength;
    const directionCheck = curve?.checks.fPrimeDirection;
    const lengthCheck = curve?.checks.curveLength;
    const outsideCheck = curve?.checks.outsideReference;
    const intersectionCheck = curve?.checks.noIntersection;

    return (
        <Card size="small" title="LUF'TG' Curve" className="foot-drafting-debug-card">
            <DebugRow label="F" value={formatPoint(curve?.F)} />
            <DebugRow label="F'" value={formatPoint(curve?.FPrime)} />
            <DebugRow label="FF' distance" value={formatCentimeters(curve?.ffPrimeDistanceCm)} />
            <DebugRow label="P" value={formatPoint(footPiece?.alignedLandmarks.P)} />
            <DebugRow label="Q" value={formatPoint(footPiece?.alignedLandmarks.Q)} />
            <DebugRow label="PQ length" value={formatCentimeters(curve?.pqLengthCm)} />
            <DebugRow label="a" value={formatCentimeters(a)} />
            <DebugRow label="extra = a - PQ" value={formatCentimeters(curve?.extraLengthCm)} />
            <DebugRow
                label="α = UP / (UP + QT)"
                value={formatNumber(parameters.upQtDistribution, 2)}
            />
            <DebugRow label="UP" value={formatCentimeters(curve?.upLengthCm)} />
            <DebugRow label="QT" value={formatCentimeters(curve?.qtLengthCm)} />
            <DebugRow label="UT actual" value={formatCentimeters(utCheck?.actual)} />
            <DebugRow label="UT expected" value={formatCentimeters(a)} />
            <DebugRow label="Candidate point count" value={curve?.sampledCurve.length ?? '—'} />
            <DebugRow
                label="Reference RQPS length"
                value={formatCentimeters(curve?.referenceLengthCm ?? footPiece?.rqpsArcLengthCm)}
            />
            <DebugRow
                label="Candidate LUF'TG' length"
                value={formatCentimeters(curve?.curveLengthCm)}
            />
            <DebugRow
                label="Target length range"
                value={
                    curve
                        ? `${formatCentimeters(curve.targetLengthMinCm)} – ${formatCentimeters(
                              curve.targetLengthMaxCm,
                          )}`
                        : '—'
                }
            />
            <DebugRow
                label="Outside points"
                value={
                    outsideCheck
                        ? `${outsideCheck.outsidePointCount} / ${outsideCheck.totalPointCount}`
                        : '—'
                }
            />
            <DebugRow
                label="Inside / boundary points"
                value={
                    outsideCheck
                        ? `${outsideCheck.insidePointCount} / ${outsideCheck.boundaryPointCount}`
                        : '—'
                }
            />
            <DebugRow
                label="Intersection count"
                value={intersectionCheck?.intersectionCount ?? '—'}
            />

            <CheckRow
                label="UT = a"
                details={`actual ${formatCentimeters(
                    utCheck?.actual,
                )} · expected ${formatCentimeters(utCheck?.expected)} · tol ±${formatCentimeters(
                    utCheck?.tolerance,
                )}`}
                pass={utCheck?.pass}
            />
            <CheckRow
                label="F' follows the outward centre line"
                details={`distance delta ${formatCentimeters(
                    directionCheck?.outwardDistanceDeltaCm,
                )} · expected ${formatCentimeters(
                    directionCheck?.expectedOffsetCm,
                )} · collinearity error ${formatCentimeters(directionCheck?.collinearityErrorCm)}`}
                pass={directionCheck?.pass}
            />
            <CheckRow
                label="Candidate length in target range"
                details={`actual ${formatCentimeters(
                    lengthCheck?.actual,
                )} · target ${formatCentimeters(lengthCheck?.minimum)} – ${formatCentimeters(
                    lengthCheck?.maximum,
                )}`}
                pass={lengthCheck?.pass}
            />
            <CheckRow
                label="All candidate samples outside RQPS polygon"
                details={
                    outsideCheck
                        ? `${outsideCheck.outsidePointCount} outside · ${outsideCheck.insidePointCount} inside · ${outsideCheck.boundaryPointCount} boundary`
                        : 'Waiting for candidate geometry.'
                }
                pass={outsideCheck?.pass}
            />
            <CheckRow
                label="No candidate / alignedRQPS intersection"
                details={
                    intersectionCheck
                        ? `${intersectionCheck.intersectionCount} segment-pair intersections`
                        : 'Waiting for candidate geometry.'
                }
                pass={intersectionCheck?.pass}
            />
        </Card>
    );
};

export default LufCurveDebugPanel;
