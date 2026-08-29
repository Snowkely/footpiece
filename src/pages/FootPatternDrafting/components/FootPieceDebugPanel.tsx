import { Card, Tag, Typography } from 'antd';
import type { FootPieceLandmarkId, FootPiecePositioningGeometry } from '../types';

const { Text } = Typography;
const LANDMARK_IDS: FootPieceLandmarkId[] = ['P', 'Q', 'R', 'S'];

interface FootPieceDebugPanelProps {
    sampleLoaded: boolean;
    targetR?: number;
    footPiece?: FootPiecePositioningGeometry;
}

function formatNumber(value?: number, digits = 4): string {
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

const FootPieceDebugPanel: React.FC<FootPieceDebugPanelProps> = ({
    sampleLoaded,
    targetR,
    footPiece,
}) => {
    const midpointCheck = footPiece?.checks.midpointToMPrime;
    const orientationCheck = footPiece?.checks.orientation;

    return (
        <Card size="small" title="Foot Piece" className="foot-drafting-debug-card">
            <DebugRow label="DXF sample loaded" value={sampleLoaded ? 'YES' : 'NO'} />
            <DebugRow
                label="Alignment mode"
                value={footPiece?.positioning.alignmentMode ?? 'legacy-rs-midpoint-to-mprime'}
            />
            <DebugRow
                label="RS chord length (raw)"
                value={`${formatNumber(footPiece?.rawRsChordLength)} DXF units`}
            />
            <DebugRow
                label="Heel arc R→S (raw)"
                value={`${formatNumber(footPiece?.rawHeelArcLength)} DXF units`}
            />
            <DebugRow label="Heel arc sampled points" value={footPiece?.heelArcPointCount ?? '—'} />
            <DebugRow label="target heel length r" value={`${formatNumber(targetR)} cm`} />
            <DebugRow label="scaleToCm" value={formatNumber(footPiece?.scaleToCm, 8)} />
            <DebugRow
                label="rotation"
                value={`${formatNumber(
                    footPiece ? (footPiece.rotationRadians * 180) / Math.PI : undefined,
                )}°`}
            />

            {LANDMARK_IDS.map((landmarkId) => (
                <DebugRow
                    key={landmarkId}
                    label={`aligned ${landmarkId}`}
                    value={formatPoint(footPiece?.alignedLandmarks[landmarkId])}
                />
            ))}

            <DebugRow label="RS midpoint" value={formatPoint(footPiece?.alignedRsMidpoint)} />
            <DebugRow label="M'" value={formatPoint(footPiece?.targetMPrime)} />
            <DebugRow label="RQPS sampled points" value={footPiece?.rqpsPointCount ?? '—'} />
            <DebugRow
                label="RQPS arc length"
                value={`${formatNumber(footPiece?.rqpsArcLengthCm)} cm`}
            />

            {footPiece?.positioning.alignmentMode === 'legacy-rs-midpoint-to-mprime' && (
                <div className="foot-drafting-check-row">
                    <div>
                        <Text>{"Legacy preview: RS midpoint = M'"}</Text>
                        <div className="foot-drafting-check-values">
                            distance {formatNumber(midpointCheck?.distanceCm)} cm · tol ±
                            {formatNumber(midpointCheck?.toleranceCm)} cm
                        </div>
                    </div>
                    <Tag color={midpointCheck?.pass ? 'success' : 'default'}>
                        {midpointCheck ? (midpointCheck.pass ? 'PASS' : 'FAIL') : 'WAIT'}
                    </Tag>
                </div>
            )}

            <div className="foot-drafting-check-row">
                <div>
                    <Text>{"S→R aligned with M'→G"}</Text>
                    <div className="foot-drafting-check-values">
                        angle error{' '}
                        {formatNumber(
                            orientationCheck
                                ? (orientationCheck.angleErrorRadians * 180) / Math.PI
                                : undefined,
                            8,
                        )}
                        °
                    </div>
                </div>
                <Tag color={orientationCheck?.pass ? 'success' : 'default'}>
                    {orientationCheck ? (orientationCheck.pass ? 'PASS' : 'FAIL') : 'WAIT'}
                </Tag>
            </div>
        </Card>
    );
};

export default FootPieceDebugPanel;
