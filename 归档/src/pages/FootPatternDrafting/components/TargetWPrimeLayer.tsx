/* eslint-disable react/no-unknown-property */
import { Html, Line, Sphere } from '@react-three/drei';
import type { TargetWPrimeGeometry } from '../types';

interface TargetWPrimeLayerProps {
    geometry: TargetWPrimeGeometry;
}

const WPRIME_COLOR = '#7c3aed';
const WPRIME_RADIUS_CM = 0.18;

const TargetWPrimeLayer: React.FC<TargetWPrimeLayerProps> = ({ geometry }) => (
    <group>
        <Line
            points={[
                [geometry.MPrime.x, geometry.MPrime.y, 0.66],
                [geometry.WPrime.x, geometry.WPrime.y, 0.66],
            ]}
            color={WPRIME_COLOR}
            lineWidth={1.7}
            dashed
            dashSize={0.3}
            gapSize={0.18}
            transparent
            opacity={0.75}
        />
        <Line
            points={[
                [geometry.W.x, geometry.W.y, 0.68],
                [geometry.WPrime.x, geometry.WPrime.y, 0.68],
            ]}
            color={WPRIME_COLOR}
            lineWidth={3}
        />
        <Sphere
            args={[WPRIME_RADIUS_CM, 18, 18]}
            position={[geometry.WPrime.x, geometry.WPrime.y, 0.72]}
        >
            <meshBasicMaterial color={WPRIME_COLOR} />
        </Sphere>
        <Html
            position={[geometry.WPrime.x + 0.28, geometry.WPrime.y + 0.28, 0.74]}
            zIndexRange={[3, 0]}
        >
            <span className="foot-drafting-wprime-label">W&apos;</span>
        </Html>
    </group>
);

export default TargetWPrimeLayer;
