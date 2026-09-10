import { BaseDummySizeItems } from '@/constants/baseSize';
import { GolangServerCode } from '@/requestConfig';
import { ApiType, handleApiError } from '@/utils/errHandler';
import { firstLetterUpper } from '@/utils/utils';
import { ProForm } from '@ant-design/pro-components';
import { useIntl, useModel } from '@umijs/max';
import { useMemoizedFn, useUpdateEffect } from 'ahooks';
import { Col, Form, Input, Row, Spin, Typography } from 'antd';
import { FormInstance } from 'antd/lib';

const { Title } = Typography;

type Props = {
    form: FormInstance;
};

const DummySizeForm: React.FC<Props> = (props) => {
    const intl = useIntl();

    const { dummyId, getDummyLoading, getDummy } = useModel('ViewPattern.model', (model) => ({
        dummyId: model.dummyId,
        getDummyLoading: model.getDummyLoading,
        getDummy: model.getDummyRun,
    }));

    const { setError } = useModel('globalModel', (model) => ({
        setError: model.setError,
    }));

    const fillForm = useMemoizedFn((dummy: API.Dummy | undefined) => {
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

    useUpdateEffect(() => {
        if (dummyId) {
            getDummy({ id: dummyId })
                .then((resp) => {
                    if (resp && resp.data && resp.code === GolangServerCode.SUCCESS) {
                        fillForm(resp.data);
                    }
                })
                .catch((err) => {
                    setError(handleApiError(err, ApiType.GetDummy));
                });
        }
    }, [dummyId]);

    return (
        <>
            {getDummyLoading && (
                <Row style={{ width: '100%' }}>
                    <Spin spinning={getDummyLoading} />
                </Row>
            )}
            {!getDummyLoading && (
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
            )}
        </>
    );
};
export default DummySizeForm;
