import { Card, Tag, Typography } from 'antd';
import type { AlignedFootPieceGeometry } from '../types';

const { Text } = Typography;

interface FootPiecePositioningDebugPanelProps {
    footPiece?: AlignedFootPieceGeometry;
}

function formatNumber(value?: number, digits = 5): string {
    return value === undefined || !Number.isFinite(value) ? '—' : value.toFixed(digits);
}

function formatPoint(point?: { x: number; y: number }, unit = 'cm'): string {
    return point ? `(${formatNumber(point.x)}, ${formatNumber(point.y)}) ${unit}` : '—';
}

function formatVector(vector?: { x: number; y: number }): string {
    return vector ? `(${formatNumber(vector.x)}, ${formatNumber(vector.y)})` : '—';
}

function degrees(radians?: number): string {
    return radians === undefined || !Number.isFinite(radians)
        ? '—'
        : `${((radians * 180) / Math.PI).toFixed(4)}°`;
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
    const automatic = footPiece?.automaticPositioning;
    const source = automatic?.source;
    const HStar = source?.sourceMidHeel;
    const W = source?.sourceSecondToe;
    const checks = automatic?.checks;
    const tangentFootAngle =
        HStar &&
        Math.acos(
            Math.max(
                -1,
                Math.min(
                    1,
                    HStar.tangent.x * HStar.footDirection.x +
                        HStar.tangent.y * HStar.footDirection.y,
                ),
            ),
        );

    return (
        <Card size="small" title="Automatic Foot Axis" className="foot-drafting-debug-card">
            <DebugRow
                label="Alignment mode"
                value={footPiece?.alignmentAssumption ?? 'automatic-midheel-secondtoe-axis'}
            />
            <DebugRow
                label="Foot Piece positioning"
                value={
                    <Tag color={automatic ? 'success' : 'default'}>
                        {automatic?.status ?? 'WAITING'}
                    </Tag>
                }
            />
            <DebugRow label="Mid Heel source" value={automatic ? 'AUTO' : '—'} />
            <DebugRow label="Second Toe source" value={automatic ? 'AUTO' : '—'} />

            <DebugRow label="H* source" value={formatPoint(HStar?.point, 'DXF units')} />
            <DebugRow
                label="H* heel-arc identity"
                value={
                    HStar
                        ? `segment ${HStar.heelArcSegmentIndex} · t ${formatNumber(
                              HStar.heelArcSegmentT,
                          )}`
                        : '—'
                }
            />
            <DebugRow
                label="H* longitudinal projection"
                value={`${formatNumber(HStar?.longitudinalProjection)} DXF units`}
            />
            <DebugRow label="H* tangent" value={formatVector(HStar?.tangent)} />
            <DebugRow label="Foot direction" value={formatVector(HStar?.footDirection)} />
            <DebugRow label="Toe normal" value={formatVector(HStar?.normalTowardToe)} />
            <DebugRow label="Tangent / footDirection angle" value={degrees(tangentFootAngle)} />
            <DebugRow
                label="Tangent · footDirection"
                value={formatNumber(HStar?.orthogonalityError, 8)}
            />
            <DebugRow label="H* confidence" value={HStar?.confidence ?? '—'} />

            <DebugRow label="W source" value={formatPoint(W?.point, 'DXF units')} />
            <DebugRow
                label="W Q-P identity"
                value={
                    W
                        ? `segment ${W.toeArcSegmentIndex} · t ${formatNumber(W.toeArcSegmentT)}`
                        : '—'
                }
            />
            <DebugRow label="W ray candidates" value={W?.intersectionCandidateCount ?? '—'} />
            <DebugRow
                label="H*W distance"
                value={`${formatNumber(source?.hwDistanceRaw)} DXF units`}
            />
            <DebugRow label="Source Ms" value={formatPoint(source?.sourceMs, 'DXF units')} />
            <DebugRow
                label="Source midpoint(R,S)"
                value={formatPoint(source?.rsMidpoint, 'DXF units')}
            />
            <DebugRow
                label="Ms vs RS midpoint"
                value={`${formatNumber(source?.sourceMsVsRsMidpointDistanceRaw)} DXF units`}
            />
            <DebugRow
                label="Source H*W / RS angle"
                value={degrees(source?.longitudinalTransverseAngleRadians)}
            />

            <DebugRow label="Scale to cm" value={formatNumber(footPiece?.scaleToCm, 8)} />
            <DebugRow label="Rotation" value={degrees(footPiece?.rotationRadians)} />
            <DebugRow
                label="Translation"
                value={
                    automatic
                        ? `(${formatNumber(automatic.translationVectorCm.x)}, ${formatNumber(
                              automatic.translationVectorCm.y,
                          )}) cm`
                        : '—'
                }
            />
            <DebugRow label="Aligned H*" value={formatPoint(automatic?.alignedSourceMidHeel)} />
            <DebugRow label="Aligned W" value={formatPoint(automatic?.alignedSourceSecondToe)} />
            <DebugRow label="Aligned Ms" value={formatPoint(automatic?.alignedSourceMs)} />

            <CheckRow
                label="Aligned Ms = target M'"
                details={`error ${formatNumber(
                    checks?.sourceMsToMPrime.distanceCm,
                )} cm · tol ${formatNumber(checks?.sourceMsToMPrime.toleranceCm)} cm`}
                pass={checks?.sourceMsToMPrime.pass}
            />
            <CheckRow
                label="Aligned H*-W = target O-M'"
                details={`angle ${degrees(
                    checks?.axisToOMPrime.angleErrorRadians,
                )} · direction dot ${formatNumber(
                    checks?.axisToOMPrime.directionDot,
                    8,
                )} · H*/W line error ${formatNumber(
                    checks?.axisToOMPrime.hLineDistanceCm,
                )}/${formatNumber(checks?.axisToOMPrime.wLineDistanceCm)} cm`}
                pass={checks?.axisToOMPrime.pass}
            />
            <CheckRow
                label="H* heel-side / W toe-side"
                details={`H* projection ${formatNumber(
                    checks?.heelToeSides.heelProjectionCm,
                )} cm · W projection ${formatNumber(checks?.heelToeSides.toeProjectionCm)} cm`}
                pass={checks?.heelToeSides.pass}
            />
            <CheckRow
                label="Uniform transform preserved"
                details={`maximum pair-distance error ${formatNumber(
                    checks?.uniformTransform.maximumDistanceErrorCm,
                    8,
                )} cm`}
                pass={checks?.uniformTransform.pass}
            />
            <CheckRow
                label="W source identity preserved"
                details={`aligned identity error ${formatNumber(
                    checks?.secondToeIdentityPreserved.distanceCm,
                    8,
                )} cm`}
                pass={checks?.secondToeIdentityPreserved.pass}
            />

            <DebugRow
                label="Diagnostic: original RS vs M'G"
                value={degrees(automatic?.diagnostics.alignedRsVsMPrimeGAngleRadians)}
            />
            <DebugRow
                label="Diagnostic: R distance to M'G"
                value={`${formatNumber(automatic?.diagnostics.alignedRDistanceToMPrimeG)} cm`}
            />
            <DebugRow
                label="Diagnostic: S distance to M'G"
                value={`${formatNumber(automatic?.diagnostics.alignedSDistanceToMPrimeG)} cm`}
            />
        </Card>
    );
};

export default FootPiecePositioningDebugPanel;
