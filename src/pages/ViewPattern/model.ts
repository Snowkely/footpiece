import { GradingPoints, SelectedPointInfo } from '@/constants/patterns';
import { GolangServerCode } from '@/requestConfig';
import { getDummy } from '@/services/im2m-golang/dummies';
import { getPattern } from '@/services/im2m-golang/patterns';
import { ApiType, handleApiError } from '@/utils/errHandler';
import { useModel } from '@umijs/max';
import { useMemoizedFn, useRequest } from 'ahooks';
import { useState } from 'react';
import { useImmer } from 'use-immer';

export default () => {
    // 加载dxf获取的block信息
    const [blocks, setBlocks] = useImmer<{ blocks: API.DxfInfo[] | undefined }>({
        blocks: undefined,
    });
    // * 8 是指在最多的情况下有八个片（jacket）
    const [selectedPoints, setSelectedRefPoints] = useImmer<(SelectedPointInfo | undefined)[]>(
        new Array(GradingPoints.length * 8).fill(undefined),
    );
    const [patternName, setPatternName] = useState<string>();
    const [patternCategory, setPatternCategory] = useState<string>();
    const [patternGender, setPatternGender] = useState<string>();
    const [dummyId, setDummyId] = useState<string>();
    const [patternSize, setPatternSize] = useState<API.PatternSize>();

    const [openRightRefDrawer, setRightRefDrawer] = useState(false);

    const { setError } = useModel('globalModel', (model) => ({
        setError: model.setError,
    }));

    const retriveRefPoints = useMemoizedFn((dxfInfo: API.DxfInfo[]) => {
        const refPoints: SelectedPointInfo[] = [];
        dxfInfo.forEach((block) => {
            block.entities?.forEach((entity) => {
                entity.points?.forEach((point) => {
                    refPoints.push({
                        key: point.refName || '',
                        name: point.gradingPointName || '',
                        gradingPoint: point.gradingPoint || '',
                        picking: false,
                        blockName: block.name,
                        entityType: entity.entityType,
                        patternPart: point.patternPart,
                        pointObj: point,
                        orderNum: point.orderNum,
                    });
                });
            });
        });
        setSelectedRefPoints(refPoints);
    });

    // 获取pattern
    const { run: getPatternRun, loading: getPatternLoading } = useRequest(getPattern, {
        manual: true,
        onSuccess(resp) {
            if (
                resp &&
                resp.code === GolangServerCode.SUCCESS &&
                resp.data &&
                resp.data.dxfInfo &&
                resp.data.patternSize
            ) {
                const dxfInfo = JSON.parse(resp.data.dxfInfo);
                setBlocks({ blocks: dxfInfo });
                retriveRefPoints(dxfInfo);
                setPatternSize(JSON.parse(resp.data.patternSize));
                setPatternName(resp.data.name);
                setPatternCategory(resp.data.category);
                setPatternGender(resp.data.gender);
                setDummyId(resp.data.idDummy);
            } else {
                setError('getPattern failed');
            }
        },
        onError(err) {
            setError(handleApiError(err, ApiType.LoadPattern));
        },
    });

    // 获取dummy信息
    const { runAsync: getDummyRun, loading: getDummyLoading } = useRequest(getDummy, {
        manual: true,
    });

    // 清空所有数据，重新开始
    const resetAll = useMemoizedFn(() => {
        setBlocks({ blocks: undefined });
        setDummyId(undefined);
        setPatternSize(undefined);
        setPatternName(undefined);
        setPatternCategory(undefined);
        setPatternGender(undefined);
        // * 8 是指在最多的情况下有八个片（jacket）
        setSelectedRefPoints(() => new Array(GradingPoints.length * 8).fill(undefined));
        setRightRefDrawer(false);
    });

    return {
        getPatternLoading,
        blocks,
        selectedPoints,
        patternName,
        patternCategory,
        patternSize,
        dummyId,
        getDummyLoading,
        openRightRefDrawer,
        patternGender,
        setBlocks,
        setSelectedRefPoints,
        setPatternName,
        setPatternCategory,
        setPatternSize,
        getDummyRun,
        setDummyId,
        getPatternRun,
        setRightRefDrawer,
        resetAll,
    };
};
