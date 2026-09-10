import { getFemaleCategories, getMaleCategories } from '@/utils/utils';
import { useIntl, useModel } from '@umijs/max';
import { Drawer, Tabs } from 'antd';
import PatternForm from './components/PatternForm';

type Props = {
    open: boolean;
    onClose: () => void;
};

const RightRefDrawer: React.FC<Props> = (props) => {
    const intl = useIntl();

    const { patternGender } = useModel('ViewPattern.model', (model) => ({
        patternGender: model.patternGender,
    }));

    return (
        <Drawer
            id="pointsDrawer"
            title={intl.formatMessage({
                id: 'component.uploadPattern.form.guidline.title',
            })}
            placement="right"
            onClose={props.onClose}
            open={props.open}
            mask={false}
            styles={{
                body: {
                    padding: 0,
                    overflow: 'hidden',
                },
            }}
        >
            <Tabs
                type="card"
                items={
                    patternGender === 'male'
                        ? getMaleCategories(intl).map((category) => ({
                              label: category.name,
                              key: category.category,
                              children: (
                                  <PatternForm
                                      category={category.category}
                                      categoryName={category.name}
                                      refImage={category.refImage}
                                      patterns={category.patterns}
                                  />
                              ),
                          }))
                        : getFemaleCategories(intl).map((category) => ({
                              label: category.name,
                              key: category.category,
                              children: (
                                  <PatternForm
                                      category={category.category}
                                      categoryName={category.name}
                                      refImage={category.refImage}
                                      patterns={category.patterns}
                                  />
                              ),
                          }))
                }
            />
        </Drawer>
    );
};
export default RightRefDrawer;
