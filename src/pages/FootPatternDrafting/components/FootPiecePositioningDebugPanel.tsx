import { Card, Tag, Typography } from 'antd';
import type { FootPiecePositioningGeometry } from '../types';

const { Text } = Typography;

interface FootPiecePositioningDebugPanelProps {
    footPiece?: FootPiecePositioningGeometry;
}

function formatNumber(value?: number, digits = 5): string {
    return value === undefined || !Number.isFinite(value) ? '—' : value.toFixed(digits);
}

function formatPoint(point?: { x: number; y: number }, unit = 'cm'): string {
    return point ? `(${formatNumber(point.x)}, ${formatNumber(point.y)}) ${unit}` : '—';
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

const FootPiecePositioningDebugPanel: React.FC<FootPiecePositioningDebugPanelProps> = ({
    footPiece,
}) => {
    const positioning = footPiece?.positioning;
    const checks = positioning?.checks;

    return (
        <Card size="small" title="F / Foot Piece Positioning" className="foot-drafting-debug-card">
            <DebugRow label="F selection state" value={positioning?.selectionState ?? 'none'} />
            <DebugRow
                label="F source segment"
                value={positioning?.selection?.segmentIndex ?? '—'}
            />
            <DebugRow
                label="F source segment t"
                value={formatNumber(positioning?.selection?.segmentT)}
            />
            <DebugRow
                label="F source coordinate"
                value={formatPoint(positioning?.sourceF, 'DXF units')}
            />
            <DebugRow
                label="F provisional coordinate"
                value={formatPoint(positioning?.provisionalF)}
            />
            <DebugRow
                label="F final aligned coordinate"
                value={formatPoint(positioning?.alignedF)}
            />
            <DebugRow
                label="Final translation vector"
                value={
                    positioning?.translationVectorCm
                        ? `(${formatNumber(positioning.translationVectorCm.x)}, ${formatNumber(
                              positioning.translationVectorCm.y,
                          )}) cm`
                        : '—'
                }
            />
            <DebugRow
                label="RS line error (R / S)"
                value={
                    checks
                        ? `${formatNumber(
                              checks.rsInlineWithMPrimeG.rLineDistanceCm,
                          )} / ${formatNumber(checks.rsInlineWithMPrimeG.sLineDistanceCm)} cm`
                        : '—'
                }
            />
            <DebugRow
                label="M'F perpendicular error"
                value={formatNumber(checks?.mPrimeFPerpendicular.absoluteNormalizedDot, 8)}
            />
            <DebugRow
                label="F centre-line error"
                value={`${formatNumber(checks?.fOnCentreLine.lineErrorCm)} cm`}
            />
            <DebugRow label="Alignment mode" value={positioning?.alignmentMode ?? '—'} />
            <DebugRow
                label="Foot Piece positioning"
                value={
                    <Tag color={positioning?.status === 'VALID' ? 'success' : 'warning'}>
                        {positioning?.status ?? 'PROVISIONAL'}
                    </Tag>
                }
            />

            <CheckRow
                label="F selected"
                details="F identity is restricted to a Q-P source segment and t."
                pass={checks?.fSelected.pass}
            />
            <CheckRow
                label="RS inline with M'G"
                details={
                    checks
                        ? `R ${formatNumber(
                              checks.rsInlineWithMPrimeG.rLineDistanceCm,
                          )} cm · S ${formatNumber(
                              checks.rsInlineWithMPrimeG.sLineDistanceCm,
                          )} cm · tol ±${formatNumber(checks.rsInlineWithMPrimeG.toleranceCm)} cm`
                        : 'Waiting for foot-piece geometry.'
                }
                pass={checks?.rsInlineWithMPrimeG.pass}
            />
            <CheckRow
                label="M'F perpendicular to M'G"
                details={`absolute normalized dot ${formatNumber(
                    checks?.mPrimeFPerpendicular.absoluteNormalizedDot,
                    8,
                )} · tol ${formatNumber(checks?.mPrimeFPerpendicular.tolerance, 8)}`}
                pass={checks?.mPrimeFPerpendicular.pass}
            />
            <CheckRow
                label="F on M' perpendicular centre line"
                details={`line error ${formatNumber(
                    checks?.fOnCentreLine.lineErrorCm,
                )} cm · tol ±${formatNumber(checks?.fOnCentreLine.toleranceCm)} cm`}
                pass={checks?.fOnCentreLine.pass}
            />
            <CheckRow
                label="F source identity preserved"
                details={`aligned identity distance ${formatNumber(
                    checks?.sourceIdentityPreserved.alignedDistanceCm,
                )} cm · tol ±${formatNumber(checks?.sourceIdentityPreserved.toleranceCm)} cm`}
                pass={checks?.sourceIdentityPreserved.pass}
            />
        </Card>
    );
};

export default FootPiecePositioningDebugPanel;
