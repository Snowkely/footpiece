import { Alert, Button, Card, Space, Tag, Typography } from 'antd';
import type {
    AlignedFootPieceGeometry,
    FootPieceFSelection,
    FootPiecePositioningGeometry,
    GeometryValidationError,
} from '../types';

const { Text } = Typography;

interface FootPiecePositioningControlsProps {
    footPiece?: AlignedFootPieceGeometry;
    automaticErrors: GeometryValidationError[];
    manualOverride: boolean;
    selecting: boolean;
    pendingSelection?: FootPieceFSelection;
    confirmedSelection?: FootPieceFSelection;
    onUseManualOverride: () => void;
    onUseAutomatic: () => void;
    onStartSelection: () => void;
    onConfirmSelection: () => void;
    onCancelSelection: () => void;
    onClearSelection: () => void;
}

function sameSelection(first?: FootPieceFSelection, second?: FootPieceFSelection): boolean {
    return Boolean(
        first &&
            second &&
            first.segmentIndex === second.segmentIndex &&
            Math.abs(first.segmentT - second.segmentT) <= Number.EPSILON,
    );
}

function isManualPositioningGeometry(
    footPiece: AlignedFootPieceGeometry | undefined,
): footPiece is FootPiecePositioningGeometry {
    return Boolean(footPiece && 'positioning' in footPiece);
}

const FootPiecePositioningControls: React.FC<FootPiecePositioningControlsProps> = ({
    footPiece,
    automaticErrors,
    manualOverride,
    selecting,
    pendingSelection,
    confirmedSelection,
    onUseManualOverride,
    onUseAutomatic,
    onStartSelection,
    onConfirmSelection,
    onCancelSelection,
    onClearSelection,
}) => {
    const automaticPositioning = footPiece?.automaticPositioning;
    const manualPositioning = isManualPositioningGeometry(footPiece)
        ? footPiece.positioning
        : undefined;
    const hasUnconfirmedChange = Boolean(
        pendingSelection && !sameSelection(pendingSelection, confirmedSelection),
    );

    return (
        <Card
            className="foot-drafting-panel foot-piece-positioning-controls"
            title="Foot Piece Positioning"
        >
            {!manualOverride ? (
                <>
                    <div className="foot-drafting-value-row">
                        <Text>Mid Heel H*</Text>
                        <Tag color={automaticPositioning ? 'success' : 'error'}>AUTO</Tag>
                    </div>
                    <div className="foot-drafting-value-row">
                        <Text>Second Toe W</Text>
                        <Tag color={automaticPositioning ? 'success' : 'error'}>AUTO</Tag>
                    </div>
                    <div className="foot-drafting-value-row">
                        <Text>Foot Piece placement</Text>
                        <Tag color={automaticPositioning ? 'success' : 'warning'}>
                            {automaticPositioning ? 'VALID' : 'WAITING'}
                        </Tag>
                    </div>

                    {automaticPositioning ? (
                        <Alert
                            type="success"
                            showIcon
                            message="Automatic foot axis detected"
                            description="H* comes from the heel extremum and tangent score. W is the first forward H* normal intersection with the Q-P toe arc."
                        />
                    ) : automaticErrors.length ? (
                        <>
                            <Alert
                                type="error"
                                showIcon
                                message="AUTO DETECTION FAILED"
                                description={`${automaticErrors[0].code}: ${automaticErrors[0].message}`}
                            />
                            <Button onClick={onUseManualOverride}>Use manual override</Button>
                        </>
                    ) : (
                        <Text type="secondary">Enter valid measurements and temporary r.</Text>
                    )}
                </>
            ) : (
                <>
                    <div className="foot-drafting-value-row">
                        <Text>Second Toe source</Text>
                        <Tag color="warning">MANUAL DEBUG OVERRIDE</Tag>
                    </div>
                    <div className="foot-drafting-value-row">
                        <Text>Foot Piece placement</Text>
                        <Tag color={manualPositioning?.status === 'VALID' ? 'success' : 'warning'}>
                            {manualPositioning?.status ?? 'PROVISIONAL'}
                        </Tag>
                    </div>

                    <Alert
                        type="warning"
                        showIcon
                        message="Legacy fallback only"
                        description="Manual W uses the legacy RS-midpoint preview and is available only as an explicit debug fallback."
                    />

                    {selecting && (
                        <Alert
                            type="info"
                            showIcon
                            message="Select W / second toe"
                            description="Select W along the highlighted Q-P arc. Other canvas locations are not selectable."
                        />
                    )}

                    {pendingSelection && (
                        <div className="foot-piece-positioning-selection">
                            <Text strong>Selected W</Text>
                            <Text type="secondary">
                                Q-P segment {pendingSelection.segmentIndex} · t ={' '}
                                {pendingSelection.segmentT.toFixed(4)}
                            </Text>
                        </div>
                    )}

                    <Space wrap className="foot-piece-positioning-actions">
                        <Button onClick={onUseAutomatic}>Retry automatic</Button>
                        {!selecting && !pendingSelection && (
                            <Button type="primary" disabled={!footPiece} onClick={onStartSelection}>
                                Select W / second toe
                            </Button>
                        )}
                        {selecting && <Button onClick={onCancelSelection}>Cancel selection</Button>}
                        {!selecting && pendingSelection && (
                            <>
                                {(hasUnconfirmedChange || !confirmedSelection) && (
                                    <Button type="primary" onClick={onConfirmSelection}>
                                        Confirm W
                                    </Button>
                                )}
                                <Button onClick={onStartSelection}>Reselect W</Button>
                                <Button danger onClick={onClearSelection}>
                                    Clear W
                                </Button>
                            </>
                        )}
                    </Space>
                </>
            )}
        </Card>
    );
};

export default FootPiecePositioningControls;
