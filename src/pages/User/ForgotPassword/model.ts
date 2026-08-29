import { ROUTE_FORGOT_PSW } from '@/constants/routes';
import { GolangServerCode } from '@/requestConfig';
import { passwordForgot } from '@/services/im2m-golang/accounts';
import { ApiType, handleApiError } from '@/utils/errHandler';
import { history, useModel } from '@umijs/max';
import { useRequest } from 'ahooks';

export enum ForgotPasswordPageType {
    ForgotPassword = 'forgotPassword',
    Success = 'success',
}

export default () => {
    const { setError } = useModel('globalModel', (model) => ({
        setError: model.setError,
    }));

    // send email for reseting password
    const { run: passwordForgotRun, loading: passwordForgotLoading } = useRequest(passwordForgot, {
        manual: true,
        onSuccess(resp) {
            if (resp && resp.code === GolangServerCode.SUCCESS) {
                history.push(`${ROUTE_FORGOT_PSW}#${ForgotPasswordPageType.Success}`);
            } else {
                setError('passwordForgot failed');
            }
        },
        onError(err: any) {
            setError(handleApiError(err, ApiType.PasswordForgot));
        },
    });

    return {
        passwordForgotLoading,
        passwordForgotRun,
    };
};
