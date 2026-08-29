import { getFemaleCategory, getMaleCategory } from '@/utils/utils';
import { useIntl, useModel } from '@umijs/max';
import { Drawer } from 'antd';
import { useEffect, useState } from 'react';
import PatternForm from './components/PatternForm';

type Props = {
    open: boolean;
    onClose: () => void;
    actionType: 'autoGrading' | 'uploadPattern';
};

const SelectPointsDrawer: React.FC<Props> = (props) => {
    const [categoryStruct, setCategoryStruct] = useState<any>();

    const { startPick } = useModel('selectPointsDrawerModel', (model) => ({
        startPick: model.startPick,
    }));
    const { gender, category } = useModel('globalModel', (model) => ({
        gender: model.gender,
        category: model.category,
    }));
    const intl = useIntl();

    useEffect(() => {
        if (gender === 'male') {
            setCategoryStruct(getMaleCategory(intl, category));
        } else {
            setCategoryStruct(getFemaleCategory(intl, category));
        }
    }, [gender, category]);

    return (
        <Drawer
            id="pointsDrawer"
            title={intl.formatMessage({
                id: 'component.uploadPattern.form.guidline.title',
            })}
            placement="right"
            // onClose={props.onClose}
            open={startPick}
            mask={false}
            closable={false}
            styles={{
                body: {
                    padding: 0,
                    overflow: 'hidden',
                },
            }}
        >
            <PatternForm
                category={categoryStruct?.category ?? ''}
                categoryName={categoryStruct?.name}
                refImage={categoryStruct?.refImage}
                patterns={categoryStruct?.patterns ?? []}
                actionType={props.actionType}
            />
            {/* <Tabs
                type="card"
                activeKey={category}
                items={
                    gender === 'male'
                        ? getMaleCategories(intl).map((cate) => ({
                              label: cate.name,
                              key: cate.category,
                              active: cate.category === category,
                              forceRender: true,
                              children: (
                                  <PatternForm
                                      category={cate.category}
                                      categoryName={cate.name}
                                      refImage={cate.refImage}
                                      patterns={cate.patterns}
                                      actionType={props.actionType}
                                  />
                              ),
                          }))
                        : getFemaleCategories(intl).map((cate) => ({
                              label: cate.name,
                              key: cate.category,
                              active: cate.category === category,
                              forceRender: true,
                              children: (
                                  <PatternForm
                                      category={cate.category}
                                      categoryName={cate.name}
                                      refImage={cate.refImage}
                                      patterns={cate.patterns}
                                      actionType={props.actionType}
                                  />
                              ),
                          }))
                }
            /> */}
        </Drawer>
    );
};
export default SelectPointsDrawer;
