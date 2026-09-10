/* eslint-disable react/no-unknown-property */
import { Html, Line, Sphere } from '@react-three/drei';
import type { AlignedFootPieceGeometry, DraftPoint, FootPieceLandmarkId } from '../types';

interface AlignedFootPieceProps {
    footPiece: AlignedFootPieceGeometry;
    showShrinkedOutline?: boolean;
    showReferenceCurve?: boolean;
    referenceCurveOpacity?: number;
}

const LANDMARK_IDS: FootPieceLandmarkId[] = ['P', 'Q', 'R', 'S'];
const LANDMARK_RADIUS_CM = 0.16;

function closedLinePoints(points: DraftPoint[]): Array<[number, number, number]> {
    if (points.length === 0) {
        return [];
    }

    return [...points, points[0]].map((point) => [point.x, point.y, 0.12]);
}

function linePoints(points: DraftPoint[]): Array<[number, number, number]> {
    return points.map((point) => [point.x, point.y, 0.16]);
}

const AlignedFootPiece: React.FC<AlignedFootPieceProps> = ({
    footPiece,
    showShrinkedOutline = true,
    showReferenceCurve = true,
    referenceCurveOpacity = 1,
}) => {
    return (
        <group>
            {showShrinkedOutline && (
                <Line
                    points={closedLinePoints(footPiece.alignedShrinkedOutline)}
                    color="#ef4444"
                    lineWidth={1.4}
                    transparent
                    opacity={0.3}
                />
            )}
            {showReferenceCurve && (
                <Line
                    points={linePoints(footPiece.alignedRQPS)}
                    color="#dc2626"
                    lineWidth={2.8}
                    transparent
                    opacity={referenceCurveOpacity}
                />
            )}

            {showReferenceCurve &&
                LANDMARK_IDS.map((landmarkId) => {
                    const landmark = footPiece.alignedLandmarks[landmarkId];

                    return (
                        <group key={landmarkId}>
                            <Sphere
                                args={[LANDMARK_RADIUS_CM, 18, 18]}
                                position={[landmark.x, landmark.y, 0.22]}
                            >
                                <meshBasicMaterial color="#d946ef" />
                            </Sphere>
                            <Html
                                position={[
                                    landmark.x + LANDMARK_RADIUS_CM * 1.5,
                                    landmark.y + LANDMARK_RADIUS_CM * 1.5,
                                    0.25,
                                ]}
                                zIndexRange={[2, 0]}
                            >
                                <span className="foot-drafting-foot-piece-label">{landmarkId}</span>
                            </Html>
                        </group>
                    );
                })}
        </group>
    );
};

export default AlignedFootPiece;
