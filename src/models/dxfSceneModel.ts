import { GolangServerCode } from '@/requestConfig';
import { generateDxf, generateDxfFile } from '@/services/im2m-golang/dxfServer';
import { ApiType, handleApiError } from '@/utils/errHandler';
import { useModel } from '@umijs/max';
import { useMemoizedFn, useRequest } from 'ahooks';
import { useState } from 'react';

export default () => {
    const [generatedBlocks, setGeneratedBlocks] = useState<API.DxfInfo[] | undefined>();
    const [downloadReq, setDownloadReq] = useState<Record<string, any>>(); // 生成dxf文件后进行下载需要的参数

    const { setError } = useModel('globalModel', (model) => ({
        setError: model.setError,
    }));

    // 上传数据（使用已保存的dxf数据）进行autograding
    const { run: generateDxfRun, loading: generateDxfLoading } = useRequest(generateDxf, {
        manual: true,
        onSuccess(resp) {
            if (resp && resp.code === GolangServerCode.SUCCESS && resp.data && resp.data.dxfData) {
                setGeneratedBlocks(resp.data.dxfData.dxfInfoList);
                setDownloadReq({
                    patternId: resp.data.patternId,
                    dummyId: resp.data.dummyId,
                    customerId: resp.data.customerId,
                    cosKey: resp.data.dxfData.cosKey,
                });
            } else {
                setError('generateDxf failed');
            }
        },
        onError(err: any) {
            setError(handleApiError(err, ApiType.GenerateDxf));
        },
    });

    // 上传数据（包括保存dxf file）进行autograding
    const { run: generateDxfFileRun, loading: generateDxfFileLoading } = useRequest(
        generateDxfFile,
        {
            manual: true,
            onSuccess(resp) {
                if (
                    resp &&
                    resp.code === GolangServerCode.SUCCESS &&
                    resp.data &&
                    resp.data.dxfData
                ) {
                    setGeneratedBlocks(resp.data.dxfData.dxfInfoList);
                    setDownloadReq({
                        patternId: resp.data.patternId,
                        dummyId: resp.data.dummyId,
                        customerId: resp.data.customerId,
                        cosKey: resp.data.dxfData.cosKey,
                    });
                } else {
                    setError('generateDxfFile failed');
                }
            },
            onError(err: any) {
                setError(handleApiError(err, ApiType.GenerateDxfFile));
            },
        },
    );

    // 清空所有数据，重新开始
    const resetAll = useMemoizedFn(() => {
        setGeneratedBlocks(undefined);
        setDownloadReq(undefined);
    });

    return {
        generateDxfLoading,
        generatedBlocks,
        generateDxfFileLoading,
        downloadReq,
        generateDxfRun,
        resetAll,
        generateDxfFileRun,
    };
};
