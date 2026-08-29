import { GradingPoints } from '@/constants/patterns';
import { FormInstance, Space } from 'antd';
import $ from 'jquery';
import { useEffect, useState } from 'react';
import PointRefRecord from './PointRefRecord';

type Props = {
    form: FormInstance;
    category: string;
    patternKey: string;
    patternName: string;
    categoryName: string;
    tabNum: number;
};

const RefPointsForm: React.FC<Props> = (props) => {
    const [height, setHeight] = useState<number>();

    useEffect(() => {
        const top = $('#pointsField').offset()?.top ?? 0;
        const pointsDrawerHeight = $('#pointsDrawer')?.height() ?? window.innerHeight;
        const formButtonsHeight = $('#formButtons')?.height() ?? 0;
        setHeight(pointsDrawerHeight - top - formButtonsHeight);
    }, []);

    return (
        <Space id="pointsField" direction="vertical" style={{ overflowY: 'auto', height: height }}>
            {GradingPoints.map((gradingPoint, index) => (
                <PointRefRecord
                    key={props.category + props.patternKey + gradingPoint.value}
                    name={`${props.category + props.patternKey}Pattern${gradingPoint.value}`}
                    label={`${gradingPoint.value}: ${props.categoryName} ${props.patternName} Pattern`}
                    gradingPoint={gradingPoint}
                    form={props.form}
                    patternKey={props.patternKey}
                    orderNum={index + GradingPoints.length * props.tabNum}
                />
            ))}
        </Space>
    );
};
export default RefPointsForm;
