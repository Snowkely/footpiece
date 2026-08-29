import { Footer, Lang } from '@/components';
import { ROUTE_LOGIN } from '@/constants/routes';
import { isMobile } from '@/utils/utils';
import { LeftOutlined } from '@ant-design/icons';
import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { useEmotionCss } from '@ant-design/use-emotion-css';
import { FormattedMessage, Helmet, history, useIntl, useModel } from '@umijs/max';
import { useMemoizedFn, useUpdateEffect } from 'ahooks';
import { Button, Flex, Typography, notification, theme } from 'antd';
import React, { useEffect, useState } from 'react';
import Settings from '../../../../config/defaultSettings';
import { ForgotPasswordPageType } from './model';

const { Title, Link, Text } = Typography;

const ForgotPassword: React.FC = () => {
    const [notificationApi, contextHolder] = notification.useNotification();
    const intl = useIntl();
    const { useToken } = theme;
    const { token: themeToken } = useToken();
    const [pageType, setPageType] = useState<ForgotPasswordPageType>(
        ForgotPasswordPageType.ForgotPassword,
    );

    const { error, success, setError, setSuccess } = useModel('globalModel', (model) => ({
        error: model.error,
        success: model.success,
        setError: model.setError,
        setSuccess: model.setSuccess,
    }));

    const { passwordForgotLoading, passwordForgot } = useModel(
        'User.ForgotPassword.model',
        (model) => ({
            passwordForgotLoading: model.passwordForgotLoading,
            passwordForgot: model.passwordForgotRun,
        }),
    );

    useEffect(() => {
        if (location.hash) {
            setPageType(location.hash.slice(1) as any);
        }
        return () => {
            setPageType(ForgotPasswordPageType.ForgotPassword);
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

    const handleSubmit = async (values: Record<string, any>) => {
        passwordForgot({
            email: values.email,
        });
    };

    const gotoLogin = useMemoizedFn(() => {
        history.replace(ROUTE_LOGIN);
    });

    return (
        <div className={containerClassName}>
            {contextHolder}
            <Helmet>
                <title>
                    {intl.formatMessage({
                        id: 'menu.forgotpsw',
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
                <Flex style={{ margin: 24 }} align="center" onClick={gotoLogin}>
                    <Button
                        type="text"
                        icon={<LeftOutlined style={{ fontSize: 24 }} />}
                        size="large"
                    />
                    <img
                        style={{ width: 42, objectFit: 'contain', cursor: 'pointer' }}
                        src={'/logo.png'}
                    ></img>
                </Flex>
                {pageType === ForgotPasswordPageType.Success ? (
                    <Flex
                        align="center"
                        vertical
                        style={{ height: '100%', padding: 60, textAlign: 'center' }}
                    >
                        <Title level={2}>
                            {intl.formatMessage({ id: 'pages.forgotpsw.success' })}
                        </Title>
                        <Flex align="center" justify="center" gap={16}>
                            <Text>{intl.formatMessage({ id: 'pages.forgotpsw.reset' })}</Text>
                            <Link onClick={gotoLogin}>
                                {intl.formatMessage({ id: 'component.login.form.submit' })}
                            </Link>
                        </Flex>
                    </Flex>
                ) : (
                    <LoginForm
                        containerStyle={{
                            height: 'auto',
                        }}
                        contentStyle={{
                            width: isMobile() ? undefined : 460,
                            minWidth: 280,
                            maxWidth: '75vw',
                        }}
                        style={
                            isMobile()
                                ? {}
                                : {
                                      backgroundColor: '#F8F8F8',
                                      padding: '24px 60px 60px 60px',
                                      borderRadius: 4,
                                  }
                        }
                        onFinish={async (values) => {
                            await handleSubmit(values);
                        }}
                        loading={passwordForgotLoading}
                        submitter={{
                            render: (props) => {
                                return [
                                    <Flex key="submit" align="center" justify="center">
                                        <Button
                                            type="primary"
                                            size="middle"
                                            onClick={() => props.form?.submit?.()}
                                            style={{
                                                backgroundColor: themeToken.colorPrimary,
                                            }}
                                            loading={passwordForgotLoading}
                                        >
                                            {intl.formatMessage({
                                                id: 'component.forgotpsw.form.submit',
                                            })}
                                        </Button>
                                    </Flex>,
                                ];
                            },
                        }}
                    >
                        <Flex justify="center" align="center" style={{ marginBottom: 36 }}>
                            <Title
                                style={isMobile() ? {} : { backgroundColor: '#F8F8F8' }}
                                level={5}
                            >
                                {intl.formatMessage({ id: 'component.forgotpsw.form.title' })}
                            </Title>
                        </Flex>
                        <ProFormText
                            name="email"
                            fieldProps={{
                                size: 'large',
                            }}
                            placeholder={intl.formatMessage({
                                id: 'component.login.form.email',
                            })}
                            rules={[
                                {
                                    type: 'email',
                                    message: (
                                        <FormattedMessage id="component.login.form.emailInvalid" />
                                    ),
                                },
                                {
                                    required: true,
                                    message: (
                                        <FormattedMessage id="component.login.form.email.required" />
                                    ),
                                },
                            ]}
                        />
                    </LoginForm>
                )}
            </div>
            <Footer />
        </div>
    );
};

export default ForgotPassword;
