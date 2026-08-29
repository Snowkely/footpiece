import { GradingPoints, SelectedPointInfo } from '@/constants/patterns';
import { useModel } from '@umijs/max';
import { useMemoizedFn } from 'ahooks';
import { useState } from 'react';
import { useImmer } from 'use-immer';

export default () => {
    const [startPick, setStartPick] = useState(false);
    const [selectedPointInfo, setSelectedRefPointInfo] = useState<SelectedPointInfo>();
    // * 8 是指在最多的情况下有八个片（jacket）
    const [selectedPoints, setSelectedRefPoints] = useImmer<(SelectedPointInfo | undefined)[]>(
        new Array(GradingPoints.length * 8).fill(undefined),
    );
    const [removeRefPointInfo, setRemoveRefPointInfo] = useState<SelectedPointInfo>();

    const { setBlocks } = useModel('uploadModel', (model) => ({
        setBlocks: model.setBlocks,
    }));

    // 保存dxf中的已被选择的点的信息，以便之后服务器返回偏移量的时候可以进行修改
    const updateBlocks = useMemoizedFn(() => {
        setBlocks((blocks: { blocks: API.DxfInfo[] | undefined }) => {
            selectedPoints.forEach((selectedPoint) => {
                const b = blocks.blocks?.find((block: any) => {
                    return block.name.toLowerCase() === selectedPoint?.blockName?.toLowerCase();
                });
                const ets = b?.entities?.filter((ent) => {
                    return (
                        ent.entityType?.toLowerCase() === selectedPoint?.entityType?.toLowerCase()
                    );
                });
                ets?.forEach((entity) => {
                    const point = entity.points?.find(
                        (p) =>
                            p.x?.toFixed(4) === selectedPoint?.pointObj?.x?.toFixed(4) &&
                            p.y?.toFixed(4) === selectedPoint?.pointObj?.y?.toFixed(4),
                    );
                    if (point) {
                        point.selected = true;
                        point.refName = selectedPoint?.key;
                        point.gradingPoint = selectedPoint?.gradingPoint;
                        point.patternPart = selectedPoint?.patternPart;
                        point.orderNum = selectedPoint?.orderNum;
                        point.gradingPointName = selectedPoint?.name;
                    }
                });
            });
        });
    });

    const updateSelectedRefPoints = useMemoizedFn((selectedPointInfo: SelectedPointInfo) => {
        setSelectedRefPoints((points) => {
            if (selectedPointInfo.orderNum !== undefined) {
                const removeIndex = points.findIndex(
                    (p) =>
                        selectedPointInfo?.pointObj &&
                        p?.pointObj?.x === selectedPointInfo?.pointObj?.x &&
                        p?.pointObj?.y === selectedPointInfo?.pointObj?.y,
                );
                if (removeIndex !== -1) {
                    points[removeIndex] = undefined;
                }
                points[selectedPointInfo.orderNum] = selectedPointInfo;
            }
            return points;
        });
    });

    const clearSelectedRefPoints = useMemoizedFn(() => {
        // * 8 是指在最多的情况下有八个片（jacket）
        setSelectedRefPoints(() => new Array(GradingPoints.length * 8).fill(undefined));
    });

    const removeSelectedRefPoints = useMemoizedFn(
        (selectedPointInfo: SelectedPointInfo | undefined) => {
            setSelectedRefPoints((points) => {
                const removeIndex = points.findIndex((p) => p?.key === selectedPointInfo?.key);
                if (removeIndex !== -1) {
                    points[removeIndex] = undefined;
                }
                return points;
            });
        },
    );

    // 清空所有数据，重新开始
    const resetAll = useMemoizedFn(() => {
        setStartPick(false);
        setSelectedRefPointInfo(undefined);
        // * 8 是指在最多的情况下有八个片（jacket）
        setSelectedRefPoints(() => new Array(GradingPoints.length * 8).fill(undefined));
        setRemoveRefPointInfo(undefined);
    });

    return {
        startPick,
        selectedPointInfo,
        selectedPoints,
        removeRefPointInfo,
        setStartPick,
        resetAll,
        updateBlocks,
        setSelectedRefPointInfo,
        setSelectedRefPoints,
        updateSelectedRefPoints,
        removeSelectedRefPoints,
        setRemoveRefPointInfo,
        clearSelectedRefPoints,
    };
};
