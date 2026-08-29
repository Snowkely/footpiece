import { BaseDummySizeItems } from '@/constants/baseSize';
import { DrawerForm } from '@ant-design/pro-components';
import { useIntl, useModel } from '@umijs/max';
import { useMemoizedFn } from 'ahooks';
import { Button, Form, Space } from 'antd';
import DummySizeForm from './DummySizeForm';

type Props = {
    open: boolean;
    onClose: () => void;
};

const NewDummyDrawer: React.FC<Props> = (props) => {
    const [form] = Form.useForm();
    const intl = useIntl();

    const { createDummyLoading, createDummy } = useModel('DummyManagement.model', (model) => ({
        createDummyLoading: model.createDummyLoading,
        createDummy: model.createDummyRun,
    }));

    // 提交表单且数据验证成功后回调事件
    const onFinish = useMemoizedFn(async (formData: any) => {
        const dummySizeObj: Record<string, any> = {};
        BaseDummySizeItems.forEach((item) => {
            dummySizeObj[item.name] = { name: item.label, size: formData[item.key] };
        });
        createDummy({
            dummyName: formData.dummyName,
            dummySize: JSON.stringify(dummySizeObj),
        });
    });

    //提交表单且数据验证失败后回调事件
    const onFinishFailed = useMemoizedFn((errorInfo: any) => {
        console.log('Failed:', errorInfo);
    });

    const forTest = useMemoizedFn(() => {
        form.setFieldsValue({
            dummyHeight: 165,
            dummyWaistTrousers: 79.5,
            dummyHip: 90.8,
            dummyInseam: 79.4,
            dummyOutseam: 83.6,
            dummyThigh: 55.7,
            dummyKnee: 36.7,
            dummyCalf: 35.1,
            dummyAnkle: 23.7,
            dummyName: 'dummy',
        });
    });

    const onReset = useMemoizedFn(() => {
        form.resetFields();
    });

    const onSubmit = useMemoizedFn(() => {
        form.submit();
    });

    return (
        <DrawerForm
            title={intl.formatMessage({
                id: 'component.dummyManagement.tab.addNewDummy',
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
            loading={createDummyLoading}
        >
            <DummySizeForm />
        </DrawerForm>
    );
};

export default NewDummyDrawer;
