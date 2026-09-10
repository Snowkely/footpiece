import { GolangServerCode } from '@/requestConfig';
import { ApiType, handleApiError } from '@/utils/errHandler';
import { DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { useIntl, useModel } from '@umijs/max';
import { useMemoizedFn } from 'ahooks';
import { Button, Divider, Popconfirm, Popover, Space, Typography } from 'antd';
import $ from 'jquery';
import { useEffect, useRef, useState } from 'react';
import HoverContent, { HoverContentType } from './HoverContent';

const { Link, Text, Title } = Typography;

const Table: React.FC = () => {
    const intl = useIntl();
    const actionRef = useRef<ActionType>();
    const [height, setHeight] = useState<number>();
    const [actionId, setActionId] = useState<string>(); // 下载或删除的记录id

    const {
        deleteDownloadHistoryLoading,
        downloadDxfFileLoading,
        getDownloadHistories,
        deleteDownloadHistory,
        deleteHistories,
        downloadDxfFile,
    } = useModel('DownloadHistory.model', (model) => ({
        deleteDownloadHistoryLoading: model.deleteDownloadHistoryLoading,
        downloadDxfFileLoading: model.downloadDxfFileLoading,
        getDownloadHistories: model.getDownloadHistoriesRun,
        deleteDownloadHistory: model.deleteDownloadHistoryRun,
        deleteHistories: model.deleteHistoriesRun,
        downloadDxfFile: model.downloadDxfFileRun,
    }));

    const { setError, setSuccess } = useModel('globalModel', (model) => ({
        setError: model.setError,
        setSuccess: model.setSuccess,
    }));

    useEffect(() => {
        const top = $('#downloadHistoryTable').offset()?.top ?? 0;
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
        await getDownloadHistories({
            page: params.current - 1,
            size: params.pageSize,
            month: 3,
        })
            .then((resp) => {
                if (resp && resp.data && resp.code === GolangServerCode.SUCCESS) {
                    data = resp.data?.downloadHistoryData ?? [];
                    // success 请返回 true，
                    // 不然 table 会停止解析数据，即使有数据
                    success = true;
                    // 不传会使用 data 的长度，如果是分页一定要传
                    total = resp.data?.total ?? 0;
                }
            })
            .catch((err) => {
                setError(handleApiError(err, ApiType.GetDownloadHistories));
            });
        return {
            data: data,
            success: success,
            total: total,
        };
    };

    const handleDelete = useMemoizedFn((id, action) => {
        setActionId(id);
        deleteDownloadHistory({
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
                    setError('deleteDownloadHistory failed');
                }
            })
            .catch((err) => {
                setError(handleApiError(err, ApiType.DeleteDownloadHistory));
            });
    });

    const handleDownload = useMemoizedFn((id, cosKey) => {
        setActionId(id);
        downloadDxfFile({
            cosKey: cosKey,
        });
    });

    const columns: ProColumns<API.DownloadHistoryData>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 24,
        },
        {
            title: intl.formatMessage({
                id: 'component.downloadManagement.table.gradedPattern',
            }),
            width: 80,
            dataIndex: ['downloadHistory', 'cosKey'],
            ellipsis: true,
            search: false,
            renderText: (text) => {
                return text?.split('/').at(-1);
            },
        },
        {
            title: intl.formatMessage({
                id: 'component.downloadManagement.table.generateTime',
            }),
            width: 80,
            dataIndex: ['downloadHistory', 'createdAt'],
            valueType: 'dateTime',
            ellipsis: true,
        },
        {
            title: intl.formatMessage({
                id: 'component.downloadManagement.table.patternName',
            }),
            width: 80,
            dataIndex: ['pattern', 'name'],
            search: false,
            ellipsis: true,
            render: (_, record) => [
                <Popover
                    key="text"
                    overlayInnerStyle={{ padding: 24 }}
                    title={
                        <>
                            <Title level={4}>
                                {intl.formatMessage({
                                    id: 'component.downloadManagement.table.patternDetail',
                                })}
                            </Title>
                            <Divider />
                        </>
                    }
                    content={
                        <HoverContent
                            type={HoverContentType.pattern}
                            name={record.pattern?.name}
                            value={JSON.parse(record.pattern?.patternSize ?? '')}
                        />
                    }
                >
                    <Text>{record.pattern?.name}</Text>
                </Popover>,
            ],
        },
        {
            title: intl.formatMessage({
                id: 'component.downloadManagement.table.dummyName',
            }),
            width: 80,
            dataIndex: ['dummy', 'name'],
            search: false,
            ellipsis: true,
            render: (_, record) => [
                <Popover
                    key="text"
                    overlayInnerStyle={{ padding: 24 }}
                    title={
                        <>
                            <Title level={4}>
                                {intl.formatMessage({
                                    id: 'component.downloadManagement.table.dummyDetail',
                                })}
                            </Title>
                            <Divider />
                        </>
                    }
                    content={
                        <HoverContent
                            type={HoverContentType.dummy}
                            name={record.dummy?.name}
                            value={JSON.parse(record.dummy?.size ?? '')}
                        />
                    }
                >
                    <Text>{record.dummy?.name}</Text>
                </Popover>,
            ],
        },
        {
            title: intl.formatMessage({
                id: 'component.downloadManagement.table.customerName',
            }),
            width: 80,
            dataIndex: ['customer', 'name'],
            search: false,
            ellipsis: true,
            render: (_, record) => [
                <Popover
                    key="text"
                    overlayInnerStyle={{ padding: 24 }}
                    title={
                        <>
                            <Title level={4}>
                                {intl.formatMessage({
                                    id: 'component.downloadManagement.table.customerDetail',
                                })}
                            </Title>
                            <Divider />
                        </>
                    }
                    content={
                        <HoverContent
                            type={HoverContentType.customer}
                            name={record.customer?.name}
                            value={JSON.parse(record.customer?.size ?? '')}
                        />
                    }
                >
                    <Text>{record.customer?.name}</Text>
                </Popover>,
            ],
        },
        {
            title: intl.formatMessage({
                id: 'component.table.actions',
            }),
            width: 80,
            valueType: 'option',
            render: (_, record, __, action) => [
                <Button
                    key="view"
                    type="text"
                    icon={<DownloadOutlined />}
                    loading={
                        actionId === record.downloadHistory?.historyId && downloadDxfFileLoading
                    }
                    onClick={() =>
                        handleDownload(
                            record.downloadHistory?.historyId,
                            record.downloadHistory?.cosKey,
                        )
                    }
                />,
                <Popconfirm
                    key="delete"
                    title={intl.formatMessage({
                        id: 'component.downloadManagement.table.deleteTipTitle',
                    })}
                    description={intl.formatMessage({
                        id: 'component.table.deleteTip',
                    })}
                    onConfirm={() => handleDelete(record.downloadHistory?.historyId, action)}
                >
                    <Button
                        type="text"
                        icon={<DeleteOutlined />}
                        loading={
                            actionId === record.downloadHistory?.historyId &&
                            deleteDownloadHistoryLoading
                        }
                    />
                </Popconfirm>,
            ],
        },
    ];

    const handleBatchDelete = useMemoizedFn((ids, onCleanSelected) => {
        deleteHistories({
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
                    setError('deleteHistories failed');
                }
            })
            .catch((err) => {
                setError(handleApiError(err, ApiType.DeleteDownloadHistory));
            });
    });

    return (
        <ProTable<API.DownloadHistoryData>
            id="downloadHistoryTable"
            actionRef={actionRef}
            columns={columns}
            scroll={{ y: height }}
            rowSelection={{
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
                                id: 'component.downloadManagement.table.deleteTipTitle',
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
            request={(params) => request(params)}
            onRequestError={(err) => {
                setError(handleApiError(err, ApiType.GetDownloadHistories));
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
            rowKey={(record) => record.downloadHistory?.historyId ?? ''}
        />
    );
};

export default Table;
