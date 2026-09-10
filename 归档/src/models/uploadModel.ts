import { parseDxfFile } from '@/services/im2m-golang/dxfServer';
import { useMemoizedFn, useRequest } from 'ahooks';
import { UploadFile } from 'antd';
import { useState } from 'react';
import { useImmer } from 'use-immer';

export default () => {
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    // 加载dxf获取的block信息
    const [blocks, setBlocks] = useImmer<{ blocks: API.DxfInfo[] | undefined }>({
        blocks: undefined,
    });

    const [patternFile, setPatternFile] = useState<any>();

    // 上传dxf file并解析
    const { runAsync: parseDxfFileRun, loading: parseDxfFileLoading } = useRequest(parseDxfFile, {
        manual: true,
    });

    // 清空所有数据，重新开始
    const resetAll = useMemoizedFn(() => {
        setBlocks({ blocks: undefined });
        setPatternFile(undefined);
        setFileList([]);
    });

    return {
        fileList,
        blocks,
        patternFile,
        parseDxfFileLoading,
        parseDxfFileRun,
        setBlocks,
        setFileList,
        setPatternFile,
        resetAll,
    };
};
