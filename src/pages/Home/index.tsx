import { ROUTE_AUTO_GRADING, ROUTE_UPLOAD_PATTERN } from '@/constants/routes';
import { history, useIntl, useModel } from '@umijs/max';
import { useMemoizedFn, useUpdateEffect } from 'ahooks';
import { Button, Card, Flex, Typography, notification, theme } from 'antd';

const { Title, Text } = Typography;

const Home: React.FC = () => {
    const [notificationApi, contextHolder] = notification.useNotification();
    const intl = useIntl();
    const { useToken } = theme;

    const { token: themeToken } = useToken();

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

    const gotoUploadPattern = useMemoizedFn(() => {
        history.push(ROUTE_UPLOAD_PATTERN);
    });

    const gotoAutoGrading = useMemoizedFn(() => {
        history.push(ROUTE_AUTO_GRADING);
    });

    return (
        <>
            {contextHolder}
            <Flex vertical style={{ width: '100%', height: '100%', padding: 50 }}>
                <Title>
                    {intl.formatMessage({
                        id: 'pages.home.title',
                    })}
                </Title>
                <Flex style={{ width: '100%' }} align="middle" justify="space-between">
                    <Flex flex={3}>
                        <Title level={5}>
                            {intl.formatMessage({
                                id: 'pages.home.description',
                            })}
                        </Title>
                    </Flex>
                    <Flex flex={2} justify="end">
                        <Button>
                            {intl.formatMessage({
                                id: 'pages.home.tutorial',
                            })}
                        </Button>
                    </Flex>
                </Flex>
                <Flex flex={1} align="center" justify="center" vertical gap={30}>
                    <Title level={4}>
                        {intl.formatMessage({
                            id: 'pages.home.panel.title',
                        })}
                    </Title>
                    <Flex align="start" justify="center" gap={30}>
                        <div style={{ width: 'min-content', textAlign: 'center' }}>
                            <Card
                                hoverable
                                style={{
                                    width: 255,
                                    height: 255,
                                    backgroundColor: '#534F67',
                                }}
                                bodyStyle={{ height: '100%' }}
                                onClick={gotoUploadPattern}
                            >
                                <Flex
                                    style={{ width: '100%', height: '100%' }}
                                    align="center"
                                    justify="center"
                                >
                                    <Title level={5} style={{ color: 'white' }}>
                                        {intl.formatMessage({
                                            id: 'pages.home.panel.uploadPattern.title',
                                        })}
                                    </Title>
                                </Flex>
                            </Card>
                            <Text>
                                {intl.formatMessage({
                                    id: 'pages.home.panel.uploadPattern.description',
                                })}
                            </Text>
                        </div>
                        <div style={{ width: 'min-content', textAlign: 'center' }}>
                            <Card
                                hoverable
                                style={{
                                    width: 255,
                                    height: 255,
                                    backgroundColor: themeToken.colorPrimary,
                                }}
                                bodyStyle={{ height: '100%' }}
                                onClick={gotoAutoGrading}
                            >
                                <Flex
                                    style={{ width: '100%', height: '100%' }}
                                    align="center"
                                    justify="center"
                                >
                                    <Title level={5} style={{ color: 'white' }}>
                                        {intl.formatMessage({
                                            id: 'pages.home.panel.autoGrading.title',
                                        })}
                                    </Title>
                                </Flex>
                            </Card>
                            <Text>
                                {intl.formatMessage({
                                    id: 'pages.home.panel.autoGrading.description',
                                })}
                            </Text>
                        </div>
                    </Flex>
                </Flex>
            </Flex>
        </>
    );
};

export default Home;
