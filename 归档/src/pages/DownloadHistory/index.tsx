import { useIntl, useModel } from '@umijs/max';
import { useUpdateEffect } from 'ahooks';
import { Divider, Flex, Typography, notification } from 'antd';
import Table from './components/Table';

const { Title } = Typography;

const Home: React.FC = () => {
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

    return (
        <>
            {contextHolder}
            <Flex vertical style={{ width: '100%', height: '100%', padding: 50 }}>
                <Title>
                    {intl.formatMessage({
                        id: 'pages.downloadHistory.title',
                    })}
                </Title>
                <Title level={5} style={{ margin: 0 }}>
                    {intl.formatMessage({
                        id: 'pages.downloadHistory.description',
                    })}
                </Title>
                <Divider />
                <Table />
            </Flex>
        </>
    );
};

export default Home;
