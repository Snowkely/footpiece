import { DxfScene, SelectPointsDrawer } from '@/components';
import PatternPropsSelect from '@/components/PatternPropsSelect/PatternPropsSelect';
import { ROUTE_HOME } from '@/constants/routes';
import { FormOutlined, LeftOutlined } from '@ant-design/icons';
import { history, useIntl, useModel } from '@umijs/max';
import { useKeyPress, useMemoizedFn, useUpdateEffect } from 'ahooks';
import { Alert, Button, Flex, FloatButton, Spin, message } from 'antd';
import { useEffect, useState } from 'react';
import LeftDrawer from './components/LeftDrawer';
import PatternSelect from './components/PatternSelect';

const AutoGrading: React.FC = () => {
    const [messageApi, contextHolder] = message.useMessage();
    const intl = useIntl();
    // 选择使用已有的pattern还是上传新的来autograding
    const [method, setMethod] = useState<'upload' | 'useExist'>();

    const { openLeftMenu, openRightRefDrawer, setOpenLeftMenu, setRightRefDrawer, resetAll } =
        useModel('AutoGrading.model', (model) => ({
            openLeftMenu: model.openLeftMenu,
            openRightRefDrawer: model.openRightRefDrawer,
            setOpenLeftMenu: model.setOpenLeftMenu,
            setRightRefDrawer: model.setRightRefDrawer,
            resetAll: model.resetAll,
        }));

    const { gender, category, error, success, setError, setSuccess, resetAllGlobal } = useModel(
        'globalModel',
        (model) => ({
            gender: model.gender,
            category: model.category,
            error: model.error,
            success: model.success,
            setError: model.setError,
            setSuccess: model.setSuccess,
            resetAllGlobal: model.resetAll,
        }),
    );

    const { parseDxfLoading, blocks, resetUploadAll } = useModel('uploadModel', (model) => ({
        parseDxfLoading: model.parseDxfFileLoading,
        patternFile: model.patternFile,
        blocks: model.blocks,
        resetUploadAll: model.resetAll,
    }));

    const { resetAllBasicSize } = useModel('basicSizeFormModel', (model) => ({
        resetAllBasicSize: model.resetAll,
    }));

    const { startPick, resetAllSelectPoints, setStartPick } = useModel(
        'selectPointsDrawerModel',
        (model) => ({
            startPick: model.startPick,
            resetAllSelectPoints: model.resetAll,
            setStartPick: model.setStartPick,
        }),
    );

    const { resetAllDxfScene } = useModel('dxfSceneModel', (model) => ({
        resetAllDxfScene: model.resetAll,
    }));

    useEffect(() => {
        return () => {
            resetAll();
            resetUploadAll();
            resetAllBasicSize();
            resetAllSelectPoints();
            resetAllDxfScene();
            resetAllGlobal();
        };
    }, []);

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

    const showLeftDrawer = useMemoizedFn(() => {
        setOpenLeftMenu(true);
    });

    const onCloseLeftDrawer = useMemoizedFn(() => {
        setOpenLeftMenu(false);
    });

    const onCloseRightRefDrawer = useMemoizedFn(() => {
        setRightRefDrawer(false);
    });

    const gotoHome = useMemoizedFn(() => {
        history.replace(ROUTE_HOME);
    });

    // 点击Esc键退出pick mode
    useKeyPress('esc', () => {
        setStartPick(false);
        showLeftDrawer();
    });

    return (
        <>
            {contextHolder}
            <Spin
                spinning={parseDxfLoading}
                tip={intl.formatMessage({
                    id: 'pages.uploadPattern.parsing',
                })}
                size="large"
                delay={200}
                fullscreen
            />
            <Flex style={{ width: '100%', height: '100%' }} justify="center" align="center">
                <DxfScene />
                {!blocks.blocks && (
                    <>
                        {!method && (
                            <Flex
                                vertical
                                gap="large"
                                style={{ position: 'absolute', left: 'auto', top: 'auto' }}
                            >
                                <Button
                                    type="primary"
                                    size="large"
                                    onClick={() => setMethod('upload')}
                                >
                                    {intl.formatMessage({
                                        id: 'pages.autoGrading.upload',
                                    })}
                                </Button>
                                <Button
                                    type="primary"
                                    size="large"
                                    onClick={() => setMethod('useExist')}
                                >
                                    {intl.formatMessage({
                                        id: 'pages.autoGrading.useExist',
                                    })}
                                </Button>
                            </Flex>
                        )}
                        {method === 'upload' && (
                            <Flex
                                vertical
                                gap="large"
                                style={{ position: 'absolute', left: 'auto', top: 'auto' }}
                                justify="center"
                                align="center"
                            >
                                <PatternPropsSelect />
                                <Button
                                    type="primary"
                                    size="large"
                                    onClick={showLeftDrawer}
                                    disabled={gender === undefined || category === undefined}
                                >
                                    {intl.formatMessage({
                                        id: 'pages.uploadPattern.upload',
                                    })}
                                </Button>
                                <Button danger size="large" onClick={() => setMethod(undefined)}>
                                    {intl.formatMessage({
                                        id: 'component.cancel',
                                    })}
                                </Button>
                            </Flex>
                        )}
                        {method === 'useExist' && (
                            <Flex
                                vertical
                                style={{ position: 'absolute', left: 'auto', top: 'auto' }}
                            >
                                <PatternSelect showLeftDrawer={showLeftDrawer} />
                                <Button danger size="large" onClick={() => setMethod(undefined)}>
                                    {intl.formatMessage({
                                        id: 'component.cancel',
                                    })}
                                </Button>
                            </Flex>
                        )}
                    </>
                )}
                {startPick && (
                    <Alert
                        style={{ position: 'absolute', left: 'auto', top: 0, right: 'auto' }}
                        message={intl.formatMessage({
                            id: 'pages.uploadPattern.cancelPickMode',
                        })}
                        type="warning"
                    />
                )}
            </Flex>
            <Button
                type="text"
                icon={<LeftOutlined style={{ fontSize: 24 }} />}
                size="large"
                style={{ position: 'absolute', left: 30, top: 30, display: 'flex' }}
                onClick={gotoHome}
            >
                {intl.formatMessage({
                    id: 'pages.uploadPattern.back',
                })}
            </Button>
            {blocks.blocks && !openLeftMenu && (
                <FloatButton
                    style={{ insetInlineStart: 24 }}
                    icon={<FormOutlined />}
                    onClick={showLeftDrawer}
                />
            )}
            <LeftDrawer
                onClose={onCloseLeftDrawer}
                open={openLeftMenu}
                autoGradingMethod={method}
            />
            <SelectPointsDrawer
                onClose={onCloseRightRefDrawer}
                open={openRightRefDrawer}
                actionType="autoGrading"
            />
        </>
    );
};

export default AutoGrading;
