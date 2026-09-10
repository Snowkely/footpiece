import { BasePatternSizeItems } from '@/constants/baseSize';
import { ProForm, ProFormDigit } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Row, Typography } from 'antd';

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
export default PatternSizeForm;
