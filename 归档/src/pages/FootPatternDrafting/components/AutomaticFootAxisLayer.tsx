/* eslint-disable react/no-unknown-property */
import { Html, Line, Sphere } from '@react-three/drei';
import type {
    AutomaticFootPiecePositioning,
    DraftPoint,
    DraftVector2,
    FrontPieceGeometry,
} from '../types';

const DEBUG_POINT_RADIUS_CM = 0.18;
const TANGENT_HALF_LENGTH_CM = 2.5;
const NORMAL_GUIDE_LENGTH_CM = 3.5;

export interface AutomaticFootAxisVisibility {
    midHeel: boolean;
    tangent: boolean;
    toeNormal: boolean;
    toeArc: boolean;
    secondToe: boolean;
    longitudinalAxis: boolean;
    sourceRS: boolean;
    sourceMs: boolean;
    targetAxis: boolean;
    targetMPrimeG: boolean;
}

interface AutomaticFootAxisLayerProps {
    positioning: AutomaticFootPiecePositioning;
    frontPiece: FrontPieceGeometry;
    visibility: AutomaticFootAxisVisibility;
}

function linePoints(points: DraftPoint[], z = 0.34): Array<[number, number, number]> {
    return points.map((point) => [point.x, point.y, z]);
}

function offsetPoint(
    origin: DraftPoint,
    direction: DraftVector2,
    distanceCm: number,
    id: string,
): DraftPoint {
    return {
        id,
        x: origin.x + direction.x * distanceCm,
        y: origin.y + direction.y * distanceCm,
    };
}

const DebugMarker: React.FC<{
    point: DraftPoint;
    label: string;
    color: string;
}> = ({ point, label, color }) => (
    <group>
        <Sphere args={[DEBUG_POINT_RADIUS_CM, 18, 18]} position={[point.x, point.y, 0.42]}>
            <meshBasicMaterial color={color} />
        </Sphere>
        <Html position={[point.x + 0.25, point.y + 0.25, 0.44]} zIndexRange={[3, 0]}>
            <span className="foot-piece-axis-label" style={{ color }}>
                {label}
            </span>
        </Html>
    </group>
);

const AutomaticFootAxisLayer: React.FC<AutomaticFootAxisLayerProps> = ({
    positioning,
    frontPiece,
    visibility,
}) => {
    const HStar = positioning.alignedSourceMidHeel;
    const W = positioning.alignedSourceSecondToe;
    const Ms = positioning.alignedSourceMs;
    const transformDirection = (direction: DraftVector2): DraftVector2 => {
        const alignedAxis = {
            x: W.x - HStar.x,
            y: W.y - HStar.y,
        };
        const sourceNormal = positioning.source.sourceMidHeel.normalTowardToe;
        const sourceNormalAngle = Math.atan2(sourceNormal.y, sourceNormal.x);
        const alignedNormalAngle = Math.atan2(alignedAxis.y, alignedAxis.x);
        const rotation = alignedNormalAngle - sourceNormalAngle;
        return {
            x: direction.x * Math.cos(rotation) - direction.y * Math.sin(rotation),
            y: direction.x * Math.sin(rotation) + direction.y * Math.cos(rotation),
        };
    };
    const alignedTangent = transformDirection(positioning.source.sourceMidHeel.tangent);
    const alignedToeNormal = transformDirection(positioning.source.sourceMidHeel.normalTowardToe);
    const tangentStart = offsetPoint(HStar, alignedTangent, -TANGENT_HALF_LENGTH_CM, 'tangent-a');
    const tangentEnd = offsetPoint(HStar, alignedTangent, TANGENT_HALF_LENGTH_CM, 'tangent-b');
    const normalEnd = offsetPoint(HStar, alignedToeNormal, NORMAL_GUIDE_LENGTH_CM, 'normal-end');

    return (
        <group>
            {visibility.toeArc && (
                <Line
                    points={linePoints(positioning.alignedQPArc)}
                    color="#f59e0b"
                    lineWidth={4}
                    transparent
                    opacity={0.95}
                />
            )}
            {visibility.tangent && (
                <Line
                    points={linePoints([tangentStart, tangentEnd], 0.38)}
                    color="#2563eb"
                    lineWidth={2.4}
                />
            )}
            {visibility.toeNormal && (
                <Line
                    points={linePoints([HStar, normalEnd], 0.39)}
                    color="#7c3aed"
                    lineWidth={2.4}
                    dashed
                    dashSize={0.25}
                    gapSize={0.14}
                />
            )}
            {visibility.longitudinalAxis && (
                <Line
                    points={linePoints([HStar, W], 0.37)}
                    color="#7c3aed"
                    lineWidth={2.2}
                    transparent
                    opacity={0.82}
                />
            )}
            {visibility.sourceRS && (
                <Line
                    points={linePoints(
                        [
                            positioning.alignedHeelArc[0],
                            positioning.alignedHeelArc[positioning.alignedHeelArc.length - 1],
                        ],
                        0.35,
                    )}
                    color="#0f766e"
                    lineWidth={2}
                />
            )}
            {visibility.targetAxis && (
                <Line
                    points={linePoints([frontPiece.points.O, frontPiece.points.MPrime], 0.31)}
                    color="#0891b2"
                    lineWidth={2}
                    dashed
                    dashSize={0.3}
                    gapSize={0.18}
                />
            )}
            {visibility.targetMPrimeG && (
                <Line
                    points={linePoints([frontPiece.points.MPrime, frontPiece.points.G], 0.32)}
                    color="#64748b"
                    lineWidth={1.8}
                    dashed
                    dashSize={0.3}
                    gapSize={0.18}
                />
            )}
            {visibility.midHeel && <DebugMarker point={HStar} label="H*" color="#ea580c" />}
            {visibility.secondToe && <DebugMarker point={W} label="W" color="#16a34a" />}
            {visibility.sourceMs && <DebugMarker point={Ms} label="Ms" color="#0f766e" />}
        </group>
    );
};

export default AutomaticFootAxisLayer;
