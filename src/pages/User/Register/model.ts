import { ROUTE_REGISTER } from '@/constants/routes';
import { GolangServerCode } from '@/requestConfig';
import { createUserAuth } from '@/services/im2m-golang/accounts';
import { createUser } from '@/services/im2m-golang/users';
import { ApiType, handleApiError } from '@/utils/errHandler';
import { history, useModel } from '@umijs/max';
import { useRequest } from 'ahooks';

export enum RigisterPageType {
    Register = 'register',
    Success = 'success',
    NotVerified = 'notVerified',
}

export default () => {
    const { setError } = useModel('globalModel', (model) => ({
        setError: model.setError,
    }));

    // createUser
    const { run: createUserRun, loading: createUserLoading } = useRequest(createUser, {
        manual: true,
        onSuccess(resp) {
            if (resp && resp.code === GolangServerCode.SUCCESS && resp.data) {
                history.push(`${ROUTE_REGISTER}#${RigisterPageType.Success}`);
            } else {
                setError('createUser failed');
            }
        },
        onError(err: any) {
            setError(handleApiError(err, ApiType.CreateUser));
        },
    });

    // register
    const { run: register, loading: registerLoading } = useRequest(createUserAuth, {
        manual: true,
        onSuccess(resp, params) {
            if (resp && resp.code === GolangServerCode.SUCCESS && resp.data) {
                createUserRun({
                    authId: resp.data.authId,
                    firstName: params[1]?.username,
                    lastName: params[1]?.username,
                });
            } else {
                setError('register failed');
            }
        },
        onError(err: any) {
            if (err.info && err.info.code === GolangServerCode.EMAIL_NOT_VERIFIED) {
                history.push(`${ROUTE_REGISTER}#${RigisterPageType.NotVerified}`);
            } else {
                setError(handleApiError(err, ApiType.Register));
            }
        },
    });

    return {
        registerLoading,
        createUserLoading,
        register,
        createUserRun,
    };
};
