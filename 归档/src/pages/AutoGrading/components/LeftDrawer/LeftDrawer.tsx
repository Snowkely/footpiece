import BaseSizeForm from '@/components/BaseSizeForm';
import DxfUpload from '@/components/Upload/DxfUpload';
import { Color } from '@/constants/color';
import { useIntl, useModel } from '@umijs/max';
import { useMemoizedFn } from 'ahooks';
import { Button, ConfigProvider, Drawer, Row, Space, Steps } from 'antd';
import { useState } from 'react';
import CustomerSizeDrawer from '../CustomerSizeDrawer';
import styles from './index.less';

type Props = {
    autoGradingMethod?: 'upload' | 'useExist';
    open: boolean;
    onClose: () => void;
};

const LeftDrawer: React.FC<Props> = (props) => {
    const [openBaseSizeForm, setOpenBaseSizeForm] = useState(false);
    const [openSizeTable, setOpenSizeTable] = useState(false);
    const intl = useIntl();

    const {
        step,
        customerSize,
        customerId,
        customerName,
        downloadLoading,
        patternId,
        bustChestShape,
        bellyShape,
        shoulderShape,
        setRightRefDrawer,
        resetAll,
        download,
    } = useModel('AutoGrading.model', (model) => ({
        step: model.step,
        customerSize: model.customerSize,
        customerId: model.customerId,
        customerName: model.customerName,
        downloadLoading: model.downloadLoading,
        patternId: model.patternId,
        bustChestShape: model.bustChestShape,
        bellyShape: model.bellyShape,
        shoulderShape: model.shoulderShape,
        setRightRefDrawer: model.setRightRefDrawer,
        resetAll: model.resetAll,
        download: model.download,
    }));

    const { gender, category, setError } = useModel('globalModel', (model) => ({
        gender: model.gender,
        category: model.category,
        setError: model.setError,
    }));

    const {
        generateDxfLoading,
        generateDxfFileLoading,
        generatedBlocks,
        downloadReq,
        resetAllDxfScene,
        generateDxf,
        generateDxfFile,
    } = useModel('dxfSceneModel', (model) => ({
        generateDxfLoading: model.generateDxfLoading,
        generateDxfFileLoading: model.generateDxfFileLoading,
        generatedBlocks: model.generatedBlocks,
        downloadReq: model.downloadReq,
        resetAllDxfScene: model.resetAll,
        generateDxfFile: model.generateDxfFileRun,
        generateDxf: model.generateDxfRun,
    }));

    const { patternName, patternSize, dummySize, dummyName, dummyId, resetAllBasicSize } = useModel(
        'basicSizeFormModel',
        (model) => ({
            dummySize: model.dummySize,
            dummyName: model.dummyName,
            dummyId: model.dummyId,
            patternSize: model.patternSize,
            patternName: model.patternName,
            resetAllBasicSize: model.resetAll,
        }),
    );

    const { setStartPick, resetAllSelectPoints } = useModel('selectPointsDrawerModel', (model) => ({
        setStartPick: model.setStartPick,
        resetAllSelectPoints: model.resetAll,
    }));

    const { blocks, patternFile, resetUploadAll } = useModel('uploadModel', (model) => ({
        patternFile: model.patternFile,
        blocks: model.blocks,
        resetUploadAll: model.resetAll,
    }));

    const showBaseSizeForm = useMemoizedFn(() => {
        setOpenBaseSizeForm(true);
    });

    const onCloseBaseSizeForm = useMemoizedFn(() => {
        setOpenBaseSizeForm(false);
    });

    const startPick = useMemoizedFn(() => {
        setStartPick(true);
        setRightRefDrawer(true);
        props.onClose();
    });

    const reset = useMemoizedFn(() => {
        resetAll();
        resetUploadAll();
        resetAllBasicSize();
        resetAllSelectPoints();
        resetAllDxfScene();
    });

    const startGenerate = useMemoizedFn(() => {
        if (patternSize && (dummySize || dummyId) && customerSize && blocks.blocks) {
            if (props.autoGradingMethod === 'useExist') {
                // 如果是使用已有pattern，那么就不需要上传dxf文件
                generateDxf({
                    patternId: patternId,
                    patternSize: patternSize,
                    patternName: patternName,
                    category: category,
                    dummySize: dummyId ? undefined : dummySize,
                    dummyId: dummyId,
                    dummyName: dummyId ? undefined : dummyName,
                    customer: {
                        customerName: customerId ? undefined : customerName,
                        customerId: customerId,
                        customerSize: customerId ? undefined : customerSize,
                        bustChestShape: customerId ? undefined : bustChestShape,
                        bellyShape: customerId ? undefined : bellyShape,
                        shoulderShape: customerId ? undefined : shoulderShape,
                    },

                    dxfInfo: blocks.blocks,
                    gender: gender,
                });
            } else {
                if (!patternFile) {
                    setError(
                        intl.formatMessage({
                            id: 'message.api.missingParams',
                        }),
                    );
                    return;
                }
                generateDxfFile(
                    {
                        patternSizeStr: JSON.stringify(patternSize),
                        patternName: patternName,
                        category: category,
                        dummySizeStr: dummyId ? undefined : JSON.stringify(dummySize),
                        dummyId: dummyId,
                        dummyName: dummyId ? undefined : dummyName,
                        customerStr: JSON.stringify({
                            customerName: customerId ? undefined : customerName,
                            customerId: customerId,
                            customerSize: customerId ? undefined : customerSize,
                            bustChestShape: customerId ? undefined : bustChestShape,
                            bellyShape: customerId ? undefined : bellyShape,
                            shoulderShape: customerId ? undefined : shoulderShape,
                        }),
                        dxfInfoStr: JSON.stringify(blocks.blocks),
                        gender: gender,
                    },
                    patternFile,
                );
            }
        } else {
        }
    });

    const showSizeTable = useMemoizedFn(() => {
        setOpenSizeTable(true);
    });

    const onCloseSizeTable = useMemoizedFn(() => {
        setOpenSizeTable(false);
    });

    const startDownload = useMemoizedFn(() => {
        if (downloadReq) {
            download(downloadReq);
        } else {
            setError('downloadReq is null');
        }
    });

    return (
        <>
            <Drawer
                title={intl.formatMessage({
                    id: 'component.autoGrading.form.title',
                })}
                placement="left"
                onClose={props.onClose}
                open={props.open}
                footer={
                    <Row justify="end">
                        <Space>
                            {props.autoGradingMethod === 'upload' && (
                                <Button
                                    onClick={reset}
                                    disabled={step.status.s1Status === 'process'}
                                >
                                    {intl.formatMessage({
                                        id: 'component.form.resetAll',
                                    })}
                                </Button>
                            )}
                            {(!generatedBlocks || step.status.s4Status !== 'finish') && (
                                <Button
                                    type="primary"
                                    onClick={startGenerate}
                                    disabled={step.status.s4Status !== 'finish'}
                                    loading={generateDxfLoading || generateDxfFileLoading}
                                >
                                    {intl.formatMessage({
                                        id: 'component.autoGrading.form.generate',
                                    })}
                                </Button>
                            )}
                            {generatedBlocks && step.status.s4Status === 'finish' && (
                                <ConfigProvider
                                    theme={{
                                        token: {
                                            colorPrimary: Color.ACTION_BUTTON,
                                        },
                                    }}
                                >
                                    <Button
                                        type="primary"
                                        onClick={startDownload}
                                        loading={downloadLoading}
                                    >
                                        {intl.formatMessage({
                                            id: 'component.autoGrading.form.download',
                                        })}
                                    </Button>
                                </ConfigProvider>
                            )}
                        </Space>
                    </Row>
                }
            >
                <Steps
                    className={styles.stepItem}
                    direction="vertical"
                    current={step.current}
                    items={[
                        {
                            status: step.status.s1Status,
                            title: (
                                <DxfUpload
                                    actionType="autoGrading"
                                    disabled={props.autoGradingMethod === 'useExist'}
                                />
                            ),
                            description: step.msg.s1Msg,
                        },
                        {
                            status: step.status.s2Status,
                            title: (
                                <Button
                                    size="middle"
                                    onClick={showBaseSizeForm}
                                    disabled={
                                        step.current === 0 || props.autoGradingMethod === 'useExist'
                                    }
                                >
                                    {intl.formatMessage({
                                        id: 'component.uploadPattern.form.inputInfo',
                                    })}
                                </Button>
                            ),
                            description: step.msg.s2Msg,
                        },
                        {
                            status: step.status.s3Status,
                            title: (
                                <Button
                                    size="middle"
                                    onClick={startPick}
                                    disabled={
                                        step.current === 0 ||
                                        step.current === 1 ||
                                        props.autoGradingMethod === 'useExist'
                                    }
                                >
                                    {intl.formatMessage({
                                        id: 'component.uploadPattern.form.pickPoints',
                                    })}
                                </Button>
                            ),
                            description: step.msg.s3Msg,
                        },
                        {
                            status: step.status.s4Status,
                            title: (
                                <Button
                                    size="middle"
                                    onClick={showSizeTable}
                                    disabled={step.current !== 3}
                                >
                                    {intl.formatMessage({
                                        id: 'component.autoGrading.form.inputSizeTable',
                                    })}
                                </Button>
                            ),
                            description: step.msg.s4Msg,
                        },
                    ]}
                />
            </Drawer>
            <BaseSizeForm
                onClose={onCloseBaseSizeForm}
                open={openBaseSizeForm}
                actionType="autoGrading"
            />
            <CustomerSizeDrawer onClose={onCloseSizeTable} open={openSizeTable} />
        </>
    );
};
export default LeftDrawer;
