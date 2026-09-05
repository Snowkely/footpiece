/* eslint-disable react/no-unknown-property */
import { Line } from '@react-three/drei';
import type { TargetReferenceArcGeometry } from '../types';

interface TargetReferenceArcLayerProps {
    geometry: TargetReferenceArcGeometry;
}

const TargetReferenceArcLayer: React.FC<TargetReferenceArcLayerProps> = ({ geometry }) => (
    <Line
        points={geometry.targetReferenceArc.map(
            (point) => [point.x, point.y, 0.46] as [number, number, number],
        )}
        color="#10b981"
        lineWidth={4.2}
        transparent
        opacity={0.96}
    />
);

export default TargetReferenceArcLayer;
