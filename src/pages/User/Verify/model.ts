import { ROUTE_RESET_PSW, ROUTE_VERIFY_EMAIL } from '@/constants/routes';
import { GolangServerCode } from '@/requestConfig';
import {
    passwordJwtValid,
    passwordRecoverJwt,
    verifyEmailJwt,
} from '@/services/im2m-golang/accounts';
import { ApiType, handleApiError } from '@/utils/errHandler';
import { history, useModel } from '@umijs/max';
import { useRequest } from 'ahooks';

export enum VeirfyEmailPageType {
    Loading = 'loading', // 初始页面
    Success = 'success', // 邮箱验证成功
    Verified = 'verified', // 邮箱已验证过
    InvalidToken = 'invalidToken', // 验证邮箱的token无效
    Error = 'error', // 发生错误
}

export enum VeirfyPswPageType {
    Loading = 'loading', // 初始页面
    Reset = 'reset', // 重置密码页面
    Success = 'success', // 重置密码成功
    NotFound = 'notFound', // 未找到该用户
    InvalidToken = 'invalidToken', // 重置密码的token无效
    Error = 'error', // 发生错误
}

export default () => {
    const { setError } = useModel('globalModel', (model) => ({
        setError: model.setError,
    }));

    // verifyEmail
    const { run: verifyEmail, loading: verifyEmailLoading } = useRequest(verifyEmailJwt, {
        manual: true,
        onSuccess(resp) {
            if (resp && resp.code === GolangServerCode.SUCCESS) {
                history.push(`${ROUTE_VERIFY_EMAIL}#${VeirfyEmailPageType.Success}`);
            } else {
                setError('verifyEmail failed');
                history.push(`${ROUTE_VERIFY_EMAIL}#${VeirfyEmailPageType.Error}`);
            }
        },
        onError(err: any) {
            if (err.info && err.info.code === GolangServerCode.EMAIL_VERIFIED) {
                history.push(`${ROUTE_VERIFY_EMAIL}#${VeirfyEmailPageType.Verified}`);
            } else if (err.info && err.info.code === GolangServerCode.INVALID_VERIFY_TOKEN) {
                history.push(`${ROUTE_VERIFY_EMAIL}#${VeirfyEmailPageType.InvalidToken}`);
            } else {
                setError(handleApiError(err, ApiType.VerifyEmail));
                history.push(`${ROUTE_VERIFY_EMAIL}#${VeirfyEmailPageType.Error}`);
            }
        },
    });

    // 先验证token是否有效
    const { run: passwordJwtValidRun, loading: passwordJwtValidLoading } = useRequest(
        passwordJwtValid,
        {
            manual: true,
            onSuccess(resp) {
                if (resp && resp.code === GolangServerCode.SUCCESS) {
                    history.push(`${ROUTE_RESET_PSW}#${VeirfyPswPageType.Reset}`);
                } else {
                    setError('passwordJwtValid failed');
                    history.push(`${ROUTE_RESET_PSW}#${VeirfyPswPageType.Error}`);
                }
            },
            onError(err: any) {
                if (err.info && err.info.code === GolangServerCode.INVALID_VERIFY_TOKEN) {
                    history.push(`${ROUTE_RESET_PSW}#${VeirfyPswPageType.InvalidToken}`);
                } else {
                    setError(handleApiError(err, ApiType.ResetPsw));
                    history.push(`${ROUTE_RESET_PSW}#${VeirfyPswPageType.Error}`);
                }
            },
        },
    );

    // reset password
    const { run: passwordRecoverJwtRun, loading: passwordRecoverJwtLoading } = useRequest(
        passwordRecoverJwt,
        {
            manual: true,
            onSuccess(resp) {
                if (resp && resp.code === GolangServerCode.SUCCESS) {
                    history.push(`${ROUTE_RESET_PSW}#${VeirfyPswPageType.Success}`);
                } else {
                    setError('passwordRecoverJwt failed');
                    history.push(`${ROUTE_RESET_PSW}#${VeirfyPswPageType.Error}`);
                }
            },
            onError(err: any) {
                if (err.info && err.info.code === GolangServerCode.NOT_FOUND) {
                    history.push(`${ROUTE_RESET_PSW}#${VeirfyPswPageType.NotFound}`);
                } else if (err.info && err.info.code === GolangServerCode.INVALID_VERIFY_TOKEN) {
                    history.push(`${ROUTE_RESET_PSW}#${VeirfyPswPageType.InvalidToken}`);
                } else {
                    setError(handleApiError(err, ApiType.ResetPsw));
                    history.push(`${ROUTE_RESET_PSW}#${VeirfyPswPageType.Error}`);
                }
            },
        },
    );

    return {
        verifyEmailLoading,
        passwordJwtValidLoading,
        passwordRecoverJwtLoading,
        verifyEmail,
        passwordJwtValidRun,
        passwordRecoverJwtRun,
    };
};
