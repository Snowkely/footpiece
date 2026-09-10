import { Footer, Lang } from '@/components';
import { useEmotionCss } from '@ant-design/use-emotion-css';
import { Helmet, useIntl, useModel } from '@umijs/max';
import { useUpdateEffect } from 'ahooks';
import { notification } from 'antd';
import React from 'react';
import Settings from '../../../../config/defaultSettings';
import MyLoginForm from './components/MyLoginForm';

const Login: React.FC = () => {
    const [notificationApi, contextHolder] = notification.useNotification();
    const intl = useIntl();

    const { error, success, setError, setSuccess } = useModel('globalModel', (model) => ({
        error: model.error,
        success: model.success,
        setError: model.setError,
        setSuccess: model.setSuccess,
    }));

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
                        id: 'menu.login',
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
                <MyLoginForm />
            </div>
            <Footer />
        </div>
    );
};

export default Login;
