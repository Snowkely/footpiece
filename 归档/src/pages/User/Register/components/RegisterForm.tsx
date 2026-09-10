import { ROUTE_LOGIN } from '@/constants/routes';
import { isMobile } from '@/utils/utils';
import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { FormattedMessage, history, useIntl, useLocation, useModel } from '@umijs/max';
import { Button, Divider, Flex, Typography, theme } from 'antd';
import { useEffect, useState } from 'react';
import { RigisterPageType } from '../model';

const { Link, Title, Text } = Typography;

const RegisterForm: React.FC = () => {
    const intl = useIntl();
    const { useToken } = theme;
    const { token: themeToken } = useToken();
    const location = useLocation();
    const [rigisterPageType, setRigisterPageType] = useState<RigisterPageType>(
        RigisterPageType.Register,
    );

    const { registerLoading, createUserLoading, register } = useModel(
        'User.Register.model',
        (model) => ({
            registerLoading: model.registerLoading,
            createUserLoading: model.createUserLoading,
            register: model.register,
        }),
    );

    useEffect(() => {
        if (location.hash) {
            setRigisterPageType(location.hash.slice(1) as any);
        }
        return () => {
            setRigisterPageType(RigisterPageType.Register);
        };
    }, [location.hash]);

    const handleSubmit = async (values: Record<string, any>) => {
        // 注册
        register(
            {
                email: values.email,
                password: values.password,
            },
            {
                username: values.username,
            },
        );
    };

    const GoLogin = () => {
        return (
            <Flex align="center" justify="center" gap={16}>
                <Text>{intl.formatMessage({ id: 'pages.register.activated' })}</Text>
                <Link onClick={() => history.replace(ROUTE_LOGIN)}>
                    {intl.formatMessage({ id: 'component.login.form.submit' })}
                </Link>
            </Flex>
        );
    };

    return rigisterPageType === RigisterPageType.Success ? (
        <Flex
            align="center"
            justify="center"
            vertical
            style={{ height: '100%', padding: 60, textAlign: 'center' }}
        >
            <Title level={2}>{intl.formatMessage({ id: 'pages.register.success' })}</Title>
            <GoLogin />
        </Flex>
    ) : rigisterPageType === RigisterPageType.NotVerified ? (
        <Flex
            align="center"
            justify="center"
            vertical
            style={{ height: '100%', padding: 60, textAlign: 'center' }}
        >
            <Title level={2}>{intl.formatMessage({ id: 'pages.register.notVerified' })}</Title>
            <GoLogin />
        </Flex>
    ) : (
        <>
            <Flex vertical justify="center" align="center" style={{ marginTop: 36 }}>
                <img style={{ width: 115 }} alt="logo" src="/logo.png" />
            </Flex>
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
                loading={registerLoading || createUserLoading}
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
                                    loading={registerLoading || createUserLoading}
                                >
                                    {intl.formatMessage({ id: 'component.register.form.submit' })}
                                </Button>
                            </Flex>,
                        ];
                    },
                }}
            >
                <Flex justify="center" align="center" style={{ marginBottom: 36 }}>
                    <Title style={isMobile() ? {} : { backgroundColor: '#F8F8F8' }} level={5}>
                        {intl.formatMessage({ id: 'component.register.form.title' })}
                    </Title>
                </Flex>
                <ProFormText
                    name="username"
                    fieldProps={{
                        size: 'large',
                    }}
                    label={intl.formatMessage({
                        id: 'component.register.form.username',
                    })}
                    placeholder={intl.formatMessage({
                        id: 'component.register.form.username',
                    })}
                    rules={[
                        {
                            required: true,
                            message: (
                                <FormattedMessage id="component.register.form.username.required" />
                            ),
                        },
                    ]}
                />
                <ProFormText
                    name="email"
                    fieldProps={{
                        size: 'large',
                    }}
                    label={intl.formatMessage({
                        id: 'component.login.form.email',
                    })}
                    placeholder={intl.formatMessage({
                        id: 'component.login.form.email',
                    })}
                    rules={[
                        {
                            type: 'email',
                            message: <FormattedMessage id="component.login.form.emailInvalid" />,
                        },
                        {
                            required: true,
                            message: <FormattedMessage id="component.login.form.email.required" />,
                        },
                    ]}
                />
                <ProFormText.Password
                    name="password"
                    fieldProps={{
                        size: 'large',
                    }}
                    label={intl.formatMessage({
                        id: 'component.login.form.password',
                    })}
                    placeholder={intl.formatMessage({
                        id: 'component.login.form.password',
                    })}
                    rules={[
                        {
                            required: true,
                            message: (
                                <FormattedMessage id="component.login.form.password.required" />
                            ),
                        },
                        () => ({
                            validator(_, value) {
                                if (!value || value.length >= 6) {
                                    return Promise.resolve();
                                }
                                return Promise.reject(
                                    new Error(
                                        intl.formatMessage({
                                            id: 'message.api.pswShort',
                                        }),
                                    ),
                                );
                            },
                        }),
                    ]}
                />
                <ProFormText.Password
                    name="passwordConfirm"
                    fieldProps={{
                        size: 'large',
                    }}
                    label={intl.formatMessage({
                        id: 'component.register.form.confirmPsw',
                    })}
                    placeholder={intl.formatMessage({
                        id: 'component.register.form.confirmPsw',
                    })}
                    rules={[
                        {
                            required: true,
                            message: (
                                <FormattedMessage id="component.register.form.confirmPsw.required" />
                            ),
                        },
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                if (!value || getFieldValue('password') === value) {
                                    return Promise.resolve();
                                }
                                return Promise.reject(
                                    new Error(
                                        intl.formatMessage({
                                            id: 'component.register.form.pswMismatch',
                                        }),
                                    ),
                                );
                            },
                        }),
                    ]}
                />
            </LoginForm>
            <Flex justify="center" align="center">
                <Text>
                    <FormattedMessage id="component.register.form.haveAccount" />
                </Text>
                <Divider type="vertical" />
                <Link
                    style={{ color: themeToken.colorPrimary }}
                    strong
                    onClick={() => history.push(ROUTE_LOGIN)}
                >
                    <FormattedMessage id="component.login.form.submit" />
                </Link>
            </Flex>
        </>
    );
};
export default RegisterForm;
