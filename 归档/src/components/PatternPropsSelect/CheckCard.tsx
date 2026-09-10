import { CheckCircleTwoTone } from '@ant-design/icons';
import { Card, Flex, Typography } from 'antd';
import React from 'react';

const { Text } = Typography;

type Props = {
    name: string;
    checked?: boolean;
    onClick?: () => void;
};

const CheckCard: React.FC<Props> = (props) => {
    return (
        <Flex vertical align="center" gap={8} onClick={props.onClick}>
            <Card
                style={{ width: 95, height: 95, backgroundColor: '#D9D9D9' }}
                bodyStyle={{ height: '100%' }}
            >
                <Flex justify="center" align="center">
                    {props.checked && (
                        <CheckCircleTwoTone style={{ fontSize: 45 }} twoToneColor="#B1C5D8" />
                    )}
                </Flex>
            </Card>
            <Text strong>{props.name}</Text>
        </Flex>
    );
};
export default CheckCard;
