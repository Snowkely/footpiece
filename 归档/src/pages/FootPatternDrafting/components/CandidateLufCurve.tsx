/* eslint-disable react/no-unknown-property */
import { Html, Line, Sphere } from '@react-three/drei';
import type { DraftPoint, LufCurveGeometry } from '../types';

const CURVE_COLOR = '#16a34a';
const F_COLOR = '#f59e0b';
const MARKER_RADIUS_CM = 0.17;

interface CandidateLufCurveProps {
    curve: LufCurveGeometry;
    showCurve: boolean;
    showReferencePoints: boolean;
    showConstructionLines: boolean;
}

interface MarkerProps {
    point: DraftPoint;
    color: string;
}

function linePoints(points: DraftPoint[], z: number): Array<[number, number, number]> {
    return points.map((point) => [point.x, point.y, z]);
}

const Marker: React.FC<MarkerProps> = ({ point, color }) => (
    <group>
        <Sphere args={[MARKER_RADIUS_CM, 18, 18]} position={[point.x, point.y, 0.38]}>
            <meshBasicMaterial color={color} />
        </Sphere>
        <Html
            position={[point.x + MARKER_RADIUS_CM * 1.5, point.y + MARKER_RADIUS_CM * 1.5, 0.42]}
            zIndexRange={[3, 0]}
        >
            <span className="foot-drafting-luf-label">{point.id}</span>
        </Html>
    </group>
);

const CandidateLufCurve: React.FC<CandidateLufCurveProps> = ({
    curve,
    showCurve,
    showReferencePoints,
    showConstructionLines,
}) => {
    return (
        <group>
            {showConstructionLines && (
                <>
                    <Line
                        points={linePoints([curve.U, curve.T], 0.28)}
                        color="#0f766e"
                        lineWidth={1.2}
                        dashed
                        dashSize={0.25}
                        gapSize={0.18}
                        transparent
                        opacity={0.7}
                    />
                    <Line
                        points={linePoints([curve.F, curve.FPrime], 0.28)}
                        color={F_COLOR}
                        lineWidth={1.2}
                        dashed
                        dashSize={0.2}
                        gapSize={0.14}
                        transparent
                        opacity={0.8}
                    />
                </>
            )}

            {showCurve && (
                <>
                    <Line
                        points={linePoints(curve.sampledCurve, 0.32)}
                        color={CURVE_COLOR}
                        lineWidth={3}
                        transparent
                        opacity={1}
                    />
                    <Marker point={curve.U} color={CURVE_COLOR} />
                    <Marker point={curve.T} color={CURVE_COLOR} />
                </>
            )}

            {showReferencePoints && <Marker point={curve.FPrime} color={CURVE_COLOR} />}
        </group>
    );
};

export default CandidateLufCurve;
