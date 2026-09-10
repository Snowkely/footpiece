import { useIntl } from '@umijs/max';
import { Col, Flex, Row, Typography } from 'antd';

const { Text } = Typography;

export enum HoverContentType {
    pattern,
    dummy,
    customer,
}

type Props = {
    type: HoverContentType;
    name?: string;
    value?: any;
};

const HoverContent: React.FC<Props> = (props) => {
    const intl = useIntl();

    const SizeDetail = () => {
        const details: any[] = [];
        Object.values(props.value).forEach((v: any) => {
            if (v.size) {
                details.push({
                    name: v.name,
                    size: v.size,
                });
            }
        });
        return (
            <Row gutter={[16, 16]} align="middle">
                {details.map((item: any) => {
                    return (
                        <Col key={item.name} span={8}>
                            <Text>{item.name}:</Text>
                            <Text strong style={{ fontSize: 16, marginLeft: 16 }}>
                                {`${item.size}cm`}
                            </Text>
                        </Col>
                    );
                })}
            </Row>
        );
    };

    return (
        <Flex vertical style={{ padding: '0 24px' }} gap={16}>
            <Flex gap={16} align="center">
                <Text>
                    {props.type === HoverContentType.pattern
                        ? intl.formatMessage({
                              id: 'component.downloadManagement.table.patternName',
                          })
                        : props.type === HoverContentType.dummy
                        ? intl.formatMessage({
                              id: 'component.downloadManagement.table.dummyName',
                          })
                        : intl.formatMessage({
                              id: 'component.downloadManagement.table.customerName',
                          })}
                    :
                </Text>
                <Text strong style={{ fontSize: 16 }}>
                    {props.name}
                </Text>
            </Flex>
            <SizeDetail />
        </Flex>
    );
};

export default HoverContent;
