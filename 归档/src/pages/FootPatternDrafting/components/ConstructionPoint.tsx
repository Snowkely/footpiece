/* eslint-disable react/no-unknown-property */
import { Html, Sphere } from '@react-three/drei';
import type { DraftPoint } from '../types';

interface ConstructionPointProps {
    point: DraftPoint;
    color: string;
}

const POINT_RADIUS_CM = 0.12;
const LABEL_OFFSET_CM = 0.22;

const ConstructionPoint: React.FC<ConstructionPointProps> = ({ point, color }) => {
    return (
        <group>
            <Sphere args={[POINT_RADIUS_CM, 16, 16]} position={[point.x, point.y, 0.05]}>
                <meshBasicMaterial color={color} />
            </Sphere>
            <Html
                position={[point.x + LABEL_OFFSET_CM, point.y + LABEL_OFFSET_CM, 0.1]}
                zIndexRange={[1, 0]}
            >
                <span className="foot-drafting-point-label">{point.id}</span>
            </Html>
        </group>
    );
};

export default ConstructionPoint;
