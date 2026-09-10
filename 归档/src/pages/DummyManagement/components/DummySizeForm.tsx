import { BaseDummySizeItems } from '@/constants/baseSize';
import { ProForm, ProFormDigit, ProFormText } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Col, Row, Typography } from 'antd';

const { Title } = Typography;

const DummySizeForm: React.FC = () => {
    const intl = useIntl();

    return (
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
                    <ProFormText
                        name={'dummyName'}
                        label={intl.formatMessage({
                            id: 'component.uploadPattern.form.basicInfo.dummyName',
                        })}
                        rules={[
                            {
                                required: true,
                            },
                        ]}
                    />
                </Col>
            </Row>
            <ProForm.Group>
                {BaseDummySizeItems.map((item, index) => (
                    <ProFormDigit
                        key={index}
                        label={intl.formatMessage({
                            id: item.intlId,
                        })}
                        name={item.key}
                        min={0}
                        rules={[
                            {
                                required: item.required,
                            },
                        ]}
                    />
                ))}
            </ProForm.Group>
        </>
    );
};
export default DummySizeForm;
