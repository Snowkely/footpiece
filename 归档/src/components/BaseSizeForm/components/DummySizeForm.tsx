import { BaseDummySizeItems } from '@/constants/baseSize';
import { DummyRadio } from '@/constants/patterns';
import { GolangServerCode } from '@/requestConfig';
import { ApiType, handleApiError } from '@/utils/errHandler';
import { firstLetterUpper } from '@/utils/utils';
import {
    ProForm,
    ProFormDigit,
    ProFormRadio,
    ProFormSelect,
    ProFormText,
} from '@ant-design/pro-components';
import { useIntl, useModel } from '@umijs/max';
import { useMemoizedFn } from 'ahooks';
import { Col, Flex, Form, Input, Row, Typography } from 'antd';
import { FormInstance } from 'antd/lib';
import { useState } from 'react';
import styles from './index.less';

const { Title, Text } = Typography;

type Props = {
    form: FormInstance;
};

const DummySizeForm: React.FC<Props> = (props) => {
    const intl = useIntl();
    const radioValue = Form.useWatch('dummyRadio', props.form);
    const [dummies, setDummies] = useState<API.Dummy[]>();

    const { getDummies, setDummyId } = useModel('basicSizeFormModel', (model) => ({
        getDummies: model.getDummiesRun,
        setDummyId: model.setDummyId,
    }));

    const { setError } = useModel('globalModel', (model) => ({
        setError: model.setError,
    }));

    const request = async () => {
        try {
            const resp = await getDummies({ page: 0, size: -1 });
            if (resp && resp.data && resp.code === GolangServerCode.SUCCESS && resp.data.dummies) {
                setDummies(resp.data.dummies);
                return resp.data.dummies.map((item: API.Dummy) => ({
                    label: item.name,
                    value: item.dummyId,
                }));
            }
        } catch (err) {
            setError(handleApiError(err, ApiType.GetDummies));
        }
        return [];
    };

    const handleDummySelect = useMemoizedFn((value) => {
        setDummyId(value);
        props.form.resetFields(BaseDummySizeItems.map((item) => item.key));
        const dummy = dummies?.find((item) => item.dummyId === value);
        if (dummy?.size) {
            const dummyJson: API.DummySize = JSON.parse(dummy?.size);
            if (dummyJson) {
                for (let [k, v] of Object.entries(dummyJson)) {
                    props.form.setFieldValue(`dummy${firstLetterUpper(k)}`, v.size);
                }
            }
            props.form.setFieldsValue({
                dummyName: dummy.name,
            });
        }
    });

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
            <Row>
                <ProFormRadio.Group
                    name="dummyRadio"
                    layout="vertical"
                    initialValue={DummyRadio.CHOOSE}
                    fieldProps={{
                        onChange: () => {
                            props.form.resetFields(BaseDummySizeItems.map((item) => item.key));
                            setDummyId(undefined);
                            props.form.setFieldValue('dummy', undefined);
                            props.form.setFieldValue('dummyName', undefined);
                        },
                    }}
                    options={[
                        {
                            label: (
                                <Flex gap={16} align="center" className={styles.formItem}>
                                    <Text>
                                        {intl.formatMessage({
                                            id: 'component.uploadPattern.form.basicInfo.choose',
                                        })}
                                    </Text>
                                    <ProFormSelect
                                        name={'dummy'}
                                        placeholder={intl.formatMessage({
                                            id: 'component.uploadPattern.form.basicInfo.dummyPlaceholder',
                                        })}
                                        request={request}
                                        dependencies={['dummyRadio']}
                                        onChange={handleDummySelect}
                                        rules={[
                                            {
                                                required: radioValue === DummyRadio.CHOOSE,
                                                message: intl.formatMessage({
                                                    id: 'component.uploadPattern.form.basicInfo.dummyPlaceholder',
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
                                id: 'component.uploadPattern.form.basicInfo.inputDummySize',
                            }),
                            value: DummyRadio.INPUT,
                        },
                    ]}
                    rules={[
                        {
                            required: true,
                            message: intl.formatMessage({
                                id: 'component.uploadPattern.form.basicInfo.dummyChoose',
                            }),
                        },
                    ]}
                />
            </Row>
            <Row gutter={16}>
                <Col span={6}>
                    {radioValue === DummyRadio.INPUT ? (
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
                    ) : (
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
                    )}
                </Col>
            </Row>
            <ProForm.Group>
                {BaseDummySizeItems.map((item, index) =>
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
        </>
    );
};
export default DummySizeForm;
