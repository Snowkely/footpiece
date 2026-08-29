import { Alert, Button, Card, Space, Tag, Typography } from 'antd';
import type { FootPieceFSelection, FootPiecePositioningGeometry } from '../types';

const { Text } = Typography;

interface FootPiecePositioningControlsProps {
    footPiece?: FootPiecePositioningGeometry;
    selecting: boolean;
    pendingSelection?: FootPieceFSelection;
    confirmedSelection?: FootPieceFSelection;
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

const FootPiecePositioningControls: React.FC<FootPiecePositioningControlsProps> = ({
    footPiece,
    selecting,
    pendingSelection,
    confirmedSelection,
    onStartSelection,
    onConfirmSelection,
    onCancelSelection,
    onClearSelection,
}) => {
    const status = footPiece?.positioning.status ?? 'PROVISIONAL';
    const hasUnconfirmedChange = Boolean(
        pendingSelection && !sameSelection(pendingSelection, confirmedSelection),
    );

    return (
        <Card
            className="foot-drafting-panel foot-piece-positioning-controls"
            title="Foot Piece Positioning"
        >
            <div className="foot-drafting-value-row">
                <Text>Foot Piece placement</Text>
                <Tag color={status === 'VALID' ? 'success' : 'warning'}>{status}</Tag>
            </div>

            {status !== 'VALID' && !selecting && (
                <Alert
                    type="warning"
                    showIcon
                    message="Provisional preview"
                    description="Select F / second toe to complete positioning. The current preview uses the legacy RS-midpoint-to-M' placement."
                />
            )}

            {selecting && (
                <Alert
                    type="info"
                    showIcon
                    message="Select F / second toe"
                    description="Select the second-toe point F along the highlighted Q-P arc. Other canvas locations are not selectable."
                />
            )}

            <Text type="secondary" className="foot-piece-positioning-hint">
                Suggested second-toe search region: Q-P arc
            </Text>

            {pendingSelection && (
                <div className="foot-piece-positioning-selection">
                    <Text strong>Selected F</Text>
                    <Text type="secondary">
                        Q-P segment {pendingSelection.segmentIndex} · t ={' '}
                        {pendingSelection.segmentT.toFixed(4)}
                    </Text>
                    {confirmedSelection && hasUnconfirmedChange && (
                        <Tag color="processing">Awaiting confirmation</Tag>
                    )}
                </div>
            )}

            <Space wrap className="foot-piece-positioning-actions">
                {!selecting && !pendingSelection && (
                    <Button type="primary" disabled={!footPiece} onClick={onStartSelection}>
                        Select F / second toe
                    </Button>
                )}

                {selecting && <Button onClick={onCancelSelection}>Cancel selection</Button>}

                {!selecting && pendingSelection && (
                    <>
                        {(hasUnconfirmedChange || !confirmedSelection) && (
                            <Button type="primary" onClick={onConfirmSelection}>
                                Confirm F
                            </Button>
                        )}
                        <Button onClick={onStartSelection}>Reselect F</Button>
                        <Button danger onClick={onClearSelection}>
                            Clear F
                        </Button>
                    </>
                )}
            </Space>
        </Card>
    );
};

export default FootPiecePositioningControls;
