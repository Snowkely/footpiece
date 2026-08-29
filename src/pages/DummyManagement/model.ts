import { GolangServerCode } from '@/requestConfig';
import { createDummy, deleteDummy, getDummies } from '@/services/im2m-golang/dummies';
import { ApiType, handleApiError } from '@/utils/errHandler';
import { getIntl, getLocale, useModel } from '@umijs/max';
import { useRequest } from 'ahooks';
import { useState } from 'react';

export default () => {
    const [dummies, setDummies] = useState<API.Dummy[]>();
    const [newDummy, setNewDummy] = useState<API.Dummy>();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const { setError, setSuccess } = useModel('globalModel', (model) => ({
        setError: model.setError,
        setSuccess: model.setSuccess,
    }));

    // 获取所有dummy信息
    const { run: getDummiesRun, loading: getDummiesLoading } = useRequest(getDummies, {
        manual: true,
        onSuccess(resp) {
            if (resp && resp.code === GolangServerCode.SUCCESS && resp.data) {
                setDummies(resp.data.dummies);
            } else {
                setError('getDummies failed');
            }
        },
        onError(err) {
            setError(handleApiError(err, ApiType.GetDummies));
        },
    });

    // 根据id删除dummy
    const { runAsync: deleteDummyRun, loading: deleteDummyLoading } = useRequest(deleteDummy, {
        manual: true,
    });

    // 创建dummy
    const { run: createDummyRun, loading: createDummyLoading } = useRequest(createDummy, {
        manual: true,
        onSuccess(resp) {
            if (resp && resp.code === GolangServerCode.SUCCESS && resp.data) {
                setNewDummy(resp.data);
                setIsDrawerOpen(false);
                setSuccess(getIntl(getLocale()).formatMessage({ id: 'message.saveSuccess' }));
            } else {
                setError('createDummy failed');
            }
        },
        onError(err) {
            setError(handleApiError(err, ApiType.CreateDummy));
        },
    });

    return {
        deleteDummyLoading,
        getDummiesLoading,
        createDummyLoading,
        dummies,
        newDummy,
        isDrawerOpen,
        getDummiesRun,
        deleteDummyRun,
        createDummyRun,
        setIsDrawerOpen,
    };
};
