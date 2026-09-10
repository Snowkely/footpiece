import { Footer, Lang } from '@/components';
import { ROUTE_LOGIN } from '@/constants/routes';
import { useEmotionCss } from '@ant-design/use-emotion-css';
import { Helmet, history, useIntl, useLocation, useModel, useSearchParams } from '@umijs/max';
import { useUpdateEffect } from 'ahooks';
import { Flex, Spin, Typography, notification } from 'antd';
import React, { useEffect, useState } from 'react';
import Settings from '../../../../../config/defaultSettings';
import { VeirfyPswPageType } from '../model';
import ResetPswForm from './components/ResetPswForm';

const { Link, Title } = Typography;

const VerifyPsw: React.FC = () => {
    const [notificationApi, contextHolder] = notification.useNotification();
    const intl = useIntl();
    const location = useLocation();
    let [searchParams] = useSearchParams();
    const [pageType, setPageType] = useState<VeirfyPswPageType>(VeirfyPswPageType.Loading);
    const [token, setToken] = useState<string>();

    const { error, success, setError, setSuccess } = useModel('globalModel', (model) => ({
        error: model.error,
        success: model.success,
        setError: model.setError,
        setSuccess: model.setSuccess,
    }));

    const { passwordJwtValidLoading, passwordJwtValid } = useModel(
        'User.Verify.model',
        (model) => ({
            passwordJwtValidLoading: model.passwordJwtValidLoading,
            passwordJwtValid: model.passwordJwtValidRun,
        }),
    );

    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            setToken(token);
            passwordJwtValid({
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
        }
    }, []);

    useEffect(() => {
        if (location.hash) {
            setPageType(location.hash.slice(1) as any);
        }
        return () => {
            setPageType(VeirfyPswPageType.Loading);
        };
    }, [location.hash]);

    useUpdateEffect(() => {
        if (error) {
            notificationApi.error({
                message: intl.formatMessage({
                    id: 'message.error.title',
                }),
                description: error,
            });
            setError(undefined);
        }
        if (success) {
            notificationApi.success({
                message: intl.formatMessage({
                    id: 'message.success.title',
                }),
                description: success,
            });
            setSuccess(undefined);
        }
    }, [error, success]);

    const containerClassName = useEmotionCss(() => {
        return {
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            overflow: 'auto',
        };
    });

    return (
        <div className={containerClassName}>
            {contextHolder}
            <Helmet>
                <title>
                    {intl.formatMessage({
                        id: 'menu.passwordVerify',
                    })}
                    - {Settings.title}
                </title>
            </Helmet>
            <Lang />
            <div
                style={{
                    flex: '1',
                    marginTop: 48,
                }}
            >
                <Spin spinning={pageType === VeirfyPswPageType.Loading || passwordJwtValidLoading}>
                    {pageType === VeirfyPswPageType.Success ? (
                        <Flex
                            align="center"
                            justify="center"
                            vertical
                            style={{ height: '100%', padding: 60, textAlign: 'center' }}
                        >
                            <Title level={2}>
                                {intl.formatMessage({ id: 'pages.reset.success' })}
                            </Title>
                            <Link onClick={() => history.push(ROUTE_LOGIN)}>
                                {intl.formatMessage({ id: 'component.login.form.submit' })}
                            </Link>
                        </Flex>
                    ) : pageType === VeirfyPswPageType.NotFound ? (
                        <Flex
                            align="center"
                            justify="center"
                            vertical
                            style={{ height: '100%', padding: 60, textAlign: 'center' }}
                        >
                            <Title level={2}>
                                {intl.formatMessage({ id: 'message.api.noUserFound' })}
                            </Title>
                            <Link onClick={() => history.push(ROUTE_LOGIN)}>
                                {intl.formatMessage({ id: 'component.login.form.submit' })}
                            </Link>
                        </Flex>
                    ) : pageType === VeirfyPswPageType.InvalidToken ? (
                        <Flex
                            align="center"
                            justify="center"
                            vertical
                            style={{ height: '100%', padding: 60, textAlign: 'center' }}
                        >
                            <Title level={2}>
                                {intl.formatMessage({ id: 'message.api.invalidPswToken' })}
                            </Title>
                        </Flex>
                    ) : pageType === VeirfyPswPageType.Reset ? (
                        <ResetPswForm token={token} />
                    ) : (
                        <></>
                    )}
                </Spin>
            </div>
            <Footer />
        </div>
    );
};

export default VerifyPsw;
