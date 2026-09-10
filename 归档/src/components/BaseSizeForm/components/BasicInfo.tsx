import { ProFormText } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Col, Row, Typography } from 'antd';

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
                    <ProFormText
                        name={'patternName'}
                        label={intl.formatMessage({
                            id: 'component.uploadPattern.form.basicInfo.patternName',
                        })}
                        rules={[
                            {
                                required: true,
                            },
                        ]}
                    />
                </Col>
            </Row>
        </>
    );
};
export default BasicInfo;
