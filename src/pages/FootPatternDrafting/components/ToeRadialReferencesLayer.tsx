/* eslint-disable react/no-unknown-property */
import { Html, Line, Sphere } from '@react-three/drei';
import type { DraftPoint, ToeRadialReferenceGeometry } from '../types';

interface ToeRadialReferencesLayerProps {
    geometry: ToeRadialReferenceGeometry;
}

const REFERENCE_COLOR = '#f59e0b';
const CENTER_COLOR = '#16a34a';
const ORIGIN_COLOR = '#7c3aed';
const TOE_ARC_COLOR = '#fbbf24';
const MARKER_RADIUS_CM = 0.16;

const Marker: React.FC<{ point: DraftPoint; color: string }> = ({ point, color }) => (
    <group>
        <Sphere args={[MARKER_RADIUS_CM, 18, 18]} position={[point.x, point.y, 0.76]}>
            <meshBasicMaterial color={color} />
        </Sphere>
        <Html position={[point.x + 0.24, point.y + 0.24, 0.78]} zIndexRange={[4, 0]}>
            <span className="foot-drafting-toe-radial-label">{point.id}</span>
        </Html>
    </group>
);

const ToeRadialReferencesLayer: React.FC<ToeRadialReferencesLayerProps> = ({ geometry }) => {
    const references = [geometry.W1, geometry.W2, geometry.W3, geometry.W4];

    return (
        <group>
            <Line
                points={geometry.toeArcPoints.map(
                    (point) => [point.x, point.y, 0.64] as [number, number, number],
                )}
                color={TOE_ARC_COLOR}
                lineWidth={5}
                transparent
                opacity={0.72}
            />
            <Line
                points={[
                    [geometry.origin.x, geometry.origin.y, 0.68],
                    [geometry.W.x, geometry.W.y, 0.68],
                ]}
                color={CENTER_COLOR}
                lineWidth={1.8}
                dashed
                dashSize={0.35}
                gapSize={0.2}
                transparent
                opacity={0.8}
            />
            {references.map((reference) => (
                <Line
                    key={`ray-${reference.point.id}`}
                    points={[
                        [geometry.origin.x, geometry.origin.y, 0.68],
                        [reference.point.x, reference.point.y, 0.68],
                    ]}
                    color={REFERENCE_COLOR}
                    lineWidth={1.35}
                    dashed
                    dashSize={0.3}
                    gapSize={0.2}
                    transparent
                    opacity={0.72}
                />
            ))}
            <Marker point={{ ...geometry.origin, id: 'Ms' }} color={ORIGIN_COLOR} />
            <Marker point={geometry.W} color={CENTER_COLOR} />
            {references.map((reference) => (
                <Marker key={reference.point.id} point={reference.point} color={REFERENCE_COLOR} />
            ))}
        </group>
    );
};

export default ToeRadialReferencesLayer;
