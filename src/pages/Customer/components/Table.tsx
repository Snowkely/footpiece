import { Color } from '@/constants/color';
import { GolangServerCode } from '@/requestConfig';
import { ApiType, handleApiError } from '@/utils/errHandler';
import { DeleteOutlined, EditOutlined, ImportOutlined, PlusOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { useIntl, useModel } from '@umijs/max';
import { useMemoizedFn } from 'ahooks';
import { Button, ConfigProvider, Popconfirm, Space, Typography } from 'antd';
import $ from 'jquery';
import { useEffect, useRef, useState } from 'react';
import CustomerAddDrawer from './CustomerAddDrawer';
import CustomerEditDrawer from './CustomerEditDrawer';

const { Link } = Typography;

const Table: React.FC = () => {
    const intl = useIntl();
    const actionRef = useRef<ActionType>();
    const [openEditDrawer, setOpenEditDrawer] = useState(false);
    const [openAddDrawer, setOpenAddDrawer] = useState(false);
    const [height, setHeight] = useState<number>();
    const [actionId, setActionId] = useState<string>(); // 删除的记录id
    const [customerId, setCustomerId] = useState<string>();

    const { deleteCustomerLoading, getCustomers, deleteCustomer, deleteCustomers } = useModel(
        'Customer.model',
        (model) => ({
            deleteCustomerLoading: model.deleteCustomerLoading,
            getCustomers: model.getCustomersRun,
            deleteCustomer: model.deleteCustomerRun,
            deleteCustomers: model.deleteCustomersRun,
        }),
    );
    const { setError, setSuccess } = useModel('globalModel', (model) => ({
        setError: model.setError,
        setSuccess: model.setSuccess,
    }));

    useEffect(() => {
        const top = $('#customerTable').offset()?.top ?? 0;
        const toolbarHeight = $('.ant-pro-table-list-toolbar')?.height() ?? 0;
        const tableHeaderHeight = $('.ant-table-header')?.height() ?? 0;
        const paginationHeight = $('.ant-pagination')?.height() ?? 0;
        const footerHeight = $('.ant-layout-footer')?.height() ?? 0;
        setHeight(
            window.innerHeight -
                top -
                toolbarHeight -
                tableHeaderHeight -
                paginationHeight -
                footerHeight,
        );
    }, []);

    const request = async (params: any) => {
        let data: any[] = [],
            success = false,
            total = 0;
        await getCustomers({
            page: params.current - 1,
            size: params.pageSize,
        })
            .then((resp) => {
                if (resp && resp.data && resp.code === GolangServerCode.SUCCESS) {
                    data = resp.data?.customers ?? [];
                    // success 请返回 true，
                    // 不然 table 会停止解析数据，即使有数据
                    success = true;
                    // 不传会使用 data 的长度，如果是分页一定要传
                    total = resp.data?.total ?? 0;
                }
            })
            .catch((err) => {
                setError(handleApiError(err, ApiType.GetCustomers));
            });
        return {
            data: data,
            success: success,
            total: total,
        };
    };

    const handleDelete = useMemoizedFn((id, action) => {
        setActionId(id);
        deleteCustomer({
            id: id,
        })
            .then((resp) => {
                if (resp && resp.code === GolangServerCode.SUCCESS) {
                    setSuccess(
                        intl.formatMessage({
                            id: 'message.api.deleteSuccess',
                        }),
                    );
                    action.reload();
                } else {
                    setError('deleteCustomer failed');
                }
            })
            .catch((err) => {
                setError(handleApiError(err, ApiType.DeleteCustomer));
            });
    });

    const handleCloseEditDrawer = useMemoizedFn(() => {
        setOpenEditDrawer(false);
    });

    const handleShowEditDrawer = useMemoizedFn((id?) => {
        if (id) {
            setCustomerId(id);
        }
        setOpenEditDrawer(true);
    });

    const columns: ProColumns<API.Customer>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 24,
        },
        {
            title: intl.formatMessage({
                id: 'component.customerManagement.table.id',
            }),
            width: 80,
            dataIndex: 'customerId',
            ellipsis: true,
            search: false,
        },
        {
            title: intl.formatMessage({
                id: 'component.customerManagement.table.name',
            }),
            width: 80,
            dataIndex: 'name',
            ellipsis: true,
            search: false,
        },
        {
            title: intl.formatMessage({
                id: 'component.table.updateTime',
            }),
            width: 80,
            key: 'since',
            dataIndex: 'updatedAt',
            valueType: 'dateTime',
            ellipsis: true,
            // sorter: (a, b) => a.updatedAt - b.updatedAt,
        },
        {
            title: intl.formatMessage({
                id: 'component.table.actions',
            }),
            width: 80,
            key: 'option',
            valueType: 'option',
            render: (_, record, __, action) => [
                <Button
                    key="edit"
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => handleShowEditDrawer(record.customerId)}
                />,
                <Popconfirm
                    key="delete"
                    title={intl.formatMessage({
                        id: 'component.customerManagement.table.deleteTipTitle',
                    })}
                    description={intl.formatMessage({
                        id: 'component.table.deleteTip',
                    })}
                    onConfirm={() => handleDelete(record.customerId, action)}
                >
                    <Button
                        type="text"
                        icon={<DeleteOutlined />}
                        loading={actionId === record.customerId && deleteCustomerLoading}
                    />
                </Popconfirm>,
            ],
        },
    ];

    const handleBatchDelete = useMemoizedFn((ids, onCleanSelected) => {
        deleteCustomers({
            ids: ids,
        })
            .then((resp) => {
                if (resp && resp.code === GolangServerCode.SUCCESS) {
                    setSuccess(
                        intl.formatMessage({
                            id: 'message.api.deleteSuccess',
                        }),
                    );
                    onCleanSelected();
                    actionRef.current?.reload();
                } else {
                    setError('deleteCustomers failed');
                }
            })
            .catch((err) => {
                setError(handleApiError(err, ApiType.DeleteCustomer));
            });
    });

    const handleCloseAddDrawer = useMemoizedFn(() => {
        setOpenAddDrawer(false);
    });

    const handleShowAddDrawer = useMemoizedFn(() => {
        setOpenAddDrawer(true);
    });

    return (
        <>
            <ProTable<API.Customer>
                id="customerTable"
                actionRef={actionRef}
                columns={columns}
                scroll={{ y: height }}
                rowSelection={{
                    // 自定义选择项参考: https://ant.design/components/table-cn/#components-table-demo-row-selection-custom
                    // 注释该行则默认不显示下拉选项
                    // selections: [Table.SELECTION_ALL, Table.SELECTION_INVERT],
                    defaultSelectedRowKeys: [],
                }}
                tableAlertRender={({ selectedRowKeys, onCleanSelected }) => {
                    return (
                        <Space size={24}>
                            <span>
                                {intl.formatMessage(
                                    {
                                        id: 'component.table.selected',
                                    },
                                    { num: selectedRowKeys.length },
                                )}
                                <Link style={{ marginInlineStart: 8 }} onClick={onCleanSelected}>
                                    {intl.formatMessage({
                                        id: 'component.cancel',
                                    })}
                                </Link>
                            </span>
                        </Space>
                    );
                }}
                tableAlertOptionRender={({ selectedRowKeys, onCleanSelected }) => {
                    return (
                        <Space size={16}>
                            <Popconfirm
                                title={intl.formatMessage({
                                    id: 'component.customerManagement.table.deleteTipTitle',
                                })}
                                description={intl.formatMessage({
                                    id: 'component.table.deleteTip',
                                })}
                                onConfirm={() =>
                                    handleBatchDelete(selectedRowKeys, onCleanSelected)
                                }
                            >
                                <Link>
                                    {intl.formatMessage({
                                        id: 'component.table.batchDelete',
                                    })}
                                </Link>
                            </Popconfirm>
                        </Space>
                    );
                }}
                request={(params) => request(params)}
                onRequestError={(err) => {
                    setError(handleApiError(err, ApiType.GetCustomers));
                }}
                polling={30000}
                options={{
                    setting: false,
                    density: false,
                }}
                search={false}
                pagination={{
                    pageSize: 15,
                }}
                rowKey="customerId"
                toolBarRender={() => [
                    <ConfigProvider
                        key="add"
                        theme={{
                            token: {
                                colorPrimary: Color.ACTION_BUTTON,
                            },
                        }}
                    >
                        <Button
                            icon={<PlusOutlined />}
                            onClick={handleShowAddDrawer}
                            type="primary"
                        >
                            {intl.formatMessage({
                                id: 'component.tab.addNew',
                            })}
                        </Button>
                    </ConfigProvider>,
                    <Button
                        key="import"
                        type="primary"
                        icon={<ImportOutlined />}
                        onClick={() => {}}
                    >
                        {intl.formatMessage({
                            id: 'component.table.import',
                        })}
                    </Button>,
                ]}
            />
            <CustomerEditDrawer
                open={openEditDrawer}
                customerId={customerId}
                onClose={handleCloseEditDrawer}
                tableAction={actionRef.current}
            />
            <CustomerAddDrawer
                open={openAddDrawer}
                onClose={handleCloseAddDrawer}
                tableAction={actionRef.current}
            />
        </>
    );
};

export default Table;
