import { CustomerSizeItems } from '@/constants/sizeTable';
import { GolangServerCode } from '@/requestConfig';
import { ApiType, handleApiError } from '@/utils/errHandler';
import { DrawerForm } from '@ant-design/pro-components';
import { useIntl, useModel } from '@umijs/max';
import { useMemoizedFn } from 'ahooks';
import { Button, Form, Space } from 'antd';
import { useEffect } from 'react';
import CustomerSizeForm from './CustomerSizeForm';

type Props = {
    open: boolean;
    customerId?: string;
    onClose: () => void;
    tableAction: any;
};

const CustomerEditDrawer: React.FC<Props> = (props) => {
    const [form] = Form.useForm();
    const intl = useIntl();

    const { updateCustomerLoading, getCustomer, updateCustomer } = useModel(
        'Customer.model',
        (model) => ({
            updateCustomerLoading: model.updateCustomerLoading,
            getCustomer: model.getCustomerRun,
            updateCustomer: model.updateCustomerRun,
        }),
    );

    const { setError, setSuccess } = useModel('globalModel', (model) => ({
        setError: model.setError,
        setSuccess: model.setSuccess,
    }));

    useEffect(() => {
        if (props.open && props.customerId) {
            getCustomer({
                id: props.customerId,
            })
                .then((resp) => {
                    if (
                        resp &&
                        resp.data &&
                        resp.code === GolangServerCode.SUCCESS &&
                        resp.data &&
                        resp.data.size
                    ) {
                        const formValues: Record<string, any> = {};
                        const sizeDetails: API.CustomerSize = JSON.parse(resp.data.size);
                        Object.entries(sizeDetails).forEach(([key, value]) => {
                            formValues[key] = value.size;
                        });
                        form.setFieldsValue({
                            ...formValues,
                            customerName: resp.data.name,
                            bustChestShape: resp.data.bustChestShape,
                            bellyShape: resp.data.bellyShape,
                            shoulderShape: resp.data.shoulderShape,
                        });
                    }
                })
                .catch((err) => {
                    setError(handleApiError(err, ApiType.GetCustomer));
                });
        }
    }, [props.open]);

    const onClose = useMemoizedFn(() => {
        props.onClose();
    });

    // 提交表单且数据验证成功后回调事件
    const onFinish = useMemoizedFn(async (formData: any) => {
        const customerSizeObj: Record<string, any> = {};
        CustomerSizeItems.forEach((item) => {
            customerSizeObj[item.key] = { name: item.label, size: formData[item.key] };
        });
        updateCustomer({
            customerId: props.customerId,
            customerName: formData.customerName,
            bustChestShape: formData.bustChestShape,
            bellyShape: formData.bellyShape,
            shoulderShape: formData.shoulderShape,
            customerSize: JSON.stringify(customerSizeObj),
        })
            .then((resp) => {
                if (resp && resp.code === GolangServerCode.SUCCESS && resp.data) {
                    setSuccess(intl.formatMessage({ id: 'message.api.updateSuccess' }));
                    props.tableAction.reload();
                    onClose();
                } else {
                    setError('updateCustomer failed');
                }
            })
            .catch((err) => {
                setError(handleApiError(err, ApiType.UpdateCustomer));
            });
    });

    //提交表单且数据验证失败后回调事件
    const onFinishFailed = useMemoizedFn((errorInfo: any) => {
        console.log('Failed:', errorInfo);
    });

    const onReset = useMemoizedFn(() => {
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
                    onClose: onClose,
                    placement: 'right',
                    destroyOnClose: true,
                    extra: (
                        <Space>
                            <Button onClick={onReset}>
                                {intl.formatMessage({
                                    id: 'component.form.reset',
                                })}
                            </Button>
                            <Button
                                type="primary"
                                onClick={onSubmit}
                                loading={updateCustomerLoading}
                            >
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
                <CustomerSizeForm />
            </DrawerForm>
        </>
    );
};

export default CustomerEditDrawer;
