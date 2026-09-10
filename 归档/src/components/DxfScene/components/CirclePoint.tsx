import { SelectedPointInfo } from '@/constants/patterns';
import { Html, Sphere } from '@react-three/drei';
import { useModel } from '@umijs/max';
import { useMemoizedFn, useUpdateEffect } from 'ahooks';
import { Tag } from 'antd';
import { useState } from 'react';
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
}

const CirclePoint: React.FC<SpherePointProps> = (props) => {
    const [hovered, setHover] = useState(false);
    const [clicked, setClicked] = useState(false);
    const {
        startPick,
        selectedPointInfo,
        removeRefPointInfo,
        selectedPoints,
        setSelectedRefPointInfo,
        updateSelectedRefPoints,
    } = useModel('selectPointsDrawerModel', (model) => ({
        startPick: model.startPick,
        selectedPointInfo: model.selectedPointInfo,
        removeRefPointInfo: model.removeRefPointInfo,
        selectedPoints: model.selectedPoints,
        setSelectedRefPointInfo: model.setSelectedRefPointInfo,
        updateSelectedRefPoints: model.updateSelectedRefPoints,
    }));
    const [pointInfo, setPointInfo] = useState<SelectedPointInfo>(); // 是否已经给该点命名，如果已经命名，需要先取消才可以重新选取

    useUpdateEffect(() => {
        // 防止同时有两个点被同一个grading point选择
        if (
            pointInfo &&
            pointInfo?.key === selectedPointInfo?.key &&
            selectedPointInfo?.pointObj &&
            (pointInfo?.pointObj?.x !== selectedPointInfo?.pointObj?.x ||
                pointInfo?.pointObj?.y !== selectedPointInfo?.pointObj?.y)
        ) {
            setPointInfo(undefined);
            setClicked(false);
        }
    }, [selectedPointInfo]);

    useUpdateEffect(() => {
        // 直接移除该点
        if (pointInfo && pointInfo?.key === removeRefPointInfo?.key) {
            setPointInfo(undefined);
            setClicked(false);
        }
    }, [removeRefPointInfo]);

    useUpdateEffect(() => {
        // reset移除所有点
        if (!selectedPoints.find((p) => p !== undefined)) {
            setPointInfo(undefined);
            setClicked(false);
        }
    }, [selectedPoints]);

    const onClick = useMemoizedFn((e) => {
        e.stopPropagation();
        if (pointInfo?.key && pointInfo?.key === selectedPointInfo?.key) {
            props.onWarning('This point has been selected');
            return;
        }
        if (selectedPointInfo?.picking) {
            const ptInfo = {
                ...selectedPointInfo,
                blockName: props.blockName,
                entityType: props.entityType,
                pointObj: props.pointObj,
                picking: false,
            };
            // 本组件内保存info
            setPointInfo(ptInfo);
            setClicked(true);
            // 同时将全局info更新
            updateSelectedRefPoints(ptInfo);
            setSelectedRefPointInfo(ptInfo);
        }
    });

    return (
        <group>
            {!props.parentHovered && pointInfo && startPick && (
                <group>
                    <Html
                        zIndexRange={[0, 0]}
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
                onClick={onClick}
                visible={
                    props.alwaysShowPoint ||
                    ((props.parentHovered || pointInfo !== undefined) && startPick)
                }
            >
                <meshBasicMaterial
                    color={clicked && pointInfo ? 'hotpink' : hovered ? 'red' : props.color}
                    opacity={props.opacity}
                    // eslint-disable-next-line react/no-unknown-property
                    transparent={true}
                />
            </Sphere>
        </group>
    );
};

export default CirclePoint;
