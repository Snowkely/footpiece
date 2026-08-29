import { BaseDummySizeItems } from '@/constants/baseSize';
import { ProForm } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Col, Form, Input, Row, Typography } from 'antd';

const { Title } = Typography;

type Props = {
    formValues: any;
};

const DummySizeDisplayForm: React.FC<Props> = (props) => {
    const intl = useIntl();
    const [form] = Form.useForm();

    return (
        <>
            <ProForm form={form} initialValues={props.formValues} submitter={false}>
                <>
                    <Row>
                        <Title level={3}>
                            {intl.formatMessage({
                                id: 'component.uploadPattern.form.dummySize',
                            })}{' '}
                            (cm)
                        </Title>
                    </Row>
                    <Row gutter={16}>
                        <Col span={6}>
                            <Form.Item
                                name={'dummyName'}
                                label={intl.formatMessage({
                                    id: 'component.uploadPattern.form.basicInfo.dummyName',
                                })}
                                rules={[
                                    {
                                        required: true,
                                    },
                                ]}
                            >
                                <Input readOnly />
                            </Form.Item>
                        </Col>
                    </Row>
                    <ProForm.Group>
                        {BaseDummySizeItems.map((item, index) => (
                            <Form.Item
                                key={index}
                                label={intl.formatMessage({
                                    id: item.intlId,
                                })}
                                name={item.key}
                                rules={[
                                    {
                                        required: item.required,
                                    },
                                ]}
                            >
                                <Input readOnly />
                            </Form.Item>
                        ))}
                    </ProForm.Group>
                </>
            </ProForm>
        </>
    );
};
export default DummySizeDisplayForm;
