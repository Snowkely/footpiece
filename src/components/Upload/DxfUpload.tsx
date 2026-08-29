import { GolangServerCode } from '@/requestConfig';
import { ApiType, handleApiError } from '@/utils/errHandler';
import { InboxOutlined } from '@ant-design/icons';
import { useIntl, useModel } from '@umijs/max';
import { useMemoizedFn } from 'ahooks';
import { Upload } from 'antd';
import Dragger from 'antd/es/upload/Dragger';
import React from 'react';

type Props = {
    actionType: 'uploadPattern' | 'autoGrading';
    disabled?: boolean;
};

const DxfUpload: React.FC<Props> = (props) => {
    const intl = useIntl();

    const { fileList, parseDxfFileRun, setBlocks, setFileList, setPatternFile } = useModel(
        'uploadModel',
        (model) => ({
            fileList: model.fileList,
            parseDxfFileRun: model.parseDxfFileRun,
            setBlocks: model.setBlocks,
            setFileList: model.setFileList,
            setPatternFile: model.setPatternFile,
        }),
    );

    const { setError } = useModel('globalModel', (model) => ({
        setError: model.setError,
    }));

    const { setStepAutoGrading } = useModel('AutoGrading.model', (model) => ({
        setStepAutoGrading: model.setStep,
    }));

    const { setStepUploadPattern } = useModel('UploadPattern.model', (model) => ({
        setStepUploadPattern: model.setStep,
    }));

    const { resetAllDxfScene } = useModel('dxfSceneModel', (model) => ({
        resetAllDxfScene: model.resetAll,
    }));

    const beforeUpload = useMemoizedFn((file: File, filelist: File[]) => {
        if (file.name.slice(-4) !== '.dxf') {
            setError(
                intl.formatMessage({
                    id: 'message.upload.onlyDxf',
                }),
            );
            return Upload.LIST_IGNORE;
        }
        if (filelist.length > 1) {
            setError(
                intl.formatMessage({
                    id: 'message.upload.multiFiles',
                }),
            );
            return Upload.LIST_IGNORE;
        }
        const isLt10M = file.size / 1024 / 1024 < 10;
        if (!isLt10M) {
            setError(
                intl.formatMessage({
                    id: 'message.upload.limitSize',
                }),
            );
            return Upload.LIST_IGNORE;
        }
        return true;
    });

    const handleChange = useMemoizedFn((info: any) => {
        const { status } = info.file;
        setFileList(info.fileList);
        if (status === 'done') {
            // 状态有：uploading done error removed，被 beforeUpload 拦截的文件没有 status 属性
        } else if (status === 'error') {
        } else if (status === 'removed') {
            resetAllDxfScene();
            if (props.actionType === 'autoGrading') {
                setStepAutoGrading({
                    current: 0,
                    status: {
                        s1Status: 'error',
                        s2Status: 'wait',
                        s3Status: 'wait',
                        s4Status: 'wait',
                    },
                    msg: {
                        s1Msg: intl.formatMessage({
                            id: 'component.autoGrading.step.upload.removeTip',
                        }),
                        s2Msg: '',
                        s3Msg: '',
                        s4Msg: '',
                    },
                });
            } else {
                setStepUploadPattern({
                    current: 0,
                    status: {
                        s1Status: 'error',
                        s2Status: 'wait',
                        s3Status: 'wait',
                    },
                    msg: {
                        s1Msg: intl.formatMessage({
                            id: 'component.autoGrading.step.upload.removeTip',
                        }),
                        s2Msg: '',
                        s3Msg: '',
                    },
                });
            }
        }
    });

    return (
        <Dragger
            customRequest={async (options) => {
                parseDxfFileRun({}, options.file as any)
                    .then((resp) => {
                        if (resp && resp.code === GolangServerCode.SUCCESS && resp.data) {
                            setPatternFile(options.file);
                            setBlocks({ blocks: resp.data.dxfInfoList });
                            resetAllDxfScene();
                            if (props.actionType === 'autoGrading') {
                                setStepAutoGrading({
                                    current: 1,
                                    status: {
                                        s1Status: 'finish',
                                        s2Status: 'process',
                                        s3Status: 'wait',
                                        s4Status: 'wait',
                                    },
                                    msg: {
                                        s1Msg: intl.formatMessage({
                                            id: 'component.autoGrading.step.uploadTip',
                                        }),
                                        s2Msg: '',
                                        s3Msg: '',
                                        s4Msg: '',
                                    },
                                });
                            } else {
                                setStepUploadPattern({
                                    current: 1,
                                    status: {
                                        s1Status: 'finish',
                                        s2Status: 'process',
                                        s3Status: 'wait',
                                    },
                                    msg: {
                                        s1Msg: intl.formatMessage({
                                            id: 'component.autoGrading.step.uploadTip',
                                        }),
                                        s2Msg: '',
                                        s3Msg: '',
                                    },
                                });
                            }
                            options.onSuccess?.(resp);
                        } else {
                            setError('parse dxf error');
                            options.onError?.(new Error('parse dxf error'));
                        }
                    })
                    .catch((err) => {
                        setError(handleApiError(err, ApiType.ParseDxf));
                    });
            }}
            maxCount={1}
            beforeUpload={beforeUpload}
            onChange={handleChange}
            fileList={fileList}
            disabled={props.disabled}
        >
            <p className="ant-upload-drag-icon">
                <InboxOutlined />
            </p>
            <p className="ant-upload-text">
                {intl.formatMessage({
                    id: 'component.uploadPattern.form.uploadDxf',
                })}
            </p>
        </Dragger>
    );
};
export default DxfUpload;
