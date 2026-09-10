/* eslint-disable react/no-unknown-property */
import { Html, Line, Sphere } from '@react-three/drei';
import type { DraftPoint, TargetOuterCurveCandidate } from '../types';

interface TargetOuterCurveLayerProps {
    candidate: TargetOuterCurveCandidate;
}

const OUTER_CURVE_COLOR = '#6b7280';
const OUTER_CURVE_INVALID_COLOR = '#a78bfa';
const ANCHOR_RADIUS_CM = 0.14;

const AnchorMarker: React.FC<{ point: DraftPoint; color: string }> = ({ point, color }) => (
    <group>
        <Sphere args={[ANCHOR_RADIUS_CM, 16, 16]} position={[point.x, point.y, 0.84]}>
            <meshBasicMaterial color={color} />
        </Sphere>
        <Html position={[point.x + 0.22, point.y + 0.22, 0.86]} zIndexRange={[4, 0]}>
            <span className="foot-drafting-outer-curve-label">{point.id}</span>
        </Html>
    </group>
);

const TargetOuterCurveLayer: React.FC<TargetOuterCurveLayerProps> = ({ candidate }) => {
    const color = candidate.valid ? OUTER_CURVE_COLOR : OUTER_CURVE_INVALID_COLOR;
    const anchors = Object.values(candidate.anchors);

    return (
        <group>
            <Line
                points={candidate.polylinePoints.map(
                    (point) => [point.x, point.y, 0.8] as [number, number, number],
                )}
                color={color}
                lineWidth={3.5}
                transparent
                opacity={0.98}
            />
            {anchors.map((point) => (
                <AnchorMarker key={point.id} point={point} color={color} />
            ))}
        </group>
    );
};

export default TargetOuterCurveLayer;
