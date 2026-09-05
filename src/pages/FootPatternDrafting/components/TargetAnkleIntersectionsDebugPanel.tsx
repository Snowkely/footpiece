import { Card, Typography } from 'antd';
import type { TargetAnkleIntersectionGeometry } from '../types';

const { Text } = Typography;

interface TargetAnkleIntersectionsDebugPanelProps {
    geometry?: TargetAnkleIntersectionGeometry;
}

function formatNumber(value?: number, digits = 5): string {
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

const TargetAnkleIntersectionsDebugPanel: React.FC<TargetAnkleIntersectionsDebugPanelProps> = ({
    geometry,
}) => (
    <Card size="small" title="Target Ankle Intersections" className="foot-drafting-debug-card">
        <DebugRow
            label="Target direction"
            value={
                geometry
                    ? `(${formatNumber(geometry.targetDirection.x)}, ${formatNumber(
                          geometry.targetDirection.y,
                      )})`
                    : '—'
            }
        />
        <DebugRow
            label="Original R projection"
            value={`${formatNumber(geometry?.originalRProjection)} cm`}
        />
        <DebugRow
            label="Original S projection"
            value={`${formatNumber(geometry?.originalSProjection)} cm`}
        />
        <DebugRow
            label="Positive ray intersections"
            value={geometry?.positiveRayIntersectionCount ?? '—'}
        />
        <DebugRow
            label="Negative ray intersections"
            value={geometry?.negativeRayIntersectionCount ?? '—'}
        />
        <DebugRow label="R*" value={formatPoint(geometry?.RStar)} />
        <DebugRow
            label="R* outline identity"
            value={
                geometry
                    ? `segment ${geometry.rStarOutlineSegmentIndex} · t ${formatNumber(
                          geometry.rStarOutlineSegmentT,
                      )}`
                    : '—'
            }
        />
        <DebugRow label="S*" value={formatPoint(geometry?.SStar)} />
        <DebugRow
            label="S* outline identity"
            value={
                geometry
                    ? `segment ${geometry.sStarOutlineSegmentIndex} · t ${formatNumber(
                          geometry.sStarOutlineSegmentT,
                      )}`
                    : '—'
            }
        />
        <DebugRow label="M'R*" value={`${formatNumber(geometry?.mPrimeToRStar)} cm`} />
        <DebugRow label="M'S*" value={`${formatNumber(geometry?.mPrimeToSStar)} cm`} />
        <DebugRow label="R*S* span" value={`${formatNumber(geometry?.ankleSpan)} cm`} />
        <DebugRow
            label="Asymmetry (diagnostic only)"
            value={`${formatNumber(geometry?.asymmetry)} cm`}
        />
        <DebugRow
            label="Original R → R*"
            value={`${formatNumber(geometry?.rToRStarDistance)} cm`}
        />
        <DebugRow
            label="Original S → S*"
            value={`${formatNumber(geometry?.sToSStarDistance)} cm`}
        />
        <DebugRow
            label="R*/S* line error"
            value={`${formatNumber(geometry?.rStarLineDistanceCm, 8)} / ${formatNumber(
                geometry?.sStarLineDistanceCm,
                8,
            )} cm`}
        />
        <DebugRow
            label="Span decomposition error"
            value={`${formatNumber(geometry?.spanDecompositionErrorCm, 8)} cm`}
        />
    </Card>
);

export default TargetAnkleIntersectionsDebugPanel;
