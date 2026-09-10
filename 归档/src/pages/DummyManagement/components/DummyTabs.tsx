import { GolangServerCode } from '@/requestConfig';
import { ApiType, handleApiError } from '@/utils/errHandler';
import { firstLetterUpper } from '@/utils/utils';
import { InfoCircleTwoTone, PlusOutlined } from '@ant-design/icons';
import { useIntl, useModel } from '@umijs/max';
import { useMemoizedFn, useUpdateEffect } from 'ahooks';
import { Button, Empty, Modal, Space, Spin, Tabs, Typography } from 'antd';
import $ from 'jquery';
import { useEffect, useRef, useState } from 'react';
import DummySizeDisplayForm from './DummySizeDisplayForm';
import NewDummyDrawer from './NewDummyDrawer';

const { Text } = Typography;

type TargetKey = React.MouseEvent | React.KeyboardEvent | string;

const DummyTabs: React.FC = () => {
    const intl = useIntl();
    const [activeKey, setActiveKey] = useState<string>();
    const targetKeyRef = useRef<any>();
    const [action, setAction] = useState<'add' | 'remove'>();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [items, setItems] = useState<any[]>([]);
    const [height, setHeight] = useState<number>();

    const {
        getDummiesLoading,
        deleteDummyLoading,
        createDummyLoading,
        dummies,
        newDummy,
        isDrawerOpen,
        getDummies,
        deleteDummy,
        setIsDrawerOpen,
    } = useModel('DummyManagement.model', (model) => ({
        getDummiesLoading: model.getDummiesLoading,
        deleteDummyLoading: model.deleteDummyLoading,
        createDummyLoading: model.createDummyLoading,
        dummies: model.dummies,
        newDummy: model.newDummy,
        isDrawerOpen: model.isDrawerOpen,
        getDummies: model.getDummiesRun,
        deleteDummy: model.deleteDummyRun,
        setIsDrawerOpen: model.setIsDrawerOpen,
    }));

    const { setError, setSuccess } = useModel('globalModel', (model) => ({
        setError: model.setError,
        setSuccess: model.setSuccess,
    }));

    useEffect(() => {
        getDummies({ page: 0, size: -1 });
        const top = $('#dummyTabs').offset()?.top ?? 0;
        const footerHeight = $('.ant-layout-footer')?.height() ?? 0;
        setHeight(window.innerHeight - top - footerHeight);
    }, []);

    useUpdateEffect(() => {
        if (dummies && dummies.length > 0) {
            setActiveKey(dummies[0].dummyId);
            setItems(
                dummies?.map((dummy, index) => {
                    const formValues: Record<string, any> = {};
                    const sizeDetails: API.DummySize = JSON.parse(dummy.size ?? '');
                    Object.entries(sizeDetails).forEach(([key, value]) => {
                        formValues[`dummy${firstLetterUpper(key)}`] = value.size;
                    });
                    return {
                        label: dummy.name ?? '',
                        key: dummy.dummyId ?? index.toString(),
                        children: (
                            <DummySizeDisplayForm
                                formValues={{ ...formValues, dummyName: dummy.name }}
                            />
                        ),
                    };
                }),
            );
        }
    }, [dummies]);

    // 弹出对话框
    const showModal = useMemoizedFn(() => {
        setIsModalOpen(true);
    });

    // 切换tab的回调
    const onChange = useMemoizedFn((newActiveKey: string) => {
        setActiveKey(newActiveKey);
    });

    // 编辑tab的回调
    const onEdit = useMemoizedFn(
        (targetKey: React.MouseEvent | React.KeyboardEvent | string, action: 'add' | 'remove') => {
            targetKeyRef.current = targetKey;
            setAction(action);
            showModal();
        },
    );

    // 新增tab
    const add = useMemoizedFn(() => {
        const newActiveKey = newDummy?.name;
        const newPanes = [...items];
        const formValues: Record<string, any> = {};
        const sizeDetails: API.DummySize = JSON.parse(newDummy?.size ?? '');
        Object.entries(sizeDetails).forEach(([key, value]) => {
            formValues[`dummy${firstLetterUpper(key)}`] = value.size;
        });
        newPanes.push({
            label: newDummy?.name,
            children: (
                <DummySizeDisplayForm formValues={{ ...formValues, dummyName: newDummy?.name }} />
            ),
            key: newActiveKey,
        });
        setItems(newPanes);
        setActiveKey(newActiveKey);
    });

    useUpdateEffect(() => {
        if (newDummy) {
            add();
        }
    }, [newDummy]);

    // 移除tab
    const remove = useMemoizedFn(async (targetKey: TargetKey) => {
        await deleteDummy({
            id: targetKey.toString(),
        })
            .then((resp) => {
                if (resp && resp.code === GolangServerCode.SUCCESS) {
                    setSuccess(
                        intl.formatMessage({
                            id: 'message.api.deleteSuccess',
                        }),
                    );
                    let newActiveKey = activeKey;
                    let lastIndex = -1;
                    items.forEach((item: any, i: number) => {
                        if (item.key === targetKey) {
                            lastIndex = i - 1;
                        }
                    });
                    const newPanes = items.filter((item: any) => item.key !== targetKey);
                    if (newPanes.length && newActiveKey === targetKey) {
                        if (lastIndex >= 0) {
                            newActiveKey = newPanes[lastIndex].key;
                        } else {
                            newActiveKey = newPanes[0].key;
                        }
                    }
                    setItems(newPanes);
                    setActiveKey(newActiveKey);
                } else {
                    setError('Delete dummy failed');
                }
            })
            .catch((err) => {
                setError(handleApiError(err, ApiType.DeleteDummy));
            });
    });

    // 确认操作
    const handleOk = useMemoizedFn(() => {
        setIsModalOpen(false);
        if (action === 'remove') {
            remove(targetKeyRef.current);
        }
    });

    // 关闭对话框
    const handleCancel = useMemoizedFn(() => {
        setIsModalOpen(false);
    });

    // 关闭drawer
    const onDrawerClose = useMemoizedFn(() => {
        setIsDrawerOpen(false);
    });

    // 打开drawer
    const openDrawer = useMemoizedFn(() => {
        setIsDrawerOpen(true);
    });

    // 添加dummy
    const onAdd = useMemoizedFn(() => {
        setAction('add');
        openDrawer();
    });

    return (
        <>
            <div>
                <Spin spinning={getDummiesLoading || deleteDummyLoading || createDummyLoading}>
                    {items && items.length !== 0 ? (
                        <Tabs
                            id="dummyTabs"
                            tabBarExtraContent={{
                                left: (
                                    <Button
                                        style={{ marginBottom: 8 }}
                                        icon={<PlusOutlined />}
                                        onClick={onAdd}
                                    >
                                        {intl.formatMessage({
                                            id: 'component.tab.addNew',
                                        })}
                                    </Button>
                                ),
                            }}
                            style={{ height: height }}
                            tabPosition="left"
                            type="editable-card"
                            items={items}
                            activeKey={activeKey}
                            onChange={onChange}
                            onEdit={onEdit}
                            size="large"
                            hideAdd
                        />
                    ) : (
                        <>
                            <Button
                                style={{ marginBottom: 8 }}
                                icon={<PlusOutlined />}
                                onClick={onAdd}
                            >
                                {intl.formatMessage({
                                    id: 'component.tab.addNew',
                                })}
                            </Button>
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        </>
                    )}
                </Spin>
            </div>
            <Modal
                title={
                    <Space>
                        <InfoCircleTwoTone twoToneColor={'orange'} />
                        {intl.formatMessage({
                            id: 'component.dummyManagement.tab.removeDummy',
                        })}
                    </Space>
                }
                destroyOnClose
                open={isModalOpen}
                onOk={handleOk}
                onCancel={handleCancel}
            >
                <Text>
                    {intl.formatMessage({
                        id: 'component.dummyManagement.tab.removeDummyTip',
                    })}
                </Text>
            </Modal>
            <NewDummyDrawer open={isDrawerOpen} onClose={onDrawerClose} />
        </>
    );
};

export default DummyTabs;
