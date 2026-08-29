import { useIntl } from '@umijs/max';
import { Col, Form, Input, Row, Typography } from 'antd';

const { Title } = Typography;

const BasicInfo: React.FC = () => {
    const intl = useIntl();
    return (
        <>
            <Row>
                <Title level={3}>
                    {intl.formatMessage({
                        id: 'component.uploadPattern.form.basicInfo.title',
                    })}
                </Title>
            </Row>
            <Row gutter={16}>
                <Col span={6}>
                    <Form.Item
                        name={'patternName'}
                        label={intl.formatMessage({
                            id: 'component.uploadPattern.form.basicInfo.patternName',
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
                <Col span={6}>
                    <Form.Item
                        name={'category'}
                        label={intl.formatMessage({
                            id: 'component.uploadPattern.form.basicInfo.category',
                        })}
                        rules={[
                            {
                                required: true,
                                message: intl.formatMessage({
                                    id: 'component.uploadPattern.form.basicInfo.categoryPlaceholder',
                                }),
                            },
                        ]}
                    >
                        <Input
                            placeholder={intl.formatMessage({
                                id: 'component.uploadPattern.form.basicInfo.categoryPlaceholder',
                            })}
                            readOnly
                        />
                    </Form.Item>
                </Col>
            </Row>
        </>
    );
};
export default BasicInfo;
