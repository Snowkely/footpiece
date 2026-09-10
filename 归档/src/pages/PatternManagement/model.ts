import { deletePattern, deletePatternByIds, getPatterns } from '@/services/im2m-golang/patterns';
import { useRequest } from 'ahooks';

export default () => {
    // 获取所有pattern信息
    const { runAsync: getPatternsRun } = useRequest(getPatterns, {
        manual: true,
    });

    // 根据id删除pattern
    const { runAsync: deletePatternRun, loading: deletePatternLoading } = useRequest(
        deletePattern,
        {
            manual: true,
        },
    );

    // 根据id批量删除pattern
    const { runAsync: deletePatternsRun, loading: deletePatternsLoading } = useRequest(
        deletePatternByIds,
        {
            manual: true,
        },
    );

    return {
        deletePatternLoading,
        deletePatternsLoading,
        getPatternsRun,
        deletePatternRun,
        deletePatternsRun,
    };
};
