import { GolangServerCode, ResponseStructure } from '@/requestConfig';
import { getIntl, getLocale } from '@umijs/max';

export enum ApiType {
    Login,
    Register,
    CreateUser,
    CreatePattern,
    GetPatterns,
    GetPattern,
    DeletePattern,
    GetDummies,
    GetDummy,
    LoadPattern,
    DeleteDummy,
    CreateDummy,
    UpdateDummy,
    ParseDxf,
    GetCustomers,
    GetCustomer,
    DeleteCustomer,
    GenerateDxf,
    GenerateDxfFile,
    CreateCustomer,
    UpdateCustomer,
    VerifyEmail,
    DownloadDxfFile,
    DownloadWithInfo,
    GetDownloadHistories,
    DeleteDownloadHistory,
    PasswordForgot,
    ResetPsw,
}

export function handleApiError(error: any, apiType?: ApiType) {
    // 我们的 errorThrower 抛出的错误。
    if (error.name === 'BizError') {
        const errorInfo: ResponseStructure | undefined = error.info;
        const intl = getIntl(getLocale());
        if (errorInfo) {
            const { code, message: msg } = errorInfo;
            console.log(errorInfo);
            switch (code) {
                case GolangServerCode.TOKEN_MISSING:
                    return `${intl.formatMessage({
                        id: 'message.api.tokenMissing',
                    })} (code=${code})`;
                case GolangServerCode.NO_USER_FOUND:
                    return `${intl.formatMessage({
                        id: 'message.api.noUserFound',
                    })} (code=${code})`;
                case GolangServerCode.DXF_SERVER_ERR:
                    return `${intl.formatMessage({
                        id: 'message.api.dxfServerErr',
                    })} (code=${code})`;
                case GolangServerCode.EXSITS:
                    switch (apiType) {
                        case ApiType.CreatePattern:
                        case ApiType.GenerateDxf:
                            return `${intl.formatMessage({
                                id: 'message.api.patternExist',
                            })} (code=${code})`;
                        case ApiType.CreateDummy:
                            return `${intl.formatMessage({
                                id: 'message.api.dummyExist',
                            })} (code=${code})`;
                        case ApiType.CreateCustomer:
                            return `${intl.formatMessage({
                                id: 'message.api.customerExist',
                            })} (code=${code})`;
                        case ApiType.Register:
                            return `${intl.formatMessage({
                                id: 'message.api.emailExist',
                            })} (code=${code})`;
                        case ApiType.CreateUser:
                            return `${intl.formatMessage({
                                id: 'message.api.userExist',
                            })} (code=${code})`;
                        default:
                            return `用户已存在！${msg}`;
                    }
                case GolangServerCode.NOT_FOUND:
                    switch (apiType) {
                        case ApiType.DeletePattern:
                        case ApiType.LoadPattern:
                        case ApiType.GetPattern:
                            return `${intl.formatMessage({
                                id: 'message.api.patternNotFound',
                            })} (code=${code})`;
                        case ApiType.GetDummy:
                        case ApiType.DeleteDummy:
                        case ApiType.UpdateDummy:
                            return `${intl.formatMessage({
                                id: 'message.api.dummyNotFound',
                            })} (code=${code})`;
                        case ApiType.GetCustomer:
                        case ApiType.DeleteCustomer:
                        case ApiType.UpdateCustomer:
                            return `${intl.formatMessage({
                                id: 'message.api.customerNotFound',
                            })} (code=${code})`;
                        case ApiType.Login:
                            return `${intl.formatMessage({
                                id: 'message.api.noAuthFound',
                            })} (code=${code})`;
                        case ApiType.CreateUser:
                        case ApiType.PasswordForgot:
                            return `${intl.formatMessage({
                                id: 'message.api.noUserWithEmail',
                            })} (code=${code})`;
                        case ApiType.DeleteDownloadHistory:
                            return `${intl.formatMessage({
                                id: 'message.api.downloadHistoryNotFound',
                            })} (code=${code})`;
                        default:
                            return `用户不存在！${msg}`;
                    }

                case GolangServerCode.INVALID_VERIFY_TOKEN:
                    switch (apiType) {
                        case ApiType.VerifyEmail:
                            return `${intl.formatMessage({
                                id: 'message.api.invalidEmailToken',
                            })} (code=${code})`;
                        case ApiType.ResetPsw:
                            return `${intl.formatMessage({
                                id: 'message.api.invalidPswToken',
                            })} (code=${code})`;
                    }
                case GolangServerCode.DUMMY_SIZE_NAME_EXSITS:
                    return `${intl.formatMessage({
                        id: 'message.api.dummyExist',
                    })} (code=${code})`;
                case GolangServerCode.CUSTOMER_SIZE_NAME_EXSITS:
                    return `${intl.formatMessage({
                        id: 'message.api.customerExist',
                    })} (code=${code})`;
                case GolangServerCode.DUMMY_NOT_FOUND:
                    return `${intl.formatMessage({
                        id: 'message.api.dummyNotFound',
                    })} (code=${code})`;
                case GolangServerCode.PATTERN_NOT_FOUND:
                    return `${intl.formatMessage({
                        id: 'message.api.patternNotFound',
                    })} (code=${code})`;
                case GolangServerCode.DELETE_DUMMY_FORBIDDEN:
                    return `${intl.formatMessage({
                        id: 'message.api.deleteDummyForbidden',
                    })} (code=${code})`;
                case GolangServerCode.DELETE_DUMMIES_FORBIDDEN:
                    return `${intl.formatMessage({
                        id: 'message.api.deleteDummiesForbidden',
                    })} (code=${code})`;
                case GolangServerCode.CUSTOMER_NOT_FOUND:
                    return `${intl.formatMessage({
                        id: 'message.api.customerNotFound',
                    })} (code=${code})`;
                case GolangServerCode.EMAIL_NOT_VERIFIED:
                    return `${intl.formatMessage({
                        id: 'message.api.emailNotVerified',
                    })} (code=${code})`;
                case GolangServerCode.INVALID_PASSWORD:
                    return `${intl.formatMessage({
                        id: 'message.api.wrongPassword',
                    })} (code=${code})`;
                case GolangServerCode.EMAIL_DELIVERY_FAILED:
                    return `${intl.formatMessage({
                        id: 'message.api.emailDeliveryFailed',
                    })} (code=${code})`;

                case GolangServerCode.INVALID_EMAIL:
                    return `${intl.formatMessage({
                        id: 'message.api.emailFormatError',
                    })} (code=${code})`;
                case GolangServerCode.SHORT_PASSWORD:
                    return `${intl.formatMessage({
                        id: 'message.api.pswShort',
                    })} (code=${code})`;
                case GolangServerCode.PASSWORD_MISMATCH:
                    return `${intl.formatMessage({
                        id: 'message.api.pswMismatch',
                    })} (code=${code})`;
                case GolangServerCode.EMAIL_VERIFIED:
                    return `${intl.formatMessage({
                        id: 'message.api.emailVerified',
                    })} (code=${code})`;

                case GolangServerCode.DXF_FAIL:
                    return `${intl.formatMessage({
                        id: 'message.api.dxfServerError',
                    })}, code=${code}`;
                case GolangServerCode.READ_DXF_FAILED:
                    return `${intl.formatMessage({
                        id: 'message.api.dxfReadError',
                    })}, code=${code}`;
                case GolangServerCode.INVALID_DXF:
                    return `${intl.formatMessage({
                        id: 'message.api.dxfFormatError',
                    })}, code=${code}`;
                default:
                    return `${intl.formatMessage({
                        id: 'message.api.requestFailed',
                    })}, code=${code}`;
            }
        } else {
            return `${intl.formatMessage({ id: 'message.api.requestFailed' })}`;
        }
    } else if (error.response) {
        // Axios 的错误
        // 请求成功发出且服务器也响应了状态码，但状态代码超出了 2xx 的范围
        return `Response error: ${error.message} (${error.code})`;
    } else if (error.request) {
        // 请求已经成功发起，但没有收到响应
        // \`error.request\` 在浏览器中是 XMLHttpRequest 的实例，
        // 而在node.js中是 http.ClientRequest 的实例
        return `None response! Please retry. ${error.message} (${error.code})`;
    } else {
        // 发送请求时出了点问题
        return `Request error, please retry. ${error.message} (${error.code})`;
    }
}
