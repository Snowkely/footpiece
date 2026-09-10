import { CustomerSizeItems } from '@/constants/sizeTable';
import { getBellyHumpDegree, getBustChest, getShoulderSlope } from '@/utils/utils';
import { ProForm, ProFormDigit, ProFormSelect, ProFormText } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Col, Flex, Row, Typography } from 'antd';

const { Title } = Typography;

const CustomerSizeForm: React.FC = () => {
    const intl = useIntl();

    return (
        <>
            <Row>
                <Title level={3}>
                    {intl.formatMessage({
                        id: 'component.autoGrading.form.sizeTable.info',
                    })}{' '}
                    (cm)
                </Title>
            </Row>
            <Row gutter={16}>
                <Col span={6}>
                    <ProFormText
                        name={'customerName'}
                        label={intl.formatMessage({
                            id: 'component.autoGrading.form.basicInfo.name',
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
                {CustomerSizeItems.map((item) => (
                    <ProFormDigit
                        key={item.key}
                        label={intl.formatMessage({
                            id: item.intlId,
                        })}
                        name={item.key}
                        min={0}
                        width="sm"
                        rules={[
                            {
                                required: item.required,
                            },
                        ]}
                    />
                ))}
            </ProForm.Group>
            <Flex vertical>
                <Title level={3}>
                    {intl.formatMessage({
                        id: 'component.autoGrading.form.bodyShape.title',
                    })}
                </Title>
                <ProFormSelect
                    name={'bustChestShape'}
                    label={intl.formatMessage({
                        id: 'component.autoGrading.form.bodyShape.bustChest',
                    })}
                    initialValue={'normal'}
                    options={getBustChest(intl).map((item) => ({
                        label: item.name,
                        value: item.key,
                    }))}
                />
                <ProFormSelect
                    name={'bellyShape'}
                    label={intl.formatMessage({
                        id: 'component.autoGrading.form.bodyShape.belly',
                    })}
                    initialValue={'normal'}
                    options={getBellyHumpDegree(intl).map((item) => ({
                        label: item.name,
                        value: item.key,
                    }))}
                />
                <ProFormSelect
                    name={'shoulderShape'}
                    label={intl.formatMessage({
                        id: 'component.autoGrading.form.bodyShape.shoulder',
                    })}
                    initialValue={'normal'}
                    options={getShoulderSlope(intl).map((item) => ({
                        label: item.name,
                        value: item.key,
                    }))}
                />
            </Flex>
        </>
    );
};
export default CustomerSizeForm;
