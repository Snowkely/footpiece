/* eslint-disable react/no-unknown-property */
import { Html, Line, Sphere } from '@react-three/drei';
import type { ToeRadialOuterSupportGeometry, ToeRadialOuterSupportPoint } from '../types';

interface ToeRadialOuterSupportsLayerProps {
    geometry: ToeRadialOuterSupportGeometry;
}

const OUTER_SUPPORT_COLOR = '#6d28d9';
const OUTER_SUPPORT_LINE_COLOR = '#8b5cf6';
const OUTER_SUPPORT_RADIUS_CM = 0.18;

const OuterSupport: React.FC<{ support: ToeRadialOuterSupportPoint }> = ({ support }) => (
    <group>
        <Line
            points={[
                [support.referencePoint.x, support.referencePoint.y, 0.79],
                [support.outerPoint.x, support.outerPoint.y, 0.79],
            ]}
            color={OUTER_SUPPORT_LINE_COLOR}
            lineWidth={2.4}
        />
        <Sphere
            args={[OUTER_SUPPORT_RADIUS_CM, 18, 18]}
            position={[support.outerPoint.x, support.outerPoint.y, 0.82]}
        >
            <meshBasicMaterial color={OUTER_SUPPORT_COLOR} />
        </Sphere>
        <Html
            position={[support.outerPoint.x + 0.25, support.outerPoint.y + 0.25, 0.84]}
            zIndexRange={[5, 0]}
        >
            <span className="foot-drafting-toe-outer-label">{support.outerPoint.id}</span>
        </Html>
    </group>
);

const ToeRadialOuterSupportsLayer: React.FC<ToeRadialOuterSupportsLayerProps> = ({ geometry }) => (
    <group>
        {[
            geometry.W1Prime,
            geometry.W2Prime,
            geometry.WPrime,
            geometry.W3Prime,
            geometry.W4Prime,
        ].map((support) => (
            <OuterSupport key={support.outerPoint.id} support={support} />
        ))}
    </group>
);

export default ToeRadialOuterSupportsLayer;
