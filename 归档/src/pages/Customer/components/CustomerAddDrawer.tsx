import { CustomerSizeItems } from '@/constants/sizeTable';
import { GolangServerCode } from '@/requestConfig';
import { ApiType, handleApiError } from '@/utils/errHandler';
import { DrawerForm } from '@ant-design/pro-components';
import { useIntl, useModel } from '@umijs/max';
import { useMemoizedFn } from 'ahooks';
import { Button, Form, Space } from 'antd';
import CustomerSizeForm from './CustomerSizeForm';

type Props = {
    open: boolean;
    onClose: () => void;
    tableAction: any;
};

const CustomerAddDrawer: React.FC<Props> = (props) => {
    const [form] = Form.useForm();
    const intl = useIntl();

    const { createCustomerLoading, createCustomer } = useModel('Customer.model', (model) => ({
        createCustomerLoading: model.createCustomerLoading,
        createCustomer: model.createCustomerRun,
    }));

    const { setError, setSuccess } = useModel('globalModel', (model) => ({
        setError: model.setError,
        setSuccess: model.setSuccess,
    }));

    // 提交表单且数据验证成功后回调事件
    const onFinish = useMemoizedFn(async (formData: any) => {
        const customerSizeObj: Record<string, any> = {};
        CustomerSizeItems.forEach((item) => {
            customerSizeObj[item.key] = { name: item.label, size: formData[item.key] };
        });
        createCustomer({
            customerName: formData.customerName,
            bustChestShape: formData.bustChestShape,
            bellyShape: formData.bellyShape,
            shoulderShape: formData.shoulderShape,
            customerSize: JSON.stringify(customerSizeObj),
        })
            .then((resp) => {
                if (resp && resp.code === GolangServerCode.SUCCESS && resp.data) {
                    setSuccess(intl.formatMessage({ id: 'message.api.saveSuccess' }));
                    props.tableAction.reload();
                    props.onClose();
                } else {
                    setError('createCustomer failed');
                }
            })
            .catch((err) => {
                setError(handleApiError(err, ApiType.CreateCustomer));
            });
    });

    //提交表单且数据验证失败后回调事件
    const onFinishFailed = useMemoizedFn((errorInfo: any) => {
        console.log('Failed:', errorInfo);
    });

    const forTest = useMemoizedFn(() => {
        form.setFieldsValue({
            customerName: 'test',
            waistTrousers: 77.3,
            hip: 89,
            inseam: 76.7,
            outseam: 97.5,
        });
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
                    onClose: props.onClose,
                    placement: 'right',
                    destroyOnClose: true,
                    extra: (
                        <Space>
                            <Button onClick={forTest}>For Test</Button>
                            <Button onClick={onReset}>
                                {intl.formatMessage({
                                    id: 'component.form.reset',
                                })}
                            </Button>
                            <Button
                                type="primary"
                                onClick={onSubmit}
                                loading={createCustomerLoading}
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

export default CustomerAddDrawer;
