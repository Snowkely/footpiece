/* eslint-disable react/no-unknown-property */
import { Html, Sphere } from '@react-three/drei';
import type { DraftPoint, TargetAnkleIntersectionGeometry } from '../types';

interface TargetAnkleIntersectionsLayerProps {
    geometry: TargetAnkleIntersectionGeometry;
}

const TARGET_POINT_RADIUS_CM = 0.2;

const TargetMarker: React.FC<{ point: DraftPoint; label: string; color: string }> = ({
    point,
    label,
    color,
}) => (
    <group>
        <Sphere args={[TARGET_POINT_RADIUS_CM, 20, 20]} position={[point.x, point.y, 0.5]}>
            <meshBasicMaterial color={color} />
        </Sphere>
        <Html position={[point.x + 0.28, point.y + 0.28, 0.52]} zIndexRange={[4, 0]}>
            <span className="foot-piece-axis-label" style={{ color }}>
                {label}
            </span>
        </Html>
    </group>
);

const TargetAnkleIntersectionsLayer: React.FC<TargetAnkleIntersectionsLayerProps> = ({
    geometry,
}) => (
    <group>
        <TargetMarker point={geometry.RStar} label="R*" color="#0284c7" />
        <TargetMarker point={geometry.SStar} label="S*" color="#06b6d4" />
    </group>
);

export default TargetAnkleIntersectionsLayer;
