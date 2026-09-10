import type { RequestOptions } from '@@/plugin-request/request';
import { getIntl, getLocale, request, type RequestConfig } from '@umijs/max';
import { notification } from 'antd';
import { cloneDeep, merge } from 'lodash';
import { getRefreshToken, getToken, setRefreshToken, setToken } from './utils/tokenUtils';
import { forceLogout, im2mGolangServerUrl } from './utils/utils';

// 与后端约定的响应数据格式
export interface ResponseStructure {
    code: GolangServerCode;
    message?: string;
    data?: any;
}

// 与golang后端约定的code
export enum GolangServerCode {
    // 成功
    SUCCESS = 0,
    // 失败，未知错误
    FAILURE = -1,
    // 邮箱或者用户等已存在
    EXSITS = 1,
    // 邮箱或者用户等不存在
    NOT_FOUND = 2,
    // token无效
    INVALID_TOKEN = 3,
    // 缺少token
    TOKEN_MISSING = 4,
    // 密码错误
    INVALID_PASSWORD = 5,
    // 邮件发送失败
    EMAIL_DELIVERY_FAILED = 6,
    // 邮箱已验证，无需再次验证
    EMAIL_VERIFIED = 7,
    // 邮箱未验证
    EMAIL_NOT_VERIFIED = 8,
    // 密码过短
    SHORT_PASSWORD = 9,
    // 密码不一致
    PASSWORD_MISMATCH = 10,
    // 邮箱格式错误
    INVALID_EMAIL = 11,
    // DXF服务器即python计算服务器错误
    DXF_SERVER_ERR = 12,
    // user相关数据请求时，该用户不存在
    NO_USER_FOUND = 13,
    // 同名的size已存在
    DUMMY_SIZE_NAME_EXSITS = 14,
    CUSTOMER_SIZE_NAME_EXSITS = 15,
    // 未找到对应的dummy
    DUMMY_NOT_FOUND = 16,
    // 未找到对应的customer
    CUSTOMER_NOT_FOUND = 17,
    // 验证邮箱或重置密码的token无效
    INVALID_VERIFY_TOKEN = 18,
    // 未找到对应的pattern
    PATTERN_NOT_FOUND = 19,
    // dummy绑定了pattern，无法删除
    DELETE_DUMMY_FORBIDDEN = 20,
    // dummies绑定了pattern，无法删除
    DELETE_DUMMIES_FORBIDDEN = 21,

    // 下面是python计算服务器返回的错误码
    // DXF请求失败
    DXF_FAIL = 10002,
    // DXF读取失败
    READ_DXF_FAILED = 10003,
    // DXF文件格式错误
    INVALID_DXF = 10004,
}

// 使用fetch实现刷新token
async function fetchRefreshToken(response: any) {
    await fetch(im2mGolangServerUrl() + '/api/v1/refresh', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getRefreshToken()}`,
        },
    })
        .then(async (res) => {
            const refreshResp = await res.json();
            if (refreshResp.code !== GolangServerCode.SUCCESS) {
                console.log('refresh token failed, redirect to login page...' + refreshResp.code);
                const error: any = new Error(
                    getIntl(getLocale()).formatMessage({ id: 'message.api.tokenInvalid' }),
                );
                error.name = 'TokenError';
                throw error;
            }
            const data = refreshResp.data;
            setToken(data?.accessJWT);
            setRefreshToken(data?.refreshJWT);

            await request(
                response.request.responseURL,
                merge(cloneDeep(response.config), {
                    headers: { Authorization: `Bearer ${data?.accessJWT}` },
                    getResponse: true, // getResponse 默认是 false， 因此不提供该参数时，只返回 data
                }),
            )
                .then((resp) => {
                    return resp;
                })
                .catch((err) => {
                    throw err;
                });
        })
        .catch((err) => {
            console.log('refresh token failed, redirect to login page...' + err.message);
            err.name = 'TokenError';
            throw err;
        });
}

const responseInterceptor = async (response: any) => {
    // 拦截响应数据，进行个性化处理
    // 当响应的数据 success 是 false 的时候，抛出 response.data 以供 errorHandler 处理
    const { data } = response as unknown as ResponseStructure;
    let returnResp: any;
    if (data?.code === GolangServerCode.SUCCESS) {
        returnResp = response;
    } else if (data?.code === GolangServerCode.INVALID_TOKEN) {
        // 刷新token
        await fetchRefreshToken(response)
            .then((resp) => {
                console.log('refresh token success...');
                returnResp = resp;
            })
            .catch((err) => {
                if (err.name === 'TokenError') {
                    // 刷新token失败，跳转到登录页面
                    forceLogout();
                    notification.error({
                        message: getIntl(getLocale()).formatMessage({
                            id: 'message.error.title',
                        }),
                        description: getIntl(getLocale()).formatMessage({
                            id: 'message.api.tokenInvalid',
                        }),
                    });
                }
                returnResp = { ...response, data: { ...err, success: false } };
            });
    } else {
        if (typeof data === 'object') {
            returnResp = { ...response, data: { ...data, success: false } };
        }
    }
    return returnResp ?? response;
};

/**
 * @name 错误处理
 * pro 自带的错误处理， 可以在这里做自己的改动
 * @doc https://umijs.org/docs/max/request#配置
 */
export const errorConfig: RequestConfig = {
    timeout: 60000,
    // 错误处理： umi@3 的错误处理方案。
    errorConfig: {
        // 错误抛出
        errorThrower: (res) => {
            // 如果服务器返回通用的错误码，如400、500等，会直接进入errorHandler，否则才会执行下面代码。
            const { code, message, data } = res as unknown as ResponseStructure;
            if (code === undefined) {
                return;
            }
            if (code !== GolangServerCode.SUCCESS) {
                const error: any = new Error(message);
                error.name = 'BizError';
                error.info = { code, message, data };
                throw error; // 抛出自制的错误
            }
        },
        // 错误接收及处理
        errorHandler: (error: any, opts: any) => {
            // 错误会交给每个api请求的onError处理
            if (opts?.skipErrorHandler) throw error;
        },
    },

    // 请求拦截器
    requestInterceptors: [
        (config: RequestOptions) => {
            // 拦截请求配置，进行个性化处理。
            const baseURL = im2mGolangServerUrl();
            if (config.headers?.Authorization) {
                return {
                    ...config,
                    baseURL,
                };
            }
            return {
                ...config,
                baseURL,
                headers: {
                    ...config.headers,
                    Authorization:
                        config.url === '/api/v1/logout'
                            ? `Bearer ${getToken()} ${getRefreshToken()}`
                            : `Bearer ${getToken()}`,
                },
            };
        },
    ],

    // 响应拦截器
    responseInterceptors: [responseInterceptor as any],
};
