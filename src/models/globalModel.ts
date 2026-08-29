import { useMemoizedFn } from 'ahooks';
import { useState } from 'react';

export default () => {
    // 全局消息
    const [error, setError] = useState<any>();
    const [success, setSuccess] = useState<any>();

    const [gender, setGender] = useState<'male' | 'female'>();
    const [category, setCategory] = useState<string>();

    // 清空所有数据，重新开始
    const resetAll = useMemoizedFn(() => {
        setGender(undefined);
        setCategory(undefined);
    });

    return {
        error,
        success,
        gender,
        category,
        setError,
        setSuccess,
        setGender,
        setCategory,
        resetAll,
    };
};
