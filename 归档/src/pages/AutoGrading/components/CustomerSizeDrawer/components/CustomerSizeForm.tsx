import { DummyRadio } from '@/constants/patterns';
import { CustomerSizeItems } from '@/constants/sizeTable';
import { GolangServerCode } from '@/requestConfig';
import { ApiType, handleApiError } from '@/utils/errHandler';
import { getBellyHumpDegree, getBustChest, getShoulderSlope } from '@/utils/utils';
import {
    ProForm,
    ProFormDigit,
    ProFormRadio,
    ProFormSelect,
    ProFormText,
} from '@ant-design/pro-components';
import { useIntl, useModel } from '@umijs/max';
import { useMemoizedFn } from 'ahooks';
import { Col, Flex, Form, FormInstance, Input, Row, Typography } from 'antd';
import { useState } from 'react';
import styles from './index.less';

const { Title, Text } = Typography;

type Props = {
    form: FormInstance;
};

const CustomerSizeForm: React.FC<Props> = (props) => {
    const intl = useIntl();
    const [customers, setCustomers] = useState<API.Customer[]>();
    const radioValue = Form.useWatch('customerRadio', props.form);

    const { getCustomers, setCustomerId } = useModel('AutoGrading.model', (model) => ({
        getCustomers: model.getCustomersRun,
        setCustomerId: model.setCustomerId,
    }));

    const { setError } = useModel('globalModel', (model) => ({
        setError: model.setError,
    }));

    const request = async () => {
        try {
            const resp = await getCustomers({ page: 0, size: -1 });
            if (
                resp &&
                resp.data &&
                resp.code === GolangServerCode.SUCCESS &&
                resp.data.customers
            ) {
                setCustomers(resp.data.customers);
                return resp.data.customers.map((item: API.Customer) => ({
                    label: item.name,
                    value: item.customerId,
                }));
            }
        } catch (err) {
            setError(handleApiError(err, ApiType.GetCustomers));
        }
        return [];
    };

    const handleCustomerSelect = useMemoizedFn((value) => {
        props.form.resetFields(CustomerSizeItems.map((item) => item.key));
        setCustomerId(value);
        const customer = customers?.find((item) => item.customerId === value);
        if (customer?.size) {
            const customerJson: API.CustomerSize = JSON.parse(customer?.size);
            if (customerJson) {
                for (let [k, v] of Object.entries(customerJson)) {
                    props.form.setFieldValue(k, v.size);
                }
            }
            props.form.setFieldsValue({
                customerName: customer.name,
                bustChestShape: customer.bustChestShape,
                bellyShape: customer.bellyShape,
                shoulderShape: customer.shoulderShape,
            });
        }
    });

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
            <Row>
                <ProFormRadio.Group
                    name="customerRadio"
                    layout="vertical"
                    initialValue={DummyRadio.CHOOSE}
                    fieldProps={{
                        onChange: () => {
                            setCustomerId(undefined);
                            props.form.setFieldValue('customer', undefined);
                            props.form.resetFields(CustomerSizeItems.map((item) => item.key));
                            props.form.setFieldValue('customerName', undefined);
                        },
                    }}
                    options={[
                        {
                            label: (
                                <Flex
                                    gap={16}
                                    align="center"
                                    justify="center"
                                    className={styles.formItem}
                                >
                                    <Text>
                                        {intl.formatMessage({
                                            id: 'component.autoGrading.form.basicInfo.chooseCustomer',
                                        })}
                                    </Text>
                                    <ProFormSelect
                                        name={'customer'}
                                        placeholder={intl.formatMessage({
                                            id: 'component.autoGrading.form.basicInfo.placeholder',
                                        })}
                                        request={request}
                                        dependencies={['customerRadio']}
                                        onChange={handleCustomerSelect}
                                        rules={[
                                            {
                                                required: radioValue === DummyRadio.CHOOSE,
                                                message: intl.formatMessage({
                                                    id: 'component.autoGrading.form.basicInfo.placeholder',
                                                }),
                                            },
                                        ]}
                                        disabled={radioValue === DummyRadio.INPUT}
                                        fieldProps={{
                                            onClick: (e) => {
                                                e.preventDefault();
                                            },
                                        }}
                                    />
                                </Flex>
                            ),
                            value: DummyRadio.CHOOSE,
                        },
                        {
                            label: intl.formatMessage({
                                id: 'component.autoGrading.form.basicInfo.inputInfo',
                            }),
                            value: DummyRadio.INPUT,
                        },
                    ]}
                    rules={[
                        {
                            required: true,
                            message: intl.formatMessage({
                                id: 'component.autoGrading.form.basicInfo.choose',
                            }),
                        },
                    ]}
                />
            </Row>
            <Row gutter={16}>
                <Col span={8}>
                    {radioValue === DummyRadio.INPUT ? (
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
                    ) : (
                        <Form.Item
                            name={'customerName'}
                            label={intl.formatMessage({
                                id: 'component.autoGrading.form.basicInfo.name',
                            })}
                            rules={[
                                {
                                    required: true,
                                },
                            ]}
                        >
                            <Input readOnly />
                        </Form.Item>
                    )}
                </Col>
            </Row>
            <ProForm.Group>
                {CustomerSizeItems.map((item, index) =>
                    radioValue === DummyRadio.INPUT ? (
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
                    ) : (
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
                    ),
                )}
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
