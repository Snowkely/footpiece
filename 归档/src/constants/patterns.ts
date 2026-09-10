// 定义要选择的标号
export const PointRefs_depre = [
    { key: 'frontPattern_1', value: '1: Front Pattern', patternPart: 'front' },
    { key: 'frontPattern_1_1', value: '1-1: Front Pattern', patternPart: 'front' },
    { key: 'frontPattern_1_2', value: '1-2: Front Pattern', patternPart: 'front' },
    { key: 'frontPattern_1_3', value: '1-3: Front Pattern', patternPart: 'front' },
    { key: 'frontPattern_2', value: '2: Front Pattern', patternPart: 'front' },
    { key: 'frontPattern_3', value: '3: Front Pattern', patternPart: 'front' },
    { key: 'frontPattern_4', value: '4: Front Pattern', patternPart: 'front' },
    { key: 'frontPattern_5', value: '5: Front Pattern', patternPart: 'front' },
    { key: 'frontPattern_6', value: '6: Front Pattern', patternPart: 'front' },
    { key: 'frontPattern_7', value: '7: Front Pattern', patternPart: 'front' },
    { key: 'frontPattern_8', value: '8: Front Pattern', patternPart: 'front' },
    { key: 'frontPattern_9', value: '9: Front Pattern', patternPart: 'front' },

    { key: 'backPattern_1', value: '1: Back Pattern', patternPart: 'back' },
    { key: 'backPattern_1_1', value: '1-1: Back Pattern', patternPart: 'back' },
    { key: 'backPattern_1_2', value: '1-2: Back Pattern', patternPart: 'back' },
    { key: 'backPattern_1_3', value: '1-3: Back Pattern', patternPart: 'back' },
    { key: 'backPattern_2', value: '2: Back Pattern', patternPart: 'back' },
    { key: 'backPattern_3', value: '3: Back Pattern', patternPart: 'back' },
    { key: 'backPattern_4', value: '4: Back Pattern', patternPart: 'back' },
    { key: 'backPattern_5', value: '5: Back Pattern', patternPart: 'back' },
    { key: 'backPattern_6', value: '6: Back Pattern', patternPart: 'back' },
    { key: 'backPattern_7', value: '7: Back Pattern', patternPart: 'back' },
    { key: 'backPattern_8', value: '8: Back Pattern', patternPart: 'back' },
    { key: 'backPattern_9', value: '9: Back Pattern', patternPart: 'back' },
];

// 定义要选择的标号
export const GradingPoints = [
    { value: '1', required: false },
    { value: '1-1', required: false },
    { value: '1-2', required: false },
    { value: '1-3', required: false },
    { value: '1-4', required: false },
    { value: '2', required: false },
    { value: '2-1', required: false },
    { value: '2-2', required: false },
    { value: '2-3', required: false },
    { value: '2-4', required: false },
    { value: '3', required: false },
    { value: '3-1', required: false },
    { value: '3-2', required: false },
    { value: '3-3', required: false },
    { value: '4', required: false },
    { value: '4-1', required: false },
    { value: '5', required: false },
    { value: '5-1', required: false },
    { value: '5-2', required: false },
    { value: '5-3', required: false },
    { value: '6', required: false },
    { value: '7', required: false },
    { value: '7-1', required: false },
    { value: '8', required: false },
    { value: '9', required: false },
    { value: '10', required: false },
    { value: '11', required: false },
    { value: '12', required: false },
];

export type SelectedPointInfo = {
    key: string;
    name: string;
    gradingPoint: string;
    picking: boolean;
    blockName?: string;
    entityType?: string;
    patternPart?: string; // 对于trousers，该值为'front'或者'back'
    pointObj?: API.Point | undefined; // 与服务器通信的数据结构
    orderNum?: number; // 该点的顺序，方便传给后台根据该顺序进行曲线拟合
};

export enum DummyRadio {
    CHOOSE,
    INPUT,
}
