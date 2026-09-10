import { Form, FormInstance, Input } from 'antd';

type Props = {
    name: string;
    label: string;
    gradingPoint: any;
    form: FormInstance;
    patternKey: string;
    orderNum: number;
};

const PointRefRecord: React.FC<Props> = (props) => {
    return (
        <Form.Item
            name={props.name}
            label={props.label}
            rules={[
                {
                    required: props.gradingPoint.required,
                    validator: (rule, value) => {
                        if (!rule.required || value) {
                            return Promise.resolve();
                        }
                        return Promise.reject('This field is required');
                    },
                },
            ]}
        >
            <Input readOnly></Input>
        </Form.Item>
    );
};

export default PointRefRecord;
