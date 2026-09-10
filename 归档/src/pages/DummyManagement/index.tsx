import { useIntl, useModel } from '@umijs/max';
import { useUpdateEffect } from 'ahooks';
import { Divider, Flex, Typography, message } from 'antd';
import DummyTabs from './components/DummyTabs';

const { Title } = Typography;

const Home: React.FC = () => {
    const [messageApi, contextHolder] = message.useMessage();
    const intl = useIntl();

    const { error, success, setError, setSuccess } = useModel('globalModel', (model) => ({
        error: model.error,
        success: model.success,
        setError: model.setError,
        setSuccess: model.setSuccess,
    }));

    useUpdateEffect(() => {
        if (error) {
            messageApi.error({
                type: 'error',
                content: error,
            });
            setError(undefined);
        }
        if (success) {
            messageApi.success({
                type: 'success',
                content: success,
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
                        id: 'pages.dummyManagmnet.title',
                    })}
                </Title>
                <Title level={5} style={{ margin: 0 }}>
                    {intl.formatMessage({
                        id: 'pages.dummyManagmnet.description',
                    })}
                </Title>
                <Divider />
                <DummyTabs />
            </Flex>
        </>
    );
};

export default Home;
