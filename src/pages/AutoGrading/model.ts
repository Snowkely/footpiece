import { getCustomers } from '@/services/im2m-golang/customers';
import { downloadWithInfo } from '@/services/im2m-golang/dxfServer';
import { getPatterns } from '@/services/im2m-golang/patterns';
import { ApiType, handleApiError } from '@/utils/errHandler';
import { downloadFile } from '@/utils/utils';
import { getIntl, getLocale, useModel } from '@umijs/max';
import { useMemoizedFn, useRequest } from 'ahooks';
import { useState } from 'react';

export default () => {
    const [openLeftMenu, setOpenLeftMenu] = useState(false);
    const [openRightRefDrawer, setRightRefDrawer] = useState(false);
    // 左菜单的步骤信息
    const [step, setStep] = useState<{
        current: number;
        status: {
            s1Status: 'wait' | 'process' | 'finish' | 'error';
            s2Status: 'wait' | 'process' | 'finish' | 'error';
            s3Status: 'wait' | 'process' | 'finish' | 'error';
            s4Status: 'wait' | 'process' | 'finish' | 'error';
        };
        msg: {
            s1Msg: string;
            s2Msg: string;
            s3Msg: string;
            s4Msg: string;
        };
    }>({
        current: 0,
        status: {
            s1Status: 'process',
            s2Status: 'wait',
            s3Status: 'wait',
            s4Status: 'wait',
        },
        msg: {
            s1Msg: '',
            s2Msg: '',
            s3Msg: '',
            s4Msg: '',
        },
    });

    // base size的数据
    const [customerSize, setCustomerSize] = useState<API.CustomerSize>();
    const [customerId, setCustomerId] = useState<string>();
    const [customerName, setCustomerName] = useState<string>();
    const [patternId, setPatternId] = useState<string>();
    const [bustChestShape, setBustChestShape] = useState<string>();
    const [bellyShape, setBellyShape] = useState<string>();
    const [shoulderShape, setShoulderShape] = useState<string>();

    const { setError, setSuccess } = useModel('globalModel', (model) => ({
        setError: model.setError,
        setSuccess: model.setSuccess,
    }));

    // 获取所有customers信息
    const { runAsync: getCustomersRun } = useRequest(getCustomers, {
        manual: true,
    });

    // 获取所有patterns信息
    const { runAsync: getPatternsRun } = useRequest(getPatterns, {
        manual: true,
    });

    // 下载生成的dxf文件
    const { run: download, loading: downloadLoading } = useRequest(downloadWithInfo, {
        manual: true,
        onSuccess(resp) {
            if (resp) {
                downloadFile(resp);
                setSuccess(
                    getIntl(getLocale()).formatMessage({ id: 'message.api.downloadSuccess' }),
                );
            } else {
                setError('download failed');
            }
        },
        onError(err: any) {
            setError(handleApiError(err, ApiType.DownloadWithInfo));
        },
    });

    // 清空所有数据，重新开始
    const resetAll = useMemoizedFn(() => {
        setStep({
            current: 0,
            status: {
                s1Status: 'process',
                s2Status: 'wait',
                s3Status: 'wait',
                s4Status: 'wait',
            },
            msg: {
                s1Msg: '',
                s2Msg: '',
                s3Msg: '',
                s4Msg: '',
            },
        });
        setCustomerSize(undefined);
        setCustomerId(undefined);
        setCustomerName(undefined);
    });

    return {
        openLeftMenu,
        step,
        openRightRefDrawer,
        customerSize,
        customerId,
        customerName,
        patternId,
        downloadLoading,
        bustChestShape,
        bellyShape,
        shoulderShape,
        setOpenLeftMenu,
        setStep,
        setRightRefDrawer,
        resetAll,
        setCustomerSize,
        setCustomerId,
        setCustomerName,
        getCustomersRun,
        getPatternsRun,
        setPatternId,
        download,
        setBustChestShape,
        setBellyShape,
        setShoulderShape,
    };
};
