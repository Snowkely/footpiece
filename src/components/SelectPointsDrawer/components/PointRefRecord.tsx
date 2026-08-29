import { SelectedPointInfo } from '@/constants/patterns';
import { CloseOutlined, HighlightOutlined } from '@ant-design/icons';
import { useModel } from '@umijs/max';
import { useMemoizedFn, useUpdateEffect } from 'ahooks';
import { Button, Form, FormInstance, Input, Popover, Space } from 'antd';
import { useState } from 'react';

type Props = {
    name: string;
    label: string;
    gradingPoint: any;
    form: FormInstance;
    patternKey: string;
    orderNum: number;
};

const PointRefRecord: React.FC<Props> = (props) => {
    const [pointInfo, setPointInfo] = useState<SelectedPointInfo>(); // 组件自有

    const {
        selectedPointInfo,
        setSelectedRefPointInfo,
        removeSelectedRefPoints,
        setRemoveRefPointInfo,
    } = useModel('selectPointsDrawerModel', (model) => ({
        selectedPointInfo: model.selectedPointInfo,
        setSelectedRefPointInfo: model.setSelectedRefPointInfo,
        removeSelectedRefPoints: model.removeSelectedRefPoints,
        setRemoveRefPointInfo: model.setRemoveRefPointInfo,
    }));

    useUpdateEffect(() => {
        if (selectedPointInfo?.key === props.name) {
            setPointInfo(selectedPointInfo);
        }
    }, [selectedPointInfo]);

    const pickPoint = useMemoizedFn((label, key, gradingPoint, patternKey) => {
        setSelectedRefPointInfo({
            key: key,
            gradingPoint: gradingPoint,
            name: label,
            picking: true,
            patternPart: patternKey,
            orderNum: props.orderNum,
        });
    });

    const cancelPickPoint = useMemoizedFn(() => {
        setSelectedRefPointInfo(undefined);
    });

    const Clear = useMemoizedFn(() => {
        removeSelectedRefPoints(pointInfo);
        setRemoveRefPointInfo(pointInfo);
    });

    const MyInput = (myprops: any) => (
        <Space.Compact>
            {props.form.getFieldValue(props.name) ? (
                <Popover
                    content={
                        <Button type="text" onClick={Clear}>
                            Clear
                        </Button>
                    }
                >
                    <Input {...myprops} readOnly></Input>
                </Popover>
            ) : (
                <Input {...myprops} readOnly></Input>
            )}
            {!(selectedPointInfo?.key === props.name && selectedPointInfo?.picking) && (
                <Button
                    icon={<HighlightOutlined />}
                    onClick={() =>
                        pickPoint(
                            props.label,
                            props.name,
                            props.gradingPoint.value,
                            props.patternKey,
                        )
                    }
                />
            )}
            {selectedPointInfo?.key === props.name && selectedPointInfo?.picking && (
                <Button icon={<CloseOutlined />} onClick={cancelPickPoint} />
            )}
        </Space.Compact>
    );

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
            <MyInput />
        </Form.Item>
    );
};

export default PointRefRecord;
