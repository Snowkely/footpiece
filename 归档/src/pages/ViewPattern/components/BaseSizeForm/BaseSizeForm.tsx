/* eslint-disable @typescript-eslint/no-unused-vars */
import { firstLetterUpper } from '@/utils/utils';
import { DrawerForm } from '@ant-design/pro-components';
import { useIntl, useModel } from '@umijs/max';
import { useMemoizedFn } from 'ahooks';
import { Button, Form } from 'antd';
import { useEffect } from 'react';
import BasicInfo from './components/BasicInfo';
import DummySizeForm from './components/DummySizeForm';
import PatternSizeForm from './components/PatternSizeForm';

type Props = {
    open: boolean;
    onClose: () => void;
    showRightRefDrawer: () => void;
};

const BaseSizeForm: React.FC<Props> = (props) => {
    const [form] = Form.useForm();
    const intl = useIntl();

    const { dummyId, patternSize, patternName, patternCategory, getPatternLoading } = useModel(
        'ViewPattern.model',
        (model) => ({
            dummyId: model.dummyId,
            patternSize: model.patternSize,
            patternName: model.patternName,
            patternCategory: model.patternCategory,
            getPatternLoading: model.getPatternLoading,
        }),
    );

    useEffect(() => {
        if (patternSize) {
            for (let [k, v] of Object.entries(patternSize)) {
                form.setFieldValue(`pattern${firstLetterUpper(k)}`, v.size);
            }
            form.setFieldsValue({
                patternName: patternName,
                category: patternCategory,
            });
        }
    }, [patternSize]);

    const onClose = useMemoizedFn(() => {
        props.onClose();
    });

    return (
        <>
            <DrawerForm
                title={intl.formatMessage({
                    id: 'component.uploadPattern.form.baseSizeFormTitle',
                })}
                width={window.innerWidth * 0.7}
                form={form}
                loading={getPatternLoading}
                open={props.open}
                drawerProps={{
                    onClose: onClose,
                    placement: 'right',
                }}
                submitter={false}
            >
                <BasicInfo />
                <DummySizeForm form={form} />
                <PatternSizeForm />
                <Button style={{ marginTop: 40 }} onClick={props.showRightRefDrawer}>
                    {intl.formatMessage({
                        id: 'component.viewPattern.form.viewPoints',
                    })}
                </Button>
            </DrawerForm>
        </>
    );
};
export default BaseSizeForm;
