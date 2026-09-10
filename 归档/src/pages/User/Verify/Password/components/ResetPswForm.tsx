import { ROUTE_LOGIN } from '@/constants/routes';
import { isMobile } from '@/utils/utils';
import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { FormattedMessage, history, useIntl, useModel } from '@umijs/max';
import { Button, Divider, Flex, Typography, theme } from 'antd';

const { Link, Title, Text } = Typography;

type Props = {
    token?: string;
};

const ResetPswForm: React.FC<Props> = (props) => {
    const intl = useIntl();
    const { useToken } = theme;
    const { token: themeToken } = useToken();

    const { passwordRecoverJwtLoading, passwordRecoverJwt } = useModel(
        'User.Verify.model',
        (model) => ({
            passwordRecoverJwtLoading: model.passwordRecoverJwtLoading,
            passwordRecoverJwt: model.passwordRecoverJwtRun,
        }),
    );

    const handleSubmit = async (values: Record<string, any>) => {
        passwordRecoverJwt(
            {
                passNew: values.password,
                passRepeat: values.passwordConfirm,
            },
            {
                headers: {
                    Authorization: `Bearer ${props.token}`,
                },
            },
        );
    };

    return (
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
                loading={passwordRecoverJwtLoading}
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
                                    loading={passwordRecoverJwtLoading}
                                >
                                    {intl.formatMessage({ id: 'component.forgotpsw.form.submit' })}
                                </Button>
                            </Flex>,
                        ];
                    },
                }}
            >
                <Flex justify="center" align="center" style={{ marginBottom: 36 }}>
                    <Title style={isMobile() ? {} : { backgroundColor: '#F8F8F8' }} level={5}>
                        {intl.formatMessage({ id: 'component.resetpsw.form.title' })}
                    </Title>
                </Flex>
                <ProFormText.Password
                    name="password"
                    fieldProps={{
                        size: 'large',
                    }}
                    label={intl.formatMessage({
                        id: 'component.resetpsw.form.newPsw',
                    })}
                    placeholder={intl.formatMessage({
                        id: 'component.resetpsw.form.newPsw',
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
                    <FormattedMessage id="pages.forgotpsw.reset" />
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
export default ResetPswForm;
