import { login } from '@/services/im2m-golang/accounts';
import { useRequest } from 'ahooks';

export default () => {
    // login
    const { runAsync: loginRun, loading: loginLoading } = useRequest(login, {
        manual: true,
    });

    return {
        loginLoading,
        loginRun,
    };
};
