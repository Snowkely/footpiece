/* eslint-disable react/no-unknown-property */
import { Html, Line, Sphere } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import {
    nearestFootPieceFSelection,
    pointAtFootPieceFSelection,
} from '../geometry/footPiecePositioning';
import type {
    DraftPoint,
    FootPieceFSelection,
    FootPiecePositioningGeometry,
    FrontPieceGeometry,
} from '../types';

const F_MARKER_RADIUS_CM = 0.18;
const F_HOVER_RADIUS_CM = 0.11;
const GUIDE_EXTRA_LENGTH_CM = 2;

interface FootPieceFSelectorProps {
    footPiece: FootPiecePositioningGeometry;
    frontPiece: FrontPieceGeometry;
    selectionMode: boolean;
    pendingSelection?: FootPieceFSelection;
    hoverSelection?: FootPieceFSelection;
    showFMarkers: boolean;
    showGuides: boolean;
    onHoverSelectionChange: (selection?: FootPieceFSelection) => void;
    onSelect: (selection: FootPieceFSelection) => void;
}

interface FMarkerProps {
    point: DraftPoint;
    color: string;
    label: string;
    radius?: number;
}

function linePoints(points: DraftPoint[], z: number): Array<[number, number, number]> {
    return points.map((point) => [point.x, point.y, z]);
}

const FMarker: React.FC<FMarkerProps> = ({ point, color, label, radius = F_MARKER_RADIUS_CM }) => (
    <group>
        <Sphere args={[radius, 18, 18]} position={[point.x, point.y, 0.5]}>
            <meshBasicMaterial color={color} />
        </Sphere>
        <Html
            position={[point.x + radius * 1.6, point.y + radius * 1.6, 0.54]}
            zIndexRange={[4, 0]}
        >
            <span className="foot-piece-f-label">{label}</span>
        </Html>
    </group>
);

const FootPieceFSelector: React.FC<FootPieceFSelectorProps> = ({
    footPiece,
    frontPiece,
    selectionMode,
    pendingSelection,
    hoverSelection,
    showFMarkers,
    showGuides,
    onHoverSelectionChange,
    onSelect,
}) => {
    const pendingPoint = pendingSelection
        ? pointAtFootPieceFSelection(footPiece.alignedQPArc, pendingSelection, 'W candidate')
        : undefined;
    const hoverPoint = hoverSelection
        ? pointAtFootPieceFSelection(footPiece.alignedQPArc, hoverSelection, 'W hover')
        : undefined;
    const confirmedPoint = footPiece.positioning.alignedF;
    const pendingDiffersFromConfirmed = Boolean(
        pendingPoint &&
            (!confirmedPoint ||
                Math.hypot(pendingPoint.x - confirmedPoint.x, pendingPoint.y - confirmedPoint.y) >
                    1e-9),
    );
    const guideHalfLength =
        Math.max(
            ...footPiece.alignedShrinkedOutline.map((point) =>
                Math.hypot(
                    point.x - frontPiece.points.MPrime.x,
                    point.y - frontPiece.points.MPrime.y,
                ),
            ),
        ) + GUIDE_EXTRA_LENGTH_CM;
    const { gDirection, centreDirection } = footPiece.positioning;
    const { MPrime } = frontPiece.points;
    const alignmentGuide = [
        {
            id: "M'G-line-start",
            x: MPrime.x - gDirection.x * guideHalfLength,
            y: MPrime.y - gDirection.y * guideHalfLength,
        },
        {
            id: "M'G-line-end",
            x: MPrime.x + gDirection.x * guideHalfLength,
            y: MPrime.y + gDirection.y * guideHalfLength,
        },
    ];
    const centreGuide = [
        {
            id: "M'F-line-start",
            x: MPrime.x - centreDirection.x * guideHalfLength,
            y: MPrime.y - centreDirection.y * guideHalfLength,
        },
        {
            id: "M'F-line-end",
            x: MPrime.x + centreDirection.x * guideHalfLength,
            y: MPrime.y + centreDirection.y * guideHalfLength,
        },
    ];

    const getSelectionFromPointer = (
        event: ThreeEvent<PointerEvent | MouseEvent>,
    ): FootPieceFSelection | undefined => {
        const localPoint = event.object.worldToLocal(event.point.clone());
        return nearestFootPieceFSelection(
            { id: 'pointer', x: localPoint.x, y: localPoint.y },
            footPiece.alignedQPArc,
        )?.selection;
    };

    return (
        <group>
            {showGuides && (
                <>
                    <Line
                        points={linePoints(alignmentGuide, 0.2)}
                        color="#2563eb"
                        lineWidth={1.5}
                        transparent
                        opacity={0.72}
                    />
                    <Line
                        points={linePoints(centreGuide, 0.2)}
                        color="#64748b"
                        lineWidth={1.4}
                        dashed
                        dashSize={0.3}
                        gapSize={0.2}
                        transparent
                        opacity={0.78}
                    />
                </>
            )}

            {selectionMode && (
                <Line
                    points={linePoints(footPiece.alignedQPArc, 0.44)}
                    color="#f59e0b"
                    lineWidth={7}
                    transparent
                    opacity={0.92}
                    onPointerMove={(event) => {
                        event.stopPropagation();
                        onHoverSelectionChange(getSelectionFromPointer(event));
                    }}
                    onPointerLeave={() => onHoverSelectionChange(undefined)}
                    onClick={(event) => {
                        event.stopPropagation();
                        const selection = getSelectionFromPointer(event);
                        if (selection) {
                            onSelect(selection);
                        }
                    }}
                />
            )}

            {showFMarkers && selectionMode && hoverPoint && (
                <FMarker
                    point={hoverPoint}
                    color="#f59e0b"
                    label="W hover"
                    radius={F_HOVER_RADIUS_CM}
                />
            )}

            {showFMarkers && pendingPoint && pendingDiffersFromConfirmed && (
                <FMarker point={pendingPoint} color="#2563eb" label="W selected" />
            )}

            {showFMarkers && confirmedPoint && (
                <FMarker point={confirmedPoint} color="#16a34a" label="W" />
            )}
        </group>
    );
};

export default FootPieceFSelector;
