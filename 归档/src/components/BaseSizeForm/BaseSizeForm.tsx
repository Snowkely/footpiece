/* eslint-disable @typescript-eslint/no-unused-vars */
import { Constants } from '@/constants';
import { BaseDummySizeItems, BasePatternSizeItems } from '@/constants/baseSize';
import { DummyRadio } from '@/constants/patterns';
import { firstLetterUpper } from '@/utils/utils';
import { DrawerForm } from '@ant-design/pro-components';
import { useIntl, useModel } from '@umijs/max';
import { useMemoizedFn } from 'ahooks';
import { Button, Form, Space } from 'antd';
import { useEffect } from 'react';
import BasicInfo from './components/BasicInfo';
import DummySizeForm from './components/DummySizeForm';
import PatternSizeForm from './components/PatternSizeForm';

type Props = {
    open: boolean;
    onClose: () => void;
    actionType: 'uploadPattern' | 'autoGrading';
};

const BaseSizeForm: React.FC<Props> = (props) => {
    const [form] = Form.useForm();
    const intl = useIntl();

    const {
        patternSize,
        patternName,
        dummySize,
        dummyName,
        dummyId,
        setDummySize,
        setDummyId,
        setPatternSize,
        setPatternName,
        setDummyName,
    } = useModel('basicSizeFormModel', (model) => ({
        patternSize: model.patternSize,
        patternName: model.patternName,
        dummySize: model.dummySize,
        dummyName: model.dummyName,
        dummyId: model.dummyId,
        setDummySize: model.setDummySize,
        setDummyId: model.setDummyId,
        setPatternSize: model.setPatternSize,
        setPatternName: model.setPatternName,
        setDummyName: model.setDummyName,
    }));

    const { category, gender, setSuccess } = useModel('globalModel', (model) => ({
        category: model.category,
        gender: model.gender,
        setSuccess: model.setSuccess,
    }));

    const { stepAutoGrading, setStepAutoGrading } = useModel('AutoGrading.model', (model) => ({
        stepAutoGrading: model.step,
        setStepAutoGrading: model.setStep,
    }));

    const { stepUploadPattern, setStepUploadPattern } = useModel(
        'UploadPattern.model',
        (model) => ({
            stepUploadPattern: model.step,
            setStepUploadPattern: model.setStep,
        }),
    );

    const { resetAllDxfScene } = useModel('dxfSceneModel', (model) => ({
        resetAllDxfScene: model.resetAll,
    }));

    useEffect(() => {
        // 有缓存数据的话直接填充
        if (dummySize) {
            for (let [k, v] of Object.entries(dummySize)) {
                form.setFieldValue(`dummy${firstLetterUpper(k)}`, v.size);
            }
        }
        if (patternSize) {
            for (let [k, v] of Object.entries(patternSize)) {
                form.setFieldValue(`pattern${firstLetterUpper(k)}`, v.size);
            }
        }
        form.setFieldsValue({
            patternName: patternName,
            dummyRadio: dummyId ? DummyRadio.CHOOSE : DummyRadio.INPUT,
            dummy: dummyId,
        });
    }, []);

    const onReset = useMemoizedFn(() => {
        resetAllDxfScene();
        if (props.actionType === 'autoGrading') {
            setStepAutoGrading({
                current: 1,
                status: patternSize
                    ? {
                          ...stepAutoGrading.status,
                          s2Status: 'error',
                          s3Status: 'wait',
                          s4Status: 'wait',
                      }
                    : stepAutoGrading.status,
                msg: patternSize
                    ? {
                          ...stepAutoGrading.msg,
                          s2Msg: intl.formatMessage({
                              id: 'component.uploadPattern.form.baseSizeReset',
                          }),
                          s3Msg: '',
                          s4Msg: '',
                      }
                    : stepAutoGrading.msg,
            });
        } else {
            setStepUploadPattern({
                current: 1,
                status: patternSize
                    ? { ...stepUploadPattern.status, s2Status: 'error', s3Status: 'wait' }
                    : stepUploadPattern.status,
                msg: patternSize
                    ? {
                          ...stepUploadPattern.msg,
                          s2Msg: intl.formatMessage({
                              id: 'component.uploadPattern.form.baseSizeReset',
                          }),
                          s3Msg: '',
                      }
                    : stepUploadPattern.msg,
            });
        }
        setDummySize(undefined);
        setDummyId(undefined);
        setPatternSize(undefined);
        setPatternName(undefined);
        setDummyName(undefined);
        form.resetFields();
    });

    const onSubmit = useMemoizedFn(() => {
        form.submit();
    });

    // only for tetst
    const onFill = useMemoizedFn(() => {
        setDummyId(undefined);
        if (category === Constants.SKIRTS) {
            form.setFieldsValue({
                patternName: 'skirts',
                category: intl.formatMessage({
                    id: 'component.patternPropsSelect.skirts',
                }),
                dummyWaistTrousers: 68.52,
                dummyHip: 90,
                dummyOutseam: 105.6,
                dummyName: 'skirts',
                dummyRadio: DummyRadio.INPUT,
                patternWaistTrousers: 69.3,
                patternHip: 92.5,
                patternOutseam: 36.28,
                patternWaistband: 4,
            });
        } else if (category === Constants.DRESS) {
            form.setFieldsValue({
                patternName: 'dress',
                category: intl.formatMessage({
                    id: 'component.patternPropsSelect.dress',
                }),
                dummyBust: 82,
                dummyBackLength: 42.5,
                dummyWaist: 64,
                dummyHip: 90,
                dummyArmlength: 58,
                dummyAcrossShoulder: 37,
                dummyName: 'dress',
                dummyRadio: DummyRadio.INPUT,
                patternBust: 92.02,
                patternBackLength: 106.6,
                patternWaist: 84.96,
                patternHip: 93,
                patternArmlength: 35,
                patternAcrossShoulder: 36.6,
            });
        } else if (category === Constants.JACKET) {
            if (gender === 'female') {
                form.setFieldsValue({
                    patternName: 'female-jacket',
                    category: intl.formatMessage({
                        id: 'component.patternPropsSelect.jacket',
                    }),
                    dummyBust: 82,
                    dummyBackLength: 42.5,
                    dummyWaist: 64,
                    dummyArmlength: 58,
                    dummyAcrossShoulder: 37,
                    dummyName: 'female-jacket',
                    dummyRadio: DummyRadio.INPUT,
                    patternBust: 96,
                    patternBackLength: 63.16,
                    patternWaist: 90.48,
                    patternArmlength: 61.33,
                    patternAcrossShoulder: 38.22,
                });
            } else {
                form.setFieldsValue({
                    patternName: 'male-jacket',
                    category: intl.formatMessage({
                        id: 'component.patternPropsSelect.jacket',
                    }),
                    dummyBust: 98.01,
                    dummyBackLengthBNP: 45.5,
                    dummyWaist: 83.26,
                    dummyHip: 96.47,
                    dummyArmlength: 61.41,
                    dummyAcrossShoulder: 45.07,
                    dummyShoulderLength: 14,
                    dummyName: 'male-jacket',
                    dummyRadio: DummyRadio.INPUT,
                    patternBust: 109.694,
                    patternBackLengthBNP: 70.69,
                    patternWaist: 96.1632148297666,
                    patternArmlength: 61.41,
                    patternShoulderLength: 14,
                });
            }
        } else if (category === Constants.SHIRT) {
            if (gender === 'female') {
                form.setFieldsValue({
                    patternName: 'female-shirt',
                    category: intl.formatMessage({
                        id: 'component.patternPropsSelect.shirt',
                    }),
                    dummyBust: 82,
                    dummyBackLength: 42.5,
                    dummyWaist: 64,
                    dummyHip: 102.1,
                    dummyArmlength: 58,
                    dummyAcrossShoulder: 37,
                    dummyName: 'female-shirt',
                    dummyRadio: DummyRadio.INPUT,
                    patternBust: 96.5,
                    patternBackLength: 56.71,
                    patternWaist: 93.36,
                    patternArmlength: 59.4,
                    patternAcrossShoulder: 38.4,
                });
            } else {
                form.setFieldsValue({
                    patternName: 'male-shirt',
                    category: intl.formatMessage({
                        id: 'component.patternPropsSelect.shirt',
                    }),
                    dummyHeight: 174.3,
                    dummyBust: 101.575,
                    dummyBackLengthBNP: 45.68,
                    dummyWaist: 86.5666666666667,
                    dummyHip: 102.1,
                    dummyArmlength: 60.3083333333333,
                    dummyShoulderLength: 14,
                    dummyName: 'male-shirt',
                    dummyRadio: DummyRadio.INPUT,
                    patternBust: 103.95,
                    patternBackLengthBNP: 40.9,
                    patternWaist: 94,
                    patternArmlength: 65.5,
                    patternShoulderLength: 14,
                });
            }
        } else {
            if (gender === 'male') {
                form.setFieldsValue({
                    patternName: 'pants-male',
                    category: intl.formatMessage({
                        id: 'component.patternPropsSelect.pants',
                    }),
                    dummyHeight: 187.96,
                    dummyWaistTrousers: 84.77,
                    dummyHip: 95.25,
                    dummyInseam: 76.1,
                    dummyOutseam: 99.2,
                    dummyThigh: 55.88,
                    dummyKnee: 37.4,
                    dummyCalf: 37.4,
                    dummyAnkle: 24.26,
                    dummyName: 'pants-male',
                    dummyRadio: DummyRadio.INPUT,
                    patternWaistTrousers: 84.94,
                    patternHip: 98.4,
                    patternInseam: 73.92,
                    patternOutseam: 92,
                    patternDartWidth: 1.5,
                    patternCrotchHeight: 19.8,
                    patternRise: 54.9,
                });
            } else {
                form.setFieldsValue({
                    patternName: 'pants-female',
                    category: intl.formatMessage({
                        id: 'component.patternPropsSelect.pants',
                    }),
                    dummyHeight: 165,
                    dummyWaistTrousers: 79.5,
                    dummyHip: 90.8,
                    dummyInseam: 79.4,
                    dummyOutseam: 83.57,
                    dummyThigh: 55.7,
                    dummyKnee: 36.7,
                    dummyCalf: 35.1,
                    dummyAnkle: 23.7,
                    dummyName: 'pants-female',
                    dummyRadio: DummyRadio.INPUT,
                    patternWaistTrousers: 85.4,
                    patternHip: 94.2,
                    patternInseam: 73.7,
                    patternOutseam: 83.57,
                    patternDartWidth: 1.5,
                    patternCrotchHeight: 19.8,
                    patternRise: 54.9,
                });
            }
        }
    });

    // 提交表单且数据验证成功后回调事件
    const onFinish = useMemoizedFn(async (values: any) => {
        console.log('Success:', values);
        setSuccess(
            intl.formatMessage({
                id: 'message.saveSuccess',
            }),
        );
        setPatternName(values.patternName);
        setDummyName(values.dummyName);
        const patternSizeObj: Record<string, any> = {};
        BasePatternSizeItems.forEach((item) => {
            patternSizeObj[item.name] = { name: item.label, size: values[item.key] };
        });
        setPatternSize(patternSizeObj);
        const dummySizeObj: Record<string, any> = {};
        BaseDummySizeItems.forEach((item) => {
            dummySizeObj[item.name] = { name: item.label, size: values[item.key] };
        });
        setDummySize(dummySizeObj);
        if (props.actionType === 'autoGrading') {
            setStepAutoGrading({
                current: 2,
                status: {
                    ...stepAutoGrading.status,
                    s2Status: 'finish',
                    s3Status: 'process',
                    s4Status: 'wait',
                },
                msg: {
                    ...stepAutoGrading.msg,
                    s2Msg: intl.formatMessage({
                        id: 'component.uploadPattern.form.baseSizeSaved',
                    }),
                    s3Msg: '',
                    s4Msg: '',
                },
            });
        } else {
            setStepUploadPattern({
                current: 2,
                status: { ...stepUploadPattern.status, s2Status: 'finish', s3Status: 'process' },
                msg: {
                    ...stepUploadPattern.msg,
                    s2Msg: intl.formatMessage({
                        id: 'component.uploadPattern.form.baseSizeSaved',
                    }),
                    s3Msg: '',
                },
            });
        }
        resetAllDxfScene();
        props.onClose();
    });

    //提交表单且数据验证失败后回调事件
    const onFinishFailed = useMemoizedFn((errorInfo: any) => {
        console.log('Failed:', errorInfo);
    });

    const onClose = useMemoizedFn(() => {
        props.onClose();
    });

    return (
        <>
            <DrawerForm
                title={intl.formatMessage({
                    id: 'component.uploadPattern.form.baseSizeFormTitle',
                })}
                width={window.innerWidth * 0.7}
                form={form}
                open={props.open}
                autoFocusFirstInput
                scrollToFirstError
                drawerProps={{
                    onClose: onClose,
                    placement: 'right',
                    extra: (
                        <Space>
                            <Button onClick={onFill}>For Test</Button>
                            <Button onClick={onReset}>
                                {intl.formatMessage({
                                    id: 'component.form.reset',
                                })}
                            </Button>
                            <Button type="primary" onClick={onSubmit}>
                                {intl.formatMessage({
                                    id: 'component.form.save',
                                })}
                            </Button>
                        </Space>
                    ),
                }}
                // requiredMark={customizeRequiredMark}
                submitTimeout={2000}
                onFinish={onFinish}
                onFinishFailed={onFinishFailed}
                submitter={false}
            >
                <BasicInfo />
                <DummySizeForm form={form} />
                <PatternSizeForm />
            </DrawerForm>
        </>
    );
};
export default BaseSizeForm;
