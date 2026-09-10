import { DxfScene, SelectPointsDrawer } from '@/components';
import PatternPropsSelect from '@/components/PatternPropsSelect/PatternPropsSelect';
import { ROUTE_HOME } from '@/constants/routes';
import { FormOutlined, LeftOutlined } from '@ant-design/icons';
import { history, useIntl, useModel } from '@umijs/max';
import { useKeyPress, useMemoizedFn, useUpdateEffect } from 'ahooks';
import { Alert, Button, Flex, FloatButton, Spin, message } from 'antd';
import { useEffect } from 'react';
import LeftDrawer from './components/LeftDrawer';

const UploadPattern: React.FC = () => {
    const [messageApi, contextHolder] = message.useMessage();
    const intl = useIntl();

    const { openLeftMenu, openRightRefDrawer, setOpenLeftMenu, setRightRefDrawer, resetAll } =
        useModel('UploadPattern.model', (model) => ({
            openLeftMenu: model.openLeftMenu,
            openRightRefDrawer: model.openRightRefDrawer,
            setOpenLeftMenu: model.setOpenLeftMenu,
            setRightRefDrawer: model.setRightRefDrawer,
            resetAll: model.resetAll,
        }));

    const { error, success, gender, category, setError, setSuccess, resetAllGlobal } = useModel(
        'globalModel',
        (model) => ({
            error: model.error,
            success: model.success,
            gender: model.gender,
            category: model.category,
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

    useEffect(() => {
        return () => {
            resetAll();
            resetUploadAll();
            resetAllBasicSize();
            resetAllSelectPoints();
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
                    <Flex
                        style={{ position: 'absolute', left: 'auto', top: 'auto' }}
                        vertical
                        align="center"
                        gap="large"
                    >
                        <PatternPropsSelect />
                        <Button
                            type="primary"
                            size="large"
                            onClick={showLeftDrawer}
                            disabled={startPick || gender === undefined || category === undefined}
                        >
                            {intl.formatMessage({
                                id: 'pages.uploadPattern.upload',
                            })}
                        </Button>
                    </Flex> // 如果还没有解析dxf，显示button
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
            <LeftDrawer onClose={onCloseLeftDrawer} open={openLeftMenu} />
            <SelectPointsDrawer
                onClose={onCloseRightRefDrawer}
                open={openRightRefDrawer}
                actionType="uploadPattern"
            />
        </>
    );
};

export default UploadPattern;
