import { ROUTE_PATTERN_MANAGEMENT } from '@/constants/routes';
import { FormOutlined, LeftOutlined } from '@ant-design/icons';
import { history, useIntl, useLocation, useModel } from '@umijs/max';
import { useMemoizedFn, useUpdateEffect } from 'ahooks';
import { Button, Flex, FloatButton, Spin, message } from 'antd';
import { useEffect, useState } from 'react';
import BaseSizeForm from './components/BaseSizeForm';
import RightRefDrawer from './components/RightRefDrawer';
import Scene from './components/Scene';

const ViewPattern: React.FC = () => {
    const [messageApi, contextHolder] = message.useMessage();
    const intl = useIntl();
    const [openBaseSizeForm, setOpenBaseSizeForm] = useState(true);
    const location = useLocation();

    const {
        getPatternLoading,
        blocks,
        openRightRefDrawer,
        getPattern,
        setRightRefDrawer,
        resetAll,
    } = useModel('ViewPattern.model', (model) => ({
        getPatternLoading: model.getPatternLoading,
        blocks: model.blocks,
        openRightRefDrawer: model.openRightRefDrawer,
        getPattern: model.getPatternRun,
        setRightRefDrawer: model.setRightRefDrawer,
        resetAll: model.resetAll,
    }));

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

    const onCloseRightRefDrawer = useMemoizedFn(() => {
        setRightRefDrawer(false);
    });

    const onCloseBaseSizeForm = useMemoizedFn(() => {
        setOpenBaseSizeForm(false);
    });

    useEffect(() => {
        getPattern({
            id: (location.state as any).patternId,
        });
        return () => {
            resetAll();
            onCloseBaseSizeForm();
            onCloseRightRefDrawer();
        };
    }, []);

    const showRightRefDrawer = useMemoizedFn(() => {
        setRightRefDrawer(true);
        setOpenBaseSizeForm(false);
    });

    const showBaseSizeForm = useMemoizedFn(() => {
        setOpenBaseSizeForm(true);
    });

    const backtoPatternManagement = useMemoizedFn(() => {
        history.replace(ROUTE_PATTERN_MANAGEMENT);
    });

    return (
        <>
            {contextHolder}
            <Spin
                spinning={getPatternLoading}
                tip={intl.formatMessage({
                    id: 'pages.uploadPattern.parsing',
                })}
                size="large"
                delay={200}
                fullscreen
            />
            <Flex style={{ width: '100%', height: '100%' }} justify="center" align="center">
                <Scene />
            </Flex>
            <Button
                type="text"
                icon={<LeftOutlined style={{ fontSize: 24 }} />}
                size="large"
                style={{ position: 'absolute', left: 30, top: 30, display: 'flex' }}
                onClick={backtoPatternManagement}
            >
                {intl.formatMessage({
                    id: 'pages.viewPattern.back',
                })}
            </Button>
            {blocks.blocks && !openBaseSizeForm && !openRightRefDrawer && (
                <FloatButton icon={<FormOutlined />} onClick={showBaseSizeForm} />
            )}
            <BaseSizeForm
                onClose={onCloseBaseSizeForm}
                open={openBaseSizeForm}
                showRightRefDrawer={showRightRefDrawer}
            />
            <RightRefDrawer onClose={onCloseRightRefDrawer} open={openRightRefDrawer} />
        </>
    );
};

export default ViewPattern;
