import { Constants } from '@/constants';
import { DummyRadio } from '@/constants/patterns';
import { CustomerSizeItems } from '@/constants/sizeTable';
import { DrawerForm } from '@ant-design/pro-components';
import { useIntl, useModel } from '@umijs/max';
import { useMemoizedFn } from 'ahooks';
import { Button, Form, Space } from 'antd';
import { useEffect } from 'react';
import CustomerSizeForm from './components/CustomerSizeForm';

type Props = {
    open: boolean;
    onClose: () => void;
};

const CustomerSizeDrawer: React.FC<Props> = (props) => {
    const [form] = Form.useForm();
    const intl = useIntl();

    const {
        step,
        customerSize,
        customerName,
        customerId,
        setStep,
        setCustomerSize,
        setCustomerName,
        setCustomerId,
        setBustChestShape,
        setBellyShape,
        setShoulderShape,
    } = useModel('AutoGrading.model', (model) => ({
        step: model.step,
        customerSize: model.customerSize,
        customerName: model.customerName,
        customerId: model.customerId,
        setStep: model.setStep,
        setCustomerSize: model.setCustomerSize,
        setCustomerName: model.setCustomerName,
        setCustomerId: model.setCustomerId,
        setBustChestShape: model.setBustChestShape,
        setBellyShape: model.setBellyShape,
        setShoulderShape: model.setShoulderShape,
    }));

    const { category, gender, setSuccess } = useModel('globalModel', (model) => ({
        category: model.category,
        gender: model.gender,
        setSuccess: model.setSuccess,
    }));

    const { resetAllDxfScene } = useModel('dxfSceneModel', (model) => ({
        resetAllDxfScene: model.resetAll,
    }));

    useEffect(() => {
        // 有缓存数据的话直接填充
        if (customerSize) {
            for (let [k, v] of Object.entries(customerSize)) {
                form.setFieldValue(k, v.size);
            }
        }
        form.setFieldsValue({
            customerRadio: customerId ? DummyRadio.CHOOSE : DummyRadio.INPUT,
            customerName: customerName,
            customer: customerId,
        });
    }, []);

    // 提交表单且数据验证成功后回调事件
    const onFinish = useMemoizedFn(async (formData: any) => {
        setSuccess(
            intl.formatMessage({
                id: 'message.saveSuccess',
            }),
        );
        setCustomerName(formData.customerName);
        setBustChestShape(formData.bustChestShape);
        setBellyShape(formData.bellyShape);
        setShoulderShape(formData.shoulderShape);
        const customerSizeObj: Record<string, any> = {};
        CustomerSizeItems.forEach((item) => {
            customerSizeObj[item.key] = { name: item.label, size: formData[item.key] };
        });
        setCustomerSize(customerSizeObj);
        setStep({
            current: 3,
            status: { ...step.status, s4Status: 'finish' },
            msg: {
                ...step.msg,
                s4Msg: intl.formatMessage({
                    id: 'component.autoGrading.form.basicInfo.dataSaved',
                }),
            },
        });
        resetAllDxfScene();
        props.onClose();
    });

    //提交表单且数据验证失败后回调事件
    const onFinishFailed = useMemoizedFn((errorInfo: any) => {
        console.log('Failed:', errorInfo);
    });

    const forTest = useMemoizedFn(() => {
        setCustomerId(undefined);
        if (category === Constants.SKIRTS) {
            form.setFieldsValue({
                customerRadio: DummyRadio.INPUT,
                customerName: 'skirts',
                waistTrousers: 64.94,
                hip: 89,
                outseam: 105.38,
            });
        } else if (category === Constants.DRESS) {
            form.setFieldsValue({
                customerRadio: DummyRadio.INPUT,
                customerName: 'dress-missy10',
                bust: 82.5,
                backLength: 40.5,
                waist: 60,
                hip: 89,
                armlength: 58,
                acrossShoulder: 38,
            });
        } else if (category === Constants.JACKET) {
            if (gender === 'female') {
                form.setFieldsValue({
                    customerRadio: DummyRadio.INPUT,
                    customerName: 'jacket-missy10',
                    bust: 82.5,
                    backLength: 40.5,
                    waist: 60,
                    armlength: 58,
                    acrossShoulder: 38,
                });
            } else {
                form.setFieldsValue({
                    customerRadio: DummyRadio.INPUT,
                    customerName: 'jacket-itcs',
                    bust: 89.85,
                    backLengthBNP: 45.69,
                    waist: 76.97,
                    armlength: 55.86,
                    acrossShoulder: 0,
                });
            }
        } else if (category === Constants.SHIRT) {
            if (gender === 'female') {
                form.setFieldsValue({
                    customerRadio: DummyRadio.INPUT,
                    customerName: 'shirt-missy10',
                    bust: 82.5,
                    backLength: 40.5,
                    waist: 60,
                    armlength: 58,
                    acrossShoulder: 38,
                });
            } else {
                form.setFieldsValue({
                    customerRadio: DummyRadio.INPUT,
                    customerName: 'shirt-itcs',
                    bust: 89.85,
                    backLengthBNP: 45.69,
                    waist: 76.97,
                    armlength: 55.86,
                    shoulderLength: 14,
                });
            }
        } else {
            if (gender === 'male') {
                form.setFieldsValue({
                    customerRadio: DummyRadio.INPUT,
                    customerName: 'pants-itcs',
                    waistTrousers: 84.5,
                    hip: 93.4,
                    inseam: 68.2,
                    outseam: 86.56,
                });
            } else {
                form.setFieldsValue({
                    customerRadio: DummyRadio.INPUT,
                    customerName: 'pants-missy10',
                    waistTrousers: 77.8,
                    hip: 89.1,
                    inseam: 76,
                    outseam: 96.1,
                });
            }
        }
    });

    const onReset = useMemoizedFn(() => {
        setStep({
            current: 3,
            status: customerSize ? { ...step.status, s4Status: 'error' } : step.status,
            msg: customerSize
                ? {
                      ...step.msg,
                      s4Msg: intl.formatMessage({
                          id: 'component.autoGrading.form.customerSizeReset',
                      }),
                  }
                : step.msg,
        });
        resetAllDxfScene();
        setCustomerSize(undefined);
        setCustomerName(undefined);
        setCustomerId(undefined);
        form.resetFields();
    });

    const onSubmit = useMemoizedFn(() => {
        form.submit();
    });

    return (
        <>
            <DrawerForm
                title={intl.formatMessage({
                    id: 'component.autoGrading.form.sizeTable',
                })}
                width={window.innerWidth * 0.7}
                form={form}
                open={props.open}
                drawerProps={{
                    onClose: props.onClose,
                    placement: 'right',
                    extra: (
                        <Space>
                            <Button onClick={forTest}>For Test</Button>
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
                submitter={false}
                onFinish={onFinish} // 提交表单且数据验证成功后回调事件
                onFinishFailed={onFinishFailed} //提交表单且数据验证失败后回调事件
            >
                <CustomerSizeForm form={form} />
            </DrawerForm>
        </>
    );
};

export default CustomerSizeDrawer;
