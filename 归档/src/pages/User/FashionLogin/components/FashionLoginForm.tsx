import { GolangServerCode } from '@/requestConfig';
import { ApiType, handleApiError } from '@/utils/errHandler';
import { setAuthId, setRefreshToken, setToken } from '@/utils/tokenUtils';
import { isMobile } from '@/utils/utils';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { FormattedMessage, history, useIntl, useModel } from '@umijs/max';
import { Button, Flex, Typography, theme } from 'antd';
import { flushSync } from 'react-dom';

const { Title } = Typography;

const FashionLoginForm: React.FC = () => {
    const intl = useIntl();
    const { initialState, setInitialState } = useModel('@@initialState');
    const { useToken } = theme;
    const { token: themeToken } = useToken();

    const { loginLoading, login } = useModel('User.FashionLogin.model', (model) => ({
        loginLoading: model.loginLoading,
        login: model.loginRun,
    }));

    const { setError, setSuccess } = useModel('globalModel', (model) => ({
        setError: model.setError,
        setSuccess: model.setSuccess,
    }));

    const fetchUserInfo = async () => {
        const userInfo = await initialState?.fetchUserInfo?.();
        if (userInfo) {
            flushSync(() => {
                setInitialState((s) => ({
                    ...s,
                    currentUser: userInfo,
                }));
            });
        }
    };

    const handleSubmit = async (values: Record<string, any>) => {
        // 登录
        login({
            email: values.email,
            password: values.password,
        })
            .then(async (resp) => {
                if (
                    resp &&
                    resp.code === GolangServerCode.SUCCESS &&
                    resp.data &&
                    resp.data.jwt &&
                    resp.data.jwt.accessJWT &&
                    resp.data.jwt.refreshJWT &&
                    resp.data.authId
                ) {
                    setSuccess(
                        intl.formatMessage({
                            id: 'message.api.loginSuccess',
                        }),
                    );
                    setToken(resp.data.jwt.accessJWT);
                    setRefreshToken(resp.data.jwt.refreshJWT);
                    setAuthId(resp.data.authId!);
                    await fetchUserInfo();
                    const urlParams = new URL(window.location.href).searchParams;
                    history.push(urlParams.get('redirect') || '/');
                } else {
                    setError('login failed');
                }
            })
            .catch((err) => {
                setError(handleApiError(err, ApiType.Login));
            });
    };

    return (
        <>
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
                loading={loginLoading}
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
                                    loading={loginLoading}
                                >
                                    {intl.formatMessage({ id: 'component.login.form.submit' })}
                                </Button>
                            </Flex>,
                        ];
                    },
                }}
            >
                <Flex justify="center" align="center" style={{ marginBottom: 36 }}>
                    <Title style={isMobile() ? {} : { backgroundColor: '#F8F8F8' }} level={5}>
                        {intl.formatMessage({ id: 'component.login.form.fashionLogin.title' })}
                    </Title>
                </Flex>
                <ProFormText
                    name="email"
                    fieldProps={{
                        size: 'large',
                        prefix: <MailOutlined />,
                    }}
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
                        prefix: <LockOutlined />,
                    }}
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
                    ]}
                />
            </LoginForm>
        </>
    );
};
export default FashionLoginForm;
