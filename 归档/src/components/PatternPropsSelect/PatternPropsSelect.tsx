import { getFemaleCategories, getMaleCategories } from '@/utils/utils';
import { useIntl, useModel } from '@umijs/max';
import { Flex, Typography, theme } from 'antd';
import React from 'react';
import CheckCard from './CheckCard';
import styles from './index.less';

const { Title } = Typography;

const PatternPropsSelect: React.FC = () => {
    const intl = useIntl();
    const { useToken } = theme;
    const { token: themeToken } = useToken();

    const { gender, category, setGender, setCategory } = useModel('globalModel', (model) => ({
        gender: model.gender,
        category: model.category,
        setGender: model.setGender,
        setCategory: model.setCategory,
    }));

    return (
        <Flex vertical gap={32} justify="center" align="center">
            <Flex vertical align="center" justify="center" gap={8}>
                <Flex gap={8} justify="center" align="center">
                    <Flex
                        className={styles.step}
                        style={{ backgroundColor: themeToken.colorPrimary }}
                        justify="center"
                        align="center"
                    >
                        1
                    </Flex>
                    <Title level={5} style={{ marginBottom: 0 }}>
                        {intl.formatMessage({
                            id: 'component.patternPropsSelect.selectGender',
                        })}
                    </Title>
                </Flex>
                <Flex gap={27}>
                    <CheckCard
                        name={intl.formatMessage({
                            id: 'component.patternPropsSelect.female',
                        })}
                        checked={gender === 'female'}
                        onClick={() => setGender('female')}
                    />
                    <CheckCard
                        name={intl.formatMessage({
                            id: 'component.patternPropsSelect.male',
                        })}
                        checked={gender === 'male'}
                        onClick={() => setGender('male')}
                    />
                </Flex>
            </Flex>
            <Flex vertical align="center" justify="center" gap={8}>
                <Flex gap={8} justify="center" align="center">
                    <Flex
                        className={styles.step}
                        style={{ backgroundColor: themeToken.colorPrimary }}
                        justify="center"
                        align="center"
                    >
                        2
                    </Flex>
                    <Title level={5} style={{ marginBottom: 0 }}>
                        {intl.formatMessage({
                            id: 'component.patternPropsSelect.selectCategory',
                        })}
                    </Title>
                </Flex>
                <Flex gap={27}>
                    {gender === 'male'
                        ? getMaleCategories(intl).map((item) => {
                              return (
                                  <CheckCard
                                      name={item.name}
                                      key={item.category}
                                      checked={category === item.category}
                                      onClick={() =>
                                          gender === undefined
                                              ? undefined
                                              : setCategory(item.category)
                                      }
                                  />
                              );
                          })
                        : getFemaleCategories(intl).map((item) => {
                              return (
                                  <CheckCard
                                      name={item.name}
                                      key={item.category}
                                      checked={category === item.category}
                                      onClick={() =>
                                          gender === undefined
                                              ? undefined
                                              : setCategory(item.category)
                                      }
                                  />
                              );
                          })}
                </Flex>
            </Flex>
        </Flex>
    );
};
export default PatternPropsSelect;
