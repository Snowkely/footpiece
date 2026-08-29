import BaseSizeForm from '@/components/BaseSizeForm';
import DxfUpload from '@/components/Upload/DxfUpload';
import { useIntl, useModel } from '@umijs/max';
import { useMemoizedFn } from 'ahooks';
import { Button, Drawer, Row, Space, Steps } from 'antd';
import { useState } from 'react';
import styles from './index.less';

type Props = {
    open: boolean;
    onClose: () => void;
};

const LeftDrawer: React.FC<Props> = (props) => {
    const [openBaseSizeForm, setOpenBaseSizeForm] = useState(false);
    const intl = useIntl();

    const { step, createPatternLoading, setRightRefDrawer, resetAll, createPattern } = useModel(
        'UploadPattern.model',
        (model) => ({
            step: model.step,
            createPatternLoading: model.createPatternLoading,
            setRightRefDrawer: model.setRightRefDrawer,
            resetAll: model.resetAll,
            createPattern: model.createPatternRun,
        }),
    );

    const { gender, category, setError } = useModel('globalModel', (model) => ({
        gender: model.gender,
        category: model.category,
        setError: model.setError,
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
    });

    const startUpload = useMemoizedFn(() => {
        if (patternSize && (dummySize || dummyId) && blocks.blocks) {
            createPattern(
                {
                    category: category,
                    dxfInfo: JSON.stringify(blocks.blocks),
                    patternName: patternName,
                    dummyId: dummyId,
                    dummyName: dummyId ? undefined : dummyName,
                    patternSizeStr: JSON.stringify(patternSize),
                    dummySizeStr: dummyId ? undefined : JSON.stringify(dummySize),
                    gender: gender,
                },
                patternFile,
            );
        } else {
            setError(
                intl.formatMessage({
                    id: 'message.api.missingParams',
                }),
            );
        }
    });

    return (
        <>
            <Drawer
                title={intl.formatMessage({
                    id: 'pages.home.panel.uploadPattern.title',
                })}
                placement="left"
                onClose={props.onClose}
                open={props.open}
                footer={
                    <Row justify="end">
                        <Space>
                            <Button onClick={reset} disabled={step.status.s1Status === 'process'}>
                                {intl.formatMessage({
                                    id: 'component.form.resetAll',
                                })}
                            </Button>
                            <Button
                                type="primary"
                                onClick={startUpload}
                                disabled={step.status.s3Status !== 'finish'}
                                loading={createPatternLoading}
                            >
                                {intl.formatMessage({
                                    id: 'component.uploadPattern.form.upload',
                                })}
                            </Button>
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
                            title: <DxfUpload actionType="uploadPattern" />,
                            description: step.msg.s1Msg,
                        },
                        {
                            status: step.status.s2Status,
                            title: (
                                <Button
                                    size="middle"
                                    onClick={showBaseSizeForm}
                                    disabled={step.current === 0}
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
                                    disabled={step.current !== 2}
                                >
                                    {intl.formatMessage({
                                        id: 'component.uploadPattern.form.pickPoints',
                                    })}
                                </Button>
                            ),
                            description: step.msg.s3Msg,
                        },
                    ]}
                />
            </Drawer>
            <BaseSizeForm
                onClose={onCloseBaseSizeForm}
                open={openBaseSizeForm}
                actionType="uploadPattern"
            />
        </>
    );
};
export default LeftDrawer;
