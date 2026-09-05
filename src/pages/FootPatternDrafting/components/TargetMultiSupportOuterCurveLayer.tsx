/* eslint-disable react/no-unknown-property */
import { Line, Sphere } from '@react-three/drei';
import type { TargetMultiSupportOuterCurveCandidate } from '../types';

interface TargetMultiSupportOuterCurveLayerProps {
    candidate: TargetMultiSupportOuterCurveCandidate;
    color?: string;
    lineWidth?: number;
    zOffset?: number;
}

const VALID_COLOR = '#1d4ed8';
const INVALID_COLOR = '#60a5fa';
const ANCHOR_RADIUS_CM = 0.13;

const TargetMultiSupportOuterCurveLayer: React.FC<TargetMultiSupportOuterCurveLayerProps> = ({
    candidate,
    color: colorOverride,
    lineWidth = 4,
    zOffset = 0.9,
}) => {
    const color = colorOverride ?? (candidate.valid ? VALID_COLOR : INVALID_COLOR);

    return (
        <group>
            <Line
                points={candidate.polylinePoints.map(
                    (point) => [point.x, point.y, zOffset] as [number, number, number],
                )}
                color={color}
                lineWidth={lineWidth}
                dashed={!candidate.valid}
                dashSize={0.35}
                gapSize={0.18}
                transparent
                opacity={candidate.valid ? 1 : 0.82}
            />
            {candidate.anchorOrder.map((id) => {
                const point = candidate.anchors[id];
                return (
                    <Sphere
                        key={id}
                        args={[ANCHOR_RADIUS_CM, 16, 16]}
                        position={[point.x, point.y, zOffset + 0.03]}
                    >
                        <meshBasicMaterial color={color} />
                    </Sphere>
                );
            })}
        </group>
    );
};

export default TargetMultiSupportOuterCurveLayer;
