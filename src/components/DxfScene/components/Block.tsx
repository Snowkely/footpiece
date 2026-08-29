/* eslint-disable react/no-unknown-property */
import { animated, useSpring } from '@react-spring/three';
import { Line, Shape } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useGesture } from '@use-gesture/react';
import * as THREE from 'three';
import CirclePoint from './CirclePoint';

interface Props {
    block: API.DxfInfo;
    onWarning: (msg: string) => void;
    materialColor: string;
    lineColor: string;
    pointColor: string;
    materialOpacity: number;
    lineOpacity: number;
    pointOpacity: number;
    pointSize: number;
    alwaysShowPoint: boolean; // 永远不隐藏点
    canDrag: boolean;
    needAddPoint: boolean; // 是否需要添加点，因为generate出来的点会自动添加使版型连贯
    hovered: boolean;
}

const BlockGroup: React.FC<Props> = ({ ...props }: any) => {
    const { block } = props;

    return (
        <group>
            {block.entities?.map((entity: API.DxfEntity, index: number) => {
                const points: { position: THREE.Vector3; gradingPoint?: string }[] = [];
                // 版型面片
                const shape = new THREE.Shape();
                if (entity.points && entity.points.length !== 0) {
                    if (entity.points[0].x !== undefined && entity.points[0].y !== undefined) {
                        shape.moveTo(entity.points[0].x, entity.points[0].y);
                    }
                }
                entity.points?.forEach((p: API.Point) => {
                    points.push({
                        position: new THREE.Vector3(p.x, p.y, 1),
                        gradingPoint: p.gradingPoint,
                    });
                    if (p.x !== undefined && p.y !== undefined) {
                        shape.lineTo(p.x, p.y);
                    }
                });
                const linePoints = points.map((p) => p.position);
                if (props.needAddPoint) {
                    linePoints.push(points[0].position);
                }

                return (
                    <group key={index}>
                        <Shape args={[shape]} position={[0, 0, 0]}>
                            <meshBasicMaterial
                                color={props.materialColor}
                                opacity={props.materialOpacity}
                                transparent={true}
                            />
                        </Shape>
                        <Line
                            points={linePoints}
                            color={props.lineColor}
                            lineWidth={2}
                            dashed={false}
                            transparent={true}
                            opacity={props.lineOpacity}
                        />
                        <group>
                            {points.map((p, index) => (
                                <CirclePoint
                                    key={index}
                                    position={p.position}
                                    radius={props.pointSize}
                                    color={props.pointColor}
                                    parentHovered={props.hovered}
                                    onWarning={props.onWarning}
                                    pointObj={entity.points?.[index]}
                                    blockName={block.name}
                                    entityType={entity.entityType}
                                    opacity={props.pointOpacity}
                                    alwaysShowPoint={props.alwaysShowPoint}
                                />
                            ))}
                        </group>
                    </group>
                );
            })}
        </group>
    );
};

const Block: React.FC<Props> = (props) => {
    const { size, viewport } = useThree();
    const aspect = size.width / viewport.width;
    const [spring, set] = useSpring(() => ({
        scale: [1, 1, 1],
        position: [0, 0, 0],
        rotation: [0, 0, 0],
    }));
    const bind = useGesture({
        onDrag: ({ event, offset: [x, y] }) => {
            event.stopPropagation();
            return set({ position: [x / aspect, -y / aspect, 0] });
        },
    });

    const groups = (
        <>
            {props.canDrag ? (
                <animated.mesh {...spring} {...bind()} scale={1} castShadow>
                    <BlockGroup {...props} />
                </animated.mesh>
            ) : (
                <BlockGroup {...props} />
            )}
        </>
    );

    return groups;
};
export default Block;
