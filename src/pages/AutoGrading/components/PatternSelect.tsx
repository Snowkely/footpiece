import { GolangServerCode } from '@/requestConfig';
import { ApiType, handleApiError } from '@/utils/errHandler';
import { ProFormSelect } from '@ant-design/pro-components';
import { useIntl, useModel } from '@umijs/max';
import { useMemoizedFn } from 'ahooks';
import { useState } from 'react';

type Props = {
    showLeftDrawer: () => void;
};

const PatternSelect: React.FC<Props> = (props) => {
    const intl = useIntl();
    const [patterns, setPatterns] = useState<API.Pattern[]>();

    const { getPatterns, setPatternId, setStepAutoGrading } = useModel(
        'AutoGrading.model',
        (model) => ({
            getPatterns: model.getPatternsRun,
            setPatternId: model.setPatternId,
            setStepAutoGrading: model.setStep,
        }),
    );

    const { setBlocks } = useModel('uploadModel', (model) => ({
        setBlocks: model.setBlocks,
    }));

    const { setGender, setCategory, setError } = useModel('globalModel', (model) => ({
        setGender: model.setGender,
        setCategory: model.setCategory,
        setError: model.setError,
    }));

    const { setDummyId, setPatternSize, setPatternName } = useModel(
        'basicSizeFormModel',
        (model) => ({
            setDummyId: model.setDummyId,
            setPatternSize: model.setPatternSize,
            setPatternName: model.setPatternName,
        }),
    );

    const request = async () => {
        try {
            const resp = await getPatterns({ page: 0, size: -1 });
            if (resp && resp.data && resp.code === GolangServerCode.SUCCESS && resp.data.patterns) {
                setPatterns(resp.data.patterns);
                return resp.data.patterns.map((item: API.Pattern) => ({
                    label: item.name,
                    value: item.patternId,
                }));
            }
        } catch (err) {
            setError(handleApiError(err, ApiType.GetPatterns));
        }
        return [];
    };

    const handlePatternSelect = useMemoizedFn((value) => {
        setPatternId(value);
        const pattern = patterns?.find((item) => item.patternId === value);
        if (pattern) {
            setBlocks({ blocks: JSON.parse(pattern.dxfInfo ?? '') });
            setPatternName(pattern.name);
            setGender(pattern.gender === 'male' ? 'male' : 'female');
            setCategory(pattern.category);
            setPatternSize(JSON.parse(pattern.patternSize ?? ''));
            setDummyId(pattern.idDummy);
            setStepAutoGrading({
                current: 3,
                status: {
                    s1Status: 'finish',
                    s2Status: 'finish',
                    s3Status: 'finish',
                    s4Status: 'process',
                },
                msg: {
                    s1Msg: intl.formatMessage({
                        id: 'component.autoGrading.step.uploadTip',
                    }),
                    s2Msg: intl.formatMessage({
                        id: 'component.uploadPattern.form.baseSizeSaved',
                    }),
                    s3Msg: intl.formatMessage(
                        {
                            id: 'component.uploadPattern.form.guidline.dataSaved',
                        },
                        { name: pattern.category },
                    ),
                    s4Msg: '',
                },
            });
            props.showLeftDrawer();
        }
    });

    return (
        <>
            <ProFormSelect
                name={'pattern'}
                placeholder={intl.formatMessage({
                    id: 'component.autoGrading.selectPattern.placeholder',
                })}
                style={{ minWidth: 200 }}
                fieldProps={{
                    size: 'large',
                }}
                request={request}
                onChange={handlePatternSelect}
            />
        </>
    );
};
export default PatternSelect;
