import { downloadDxfFile } from '@/services/im2m-golang/dxfServer';
import {
    deleteDownloadHistory,
    deleteDownloadHistoryByIds,
    getDownloadHistories,
} from '@/services/im2m-golang/histories';
import { ApiType, handleApiError } from '@/utils/errHandler';
import { downloadFile } from '@/utils/utils';
import { getIntl, getLocale, useModel } from '@umijs/max';
import { useRequest } from 'ahooks';

export default () => {
    const { setError, setSuccess } = useModel('globalModel', (model) => ({
        setError: model.setError,
        setSuccess: model.setSuccess,
    }));

    // 获取最近几个月的下载记录
    const { runAsync: getDownloadHistoriesRun } = useRequest(getDownloadHistories, {
        manual: true,
    });

    // 根据id删除pattern
    const { runAsync: deleteDownloadHistoryRun, loading: deleteDownloadHistoryLoading } =
        useRequest(deleteDownloadHistory, {
            manual: true,
        });

    // 根据id批量删除pattern
    const { runAsync: deleteHistoriesRun, loading: deleteHistoriesLoading } = useRequest(
        deleteDownloadHistoryByIds,
        {
            manual: true,
        },
    );

    // 下载生成的dxf文件
    const { run: downloadDxfFileRun, loading: downloadDxfFileLoading } = useRequest(
        downloadDxfFile,
        {
            manual: true,
            onSuccess(resp) {
                if (resp) {
                    downloadFile(resp);
                    setSuccess(
                        getIntl(getLocale()).formatMessage({ id: 'message.api.downloadSuccess' }),
                    );
                } else {
                    setError('downloadDxfFile failed');
                }
            },
            onError(err: any) {
                setError(handleApiError(err, ApiType.DownloadDxfFile));
            },
        },
    );

    return {
        deleteDownloadHistoryLoading,
        deleteHistoriesLoading,
        downloadDxfFileLoading,
        getDownloadHistoriesRun,
        deleteDownloadHistoryRun,
        deleteHistoriesRun,
        downloadDxfFileRun,
    };
};
