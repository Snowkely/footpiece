import { ROUTE_VIEW_PATTERN } from '@/constants/routes';
import { GolangServerCode } from '@/requestConfig';
import { ApiType, handleApiError } from '@/utils/errHandler';
import { getFemaleCategories } from '@/utils/utils';
import { DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { history, useIntl, useModel } from '@umijs/max';
import { useMemoizedFn } from 'ahooks';
import { Button, Popconfirm, Select, Space, Typography } from 'antd';
import $ from 'jquery';
import { useEffect, useRef, useState } from 'react';

const { Link } = Typography;

const Table: React.FC = () => {
    const intl = useIntl();
    const [params, setParams] = useState<any>();
    const actionRef = useRef<ActionType>();
    const [height, setHeight] = useState<number>();
    const [actionId, setActionId] = useState<string>(); // 删除的记录id

    const { deletePatternLoading, getPatterns, deletePattern, deletePatterns } = useModel(
        'PatternManagement.model',
        (model) => ({
            deletePatternLoading: model.deletePatternLoading,
            getPatterns: model.getPatternsRun,
            deletePattern: model.deletePatternRun,
            deletePatterns: model.deletePatternsRun,
        }),
    );

    const { setError, setSuccess } = useModel('globalModel', (model) => ({
        setError: model.setError,
        setSuccess: model.setSuccess,
    }));

    useEffect(() => {
        const top = $('#patternTable').offset()?.top ?? 0;
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
        await getPatterns({
            page: params.current - 1,
            size: params.pageSize,
            category: params.category === 'all' ? undefined : params.category,
        })
            .then((resp) => {
                if (resp && resp.data && resp.code === GolangServerCode.SUCCESS) {
                    data = resp.data?.patterns ?? [];
                    // success 请返回 true，
                    // 不然 table 会停止解析数据，即使有数据
                    success = true;
                    // 不传会使用 data 的长度，如果是分页一定要传
                    total = resp.data?.total ?? 0;
                }
            })
            .catch((err) => {
                setError(handleApiError(err, ApiType.GetPatterns));
            });
        return {
            data: data,
            success: success,
            total: total,
        };
    };

    const handleDelete = useMemoizedFn((id, action) => {
        setActionId(id);
        deletePattern({
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
                    setError('deletePattern failed');
                }
            })
            .catch((err) => {
                setError(handleApiError(err, ApiType.DeletePattern));
            });
    });

    const columns: ProColumns<API.Pattern>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 24,
        },
        {
            title: intl.formatMessage({
                id: 'component.patternManagement.table.patternId',
            }),
            width: 80,
            dataIndex: 'patternId',
            ellipsis: true,
            search: false,
        },
        {
            title: intl.formatMessage({
                id: 'component.patternManagement.table.patternName',
            }),
            width: 80,
            dataIndex: 'name',
            ellipsis: true,
            search: false,
        },
        {
            title: intl.formatMessage({
                id: 'component.table.category',
            }),
            width: 80,
            search: false,
            ellipsis: true,
            dataIndex: 'category',
            valueEnum: {
                shirt: {
                    text: intl.formatMessage({
                        id: 'component.patternPropsSelect.shirt',
                    }),
                },
                jacket: {
                    text: intl.formatMessage({
                        id: 'component.patternPropsSelect.jacket',
                    }),
                },
                pants: {
                    text: intl.formatMessage({
                        id: 'component.patternPropsSelect.pants',
                    }),
                },
                skirts: {
                    text: intl.formatMessage({
                        id: 'component.patternPropsSelect.skirts',
                    }),
                },
                dress: {
                    text: intl.formatMessage({
                        id: 'component.patternPropsSelect.dress',
                    }),
                },
            },
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
                    key="view"
                    type="text"
                    icon={<EyeOutlined />}
                    onClick={() =>
                        history.push(
                            {
                                pathname: ROUTE_VIEW_PATTERN,
                            },
                            { patternId: record.patternId },
                        )
                    }
                />,
                <Popconfirm
                    key="delete"
                    title={intl.formatMessage({
                        id: 'component.patternManagement.table.deleteTipTitle',
                    })}
                    description={intl.formatMessage({
                        id: 'component.table.deleteTip',
                    })}
                    onConfirm={() => handleDelete(record.patternId, action)}
                >
                    <Button
                        type="text"
                        icon={<DeleteOutlined />}
                        loading={actionId === record.patternId && deletePatternLoading}
                    />
                </Popconfirm>,
            ],
        },
    ];

    const handleCategorySelect = useMemoizedFn((value) => {
        setParams({
            category: value,
        });
    });

    const handleBatchDelete = useMemoizedFn((ids, onCleanSelected) => {
        deletePatterns({
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
                    setError('deletePattern failed');
                }
            })
            .catch((err) => {
                setError(handleApiError(err, ApiType.DeletePattern));
            });
    });

    return (
        <ProTable<API.Pattern>
            id="patternTable"
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
                                id: 'component.patternManagement.table.deleteTipTitle',
                            })}
                            description={intl.formatMessage({
                                id: 'component.table.deleteTip',
                            })}
                            onConfirm={() => handleBatchDelete(selectedRowKeys, onCleanSelected)}
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
            params={params}
            request={(params) => request(params)}
            onRequestError={(err) => {
                setError(handleApiError(err, ApiType.GetPatterns));
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
            rowKey="patternId"
            headerTitle={
                <Select
                    defaultValue={'all'}
                    style={{ width: 200 }}
                    onChange={handleCategorySelect}
                    options={[
                        ...getFemaleCategories(intl).map((item) => ({
                            label: item.name,
                            value: item.category,
                        })),
                        {
                            label: intl.formatMessage({
                                id: 'component.table.allCategory',
                            }),
                            value: 'all',
                        },
                    ]}
                />
            }
        />
    );
};

export default Table;
