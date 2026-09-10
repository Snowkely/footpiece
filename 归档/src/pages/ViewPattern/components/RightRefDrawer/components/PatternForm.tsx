import { useModel } from '@umijs/max';
import { Form, Image, Space, Tabs, Typography } from 'antd';
import { useEffect } from 'react';
import RefPointsForm from './RefPointsForm';

const { Title } = Typography;

type Props = {
    refImage: any;
    category: string;
    categoryName: string;
    patterns: any[];
};

const PatternForm: React.FC<Props> = (props) => {
    const [form] = Form.useForm();

    const { selectedPoints } = useModel('ViewPattern.model', (model) => ({
        selectedPoints: model.selectedPoints,
    }));

    useEffect(() => {
        // 如果保存了form的值，就进行初始化
        if (form) {
            selectedPoints.forEach((p) => {
                if (p?.pointObj) {
                    form.setFieldValue(
                        p?.key,
                        `${p?.pointObj?.x?.toFixed(1)}, ${p?.pointObj?.y?.toFixed(1)}`,
                    );
                }
            });
        }
    }, []);

    return (
        <div style={{ padding: '0 12px 12px 12px' }}>
            <Image
                width={'100%'}
                height={350}
                src={props.refImage}
                preview={true}
                style={{ marginBottom: 8, objectFit: 'contain' }}
            />
            <Title level={5}>
                Please refer to the picture above and select the required points
            </Title>
            <Form form={form} layout="horizontal">
                <Space direction="vertical">
                    <Tabs
                        items={props.patterns.map((p: any, index) => ({
                            label: p.value,
                            key: p.key,
                            forceRender: true,
                            children: (
                                <RefPointsForm
                                    category={props.category}
                                    categoryName={props.categoryName}
                                    patternKey={p.key}
                                    patternName={p.value}
                                    form={form}
                                    tabNum={index}
                                />
                            ),
                        }))}
                    />
                </Space>
            </Form>
        </div>
    );
};
export default PatternForm;
