import { Footer, Lang } from '@/components';
import { ROUTE_LOGIN } from '@/constants/routes';
import { LeftOutlined } from '@ant-design/icons';
import { useEmotionCss } from '@ant-design/use-emotion-css';
import { Helmet, history, useIntl, useModel } from '@umijs/max';
import { useMemoizedFn, useUpdateEffect } from 'ahooks';
import { Button, Flex, notification } from 'antd';
import React from 'react';
import Settings from '../../../../config/defaultSettings';
import FashionLoginForm from './components/FashionLoginForm';

const FashionLogin: React.FC = () => {
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

    const gotoiMTMLogin = useMemoizedFn(() => {
        history.replace(ROUTE_LOGIN);
    });

    return (
        <div className={containerClassName}>
            {contextHolder}
            <Helmet>
                <title>
                    {intl.formatMessage({
                        id: 'menu.fashionLogin',
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
                <Flex style={{ margin: 24 }} align="center" onClick={gotoiMTMLogin}>
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

                <FashionLoginForm />
            </div>
            <Footer />
        </div>
    );
};

export default FashionLogin;
