import { SelectedPointInfo } from '@/constants/patterns';
import { Html, Sphere } from '@react-three/drei';
import { useModel } from '@umijs/max';
import { Tag } from 'antd';
import { useEffect, useState } from 'react';
import { Vector3 } from 'three';

interface SpherePointProps {
    position: Vector3;
    color: string;
    radius: number;
    parentHovered: boolean;
    pointObj: API.Point | undefined; // 与服务器通信的数据结构
    blockName?: string;
    entityType?: string;
    onWarning: (msg: string) => void;
    opacity: number;
    alwaysShowPoint: boolean;
    refName?: string;
}

const CirclePoint: React.FC<SpherePointProps> = (props) => {
    const [hovered, setHover] = useState(false);
    const { openRightRefDrawer, selectedPoints } = useModel('ViewPattern.model', (model) => ({
        openRightRefDrawer: model.openRightRefDrawer,
        selectedPoints: model.selectedPoints,
    }));
    const [pointInfo, setPointInfo] = useState<SelectedPointInfo>(); // 是否已经给该点命名，如果已经命名，需要先取消才可以重新选取

    useEffect(() => {
        if (openRightRefDrawer) {
            if (selectedPoints) {
                setPointInfo(selectedPoints.find((p) => p?.key === props.refName));
            }
        } else {
            setPointInfo(undefined);
        }
        return () => {
            setPointInfo(undefined);
        };
    }, [openRightRefDrawer]);

    return (
        <group>
            {!props.parentHovered && pointInfo && (
                <group>
                    <Html
                        rotation={[0, Math.PI / 2, 0]}
                        position={[
                            props.position.x + props.radius,
                            props.position.y + props.radius,
                            0,
                        ]}
                    >
                        <Tag color="orange">{pointInfo.name}</Tag>
                    </Html>
                </group>
            )}
            <Sphere
                args={[props.radius]}
                position={props.position}
                onPointerOver={() => {
                    setHover(true);
                }}
                onPointerOut={() => {
                    setHover(false);
                }}
                visible={props.alwaysShowPoint || props.parentHovered || pointInfo !== undefined}
            >
                <meshBasicMaterial
                    color={pointInfo ? 'hotpink' : hovered ? 'red' : props.color}
                    opacity={props.opacity}
                    // eslint-disable-next-line react/no-unknown-property
                    transparent={true}
                />
            </Sphere>
        </group>
    );
};

export default CirclePoint;
