import { GolangServerCode } from '@/requestConfig';
import { getDummies } from '@/services/im2m-golang/dummies';
import { createPattern } from '@/services/im2m-golang/patterns';
import { ApiType, handleApiError } from '@/utils/errHandler';
import { getIntl, getLocale, useModel } from '@umijs/max';
import { useMemoizedFn, useRequest } from 'ahooks';
import { useState } from 'react';

export default () => {
    const [patternName, setPatternName] = useState<string>();
    // base size的数据
    const [dummySize, setDummySize] = useState<API.DummySize>();
    const [dummyId, setDummyId] = useState<string>();
    const [patternSize, setPatternSize] = useState<API.PatternSize>();
    const [dummyName, setDummyName] = useState<string>();

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

    // 获取所有dummy信息
    const { runAsync: getDummiesRun } = useRequest(getDummies, {
        manual: true,
    });

    // 清空所有数据，重新开始
    const resetAll = useMemoizedFn(() => {
        setDummySize(undefined);
        setDummyId(undefined);
        setPatternSize(undefined);
        setPatternName(undefined);
        setDummyName(undefined);
    });

    return {
        createPatternLoading,
        patternName,
        dummySize,
        patternSize,
        dummyName,
        dummyId,
        resetAll,
        createPatternRun,
        setPatternName,
        setDummySize,
        setPatternSize,
        setDummyName,
        getDummiesRun,
        setDummyId,
    };
};
