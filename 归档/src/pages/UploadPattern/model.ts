import { GolangServerCode } from '@/requestConfig';
import { createPattern } from '@/services/im2m-golang/patterns';
import { ApiType, handleApiError } from '@/utils/errHandler';
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
        };
        msg: {
            s1Msg: string;
            s2Msg: string;
            s3Msg: string;
        };
    }>({
        current: 0,
        status: {
            s1Status: 'process',
            s2Status: 'wait',
            s3Status: 'wait',
        },
        msg: {
            s1Msg: '',
            s2Msg: '',
            s3Msg: '',
        },
    });
    const { setError, setSuccess } = useModel('globalModel', (model) => ({
        setError: model.setError,
        setSuccess: model.setSuccess,
    }));

    // 上传pattern相关数据
    const { run: createPatternRun, loading: createPatternLoading } = useRequest(createPattern, {
        manual: true,
        onSuccess(resp) {
            if (resp && resp.code === GolangServerCode.SUCCESS) {
                const intl = getIntl(getLocale());
                setSuccess(
                    intl.formatMessage({
                        id: 'message.uploadPattern.uploadSuccess',
                    }),
                );
            } else {
                setError('createPattern failed');
            }
        },
        onError(err: any) {
            setError(handleApiError(err, ApiType.CreatePattern));
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
            },
            msg: {
                s1Msg: '',
                s2Msg: '',
                s3Msg: '',
            },
        });
    });

    return {
        openLeftMenu,
        step,
        openRightRefDrawer,
        createPatternLoading,
        setOpenLeftMenu,
        setStep,
        setRightRefDrawer,
        resetAll,
        createPatternRun,
    };
};
