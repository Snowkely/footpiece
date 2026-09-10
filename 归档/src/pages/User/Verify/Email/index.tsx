import { Footer, Lang } from '@/components';
import { ROUTE_LOGIN } from '@/constants/routes';
import { useEmotionCss } from '@ant-design/use-emotion-css';
import { Helmet, history, useIntl, useLocation, useModel, useSearchParams } from '@umijs/max';
import { useUpdateEffect } from 'ahooks';
import { Flex, Spin, Typography, notification } from 'antd';
import React, { useEffect, useState } from 'react';
import Settings from '../../../../../config/defaultSettings';
import { VeirfyEmailPageType } from '../model';

const { Link, Title } = Typography;

const VerifyEmail: React.FC = () => {
    const [notificationApi, contextHolder] = notification.useNotification();
    const intl = useIntl();
    const location = useLocation();
    let [searchParams] = useSearchParams();
    const [pageType, setPageType] = useState<VeirfyEmailPageType>(VeirfyEmailPageType.Loading);

    const { error, success, setError, setSuccess } = useModel('globalModel', (model) => ({
        error: model.error,
        success: model.success,
        setError: model.setError,
        setSuccess: model.setSuccess,
    }));

    const { verifyEmailLoading, verifyEmail } = useModel('User.Verify.model', (model) => ({
        verifyEmailLoading: model.verifyEmailLoading,
        verifyEmail: model.verifyEmail,
    }));

    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            verifyEmail({
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
            setPageType(VeirfyEmailPageType.Loading);
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
                        id: 'menu.emailVerify',
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
                <Spin spinning={pageType === VeirfyEmailPageType.Loading || verifyEmailLoading}>
                    {pageType === VeirfyEmailPageType.Success ? (
                        <Flex
                            align="center"
                            justify="center"
                            vertical
                            style={{ height: '100%', padding: 60, textAlign: 'center' }}
                        >
                            <Title level={2}>
                                {intl.formatMessage({ id: 'pages.verify.success' })}
                            </Title>
                            <Link onClick={() => history.push(ROUTE_LOGIN)}>
                                {intl.formatMessage({ id: 'component.login.form.submit' })}
                            </Link>
                        </Flex>
                    ) : pageType === VeirfyEmailPageType.Verified ? (
                        <Flex
                            align="center"
                            justify="center"
                            vertical
                            style={{ height: '100%', padding: 60, textAlign: 'center' }}
                        >
                            <Title level={2}>
                                {intl.formatMessage({ id: 'message.api.emailVerify.verified' })}
                            </Title>
                            <Link onClick={() => history.push(ROUTE_LOGIN)}>
                                {intl.formatMessage({ id: 'component.login.form.submit' })}
                            </Link>
                        </Flex>
                    ) : pageType === VeirfyEmailPageType.InvalidToken ? (
                        <Flex
                            align="center"
                            justify="center"
                            vertical
                            style={{ height: '100%', padding: 60, textAlign: 'center' }}
                        >
                            <Title level={2}>
                                {intl.formatMessage({ id: 'message.api.invalidEmailToken' })}
                            </Title>
                        </Flex>
                    ) : pageType === VeirfyEmailPageType.Error ? (
                        <Flex
                            align="center"
                            justify="center"
                            vertical
                            style={{ height: '100%', padding: 60, textAlign: 'center' }}
                        >
                            <Title level={2}>
                                {intl.formatMessage({
                                    id: 'message.error.title',
                                })}
                            </Title>
                        </Flex>
                    ) : (
                        <></>
                    )}
                </Spin>
            </div>
            <Footer />
        </div>
    );
};

export default VerifyEmail;
