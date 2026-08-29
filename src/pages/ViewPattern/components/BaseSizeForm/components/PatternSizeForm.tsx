import { BasePatternSizeItems } from '@/constants/baseSize';
import { ProForm } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Form, Input, Row, Typography } from 'antd';

const { Title } = Typography;

type Props = {
    t?: number;
};

const PatternSizeForm: React.FC<Props> = () => {
    const intl = useIntl();

    return (
        <>
            <Row>
                <Title level={3}>
                    {intl.formatMessage({
                        id: 'component.uploadPattern.form.basicPatternSize',
                    })}{' '}
                    (cm)
                </Title>
            </Row>
            <ProForm.Group>
                {BasePatternSizeItems.map((item, index) => (
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
    );
};
export default PatternSizeForm;
