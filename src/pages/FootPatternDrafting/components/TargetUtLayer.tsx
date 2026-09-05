/* eslint-disable react/no-unknown-property */
import { Html, Line, Sphere } from '@react-three/drei';
import type { DraftPoint, TargetUtGeometry } from '../types';

interface TargetUtLayerProps {
    geometry: TargetUtGeometry;
}

const UT_COLOR = '#2563eb';
const UT_POINT_RADIUS_CM = 0.16;
const UT_LABEL_OFFSET_CM = 0.25;

const UtPoint: React.FC<{ point: DraftPoint }> = ({ point }) => (
    <group>
        <Sphere args={[UT_POINT_RADIUS_CM, 18, 18]} position={[point.x, point.y, 0.64]}>
            <meshBasicMaterial color={UT_COLOR} />
        </Sphere>
        <Html
            position={[point.x + UT_LABEL_OFFSET_CM, point.y + UT_LABEL_OFFSET_CM, 0.68]}
            zIndexRange={[1, 0]}
        >
            <span className="foot-drafting-ut-label">{point.id}</span>
        </Html>
    </group>
);

const TargetUtLayer: React.FC<TargetUtLayerProps> = ({ geometry }) => (
    <group>
        <Line
            points={[
                [geometry.U.x, geometry.U.y, 0.6],
                [geometry.T.x, geometry.T.y, 0.6],
            ]}
            color={UT_COLOR}
            lineWidth={2.6}
            transparent
            opacity={0.95}
        />
        <UtPoint point={geometry.U} />
        <UtPoint point={geometry.T} />
    </group>
);

export default TargetUtLayer;
