import DressRefImage from '@/assets/dressRefImage.jpg';
import FemaleJacketRefImage from '@/assets/femaleJacketRefImage.jpg';
import FemaleShirtRefImage from '@/assets/femaleShirtRefImage.png';
import MaleJacketRefImage from '@/assets/maleJacketRefImage.png';
import MaleShirtRefImage from '@/assets/maleShirtRefImage.png';
import SkirtsRefImage from '@/assets/skirtsRefImage.png';
import TrousersRefImage from '@/assets/trousersRefImage.png';
import { Constants } from '@/constants';
import { ROUTE_LOGIN } from '@/constants/routes';
import { history } from '@umijs/max';
import { stringify } from 'querystring';

/** 是否是开发环境 */
export function isDev() {
    return process.env.NODE_ENV === 'development';
}

// 判断是否是手机端
export function isMobile() {
    if (document.body.clientWidth < 768) {
        return true;
    }
    return false;
}

/** 获取im2m项目的golang数据服务器地址 */
export function im2mGolangServerUrl() {
    return isDev() ? 'http://127.0.0.1:8080' : 'https://imtm-api.cafilab.cn';
}

// 判断url路径是否匹配，忽略最后的/
export function isPathMatch(path: string, targetPath: string) {
    return path.replace(/\/$/, '') === targetPath.replace(/\/$/, '');
}

// 通过响应下载文件
export function downloadFile(resp: string) {
    const blob = new Blob([resp]);

    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = Date.now() + '.dxf';

    a.click();

    URL.revokeObjectURL(url);
}

/**
 * 用户因为token失效退出登录，并且将当前的 url 保存
 */
export const forceLogout = async () => {
    const { search, pathname } = window.location;
    const urlParams = new URL(window.location.href).searchParams;
    /** 此方法会跳转到 redirect 参数所在的位置 */
    const redirect = urlParams.get('redirect');
    // Note: There may be security issues, please note
    if (window.location.pathname !== ROUTE_LOGIN && !redirect) {
        history.replace({
            pathname: ROUTE_LOGIN,
            search: stringify({
                redirect: pathname + search,
            }),
        });
    }
};

// 将一个字符串的首字母大写
export const firstLetterUpper = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};

// 选择男士服装样式
export const getMaleCategories = (intl: any) => {
    return [
        {
            category: Constants.SHIRT,
            refImage: MaleShirtRefImage,
            name: intl.formatMessage({
                id: 'component.patternPropsSelect.shirt',
            }),
            patterns: [
                { key: 'front', value: 'Front' },
                { key: 'placket', value: 'Placket' },
                { key: 'back', value: 'Back' },
                { key: 'sleeve', value: 'Sleeve' },
                { key: 'collar1', value: 'Collar1' },
                { key: 'collar2', value: 'Collar2' },
            ],
        },
        {
            category: Constants.JACKET,
            refImage: MaleJacketRefImage,
            name: intl.formatMessage({
                id: 'component.patternPropsSelect.jacket',
            }),
            patterns: [
                { key: 'front', value: 'Front' },
                { key: 'back', value: 'Back' },
                { key: 'side', value: 'Side' },
                { key: 'sleeveTop', value: 'SleeveTop' },
                { key: 'sleeveUnder', value: 'SleeveUnder' },
                { key: 'collar', value: 'Collar' },
            ],
        },
        {
            category: Constants.PANTS,
            refImage: TrousersRefImage,
            name: intl.formatMessage({
                id: 'component.patternPropsSelect.pants',
            }),
            patterns: [
                { key: 'front', value: 'Front' },
                { key: 'back', value: 'Back' },
            ],
        },
    ];
};

export const getMaleCategory = (intl: any, category: string | undefined) => {
    return getMaleCategories(intl).find((it) => it.category === category);
};

// 选择女士服装样式
export const getFemaleCategories = (intl: any) => {
    return [
        {
            category: Constants.SHIRT,
            refImage: FemaleShirtRefImage,
            name: intl.formatMessage({
                id: 'component.patternPropsSelect.shirt',
            }),
            patterns: [
                { key: 'front', value: 'Front' },
                { key: 'back', value: 'Back' },
                { key: 'sleeve', value: 'Sleeve' },
                { key: 'collar', value: 'Collar' },
            ],
        },
        {
            category: Constants.JACKET,
            refImage: FemaleJacketRefImage,
            name: intl.formatMessage({
                id: 'component.patternPropsSelect.jacket',
            }),
            patterns: [
                { key: 'front1', value: 'Front1' },
                { key: 'front2', value: 'Front2' },
                { key: 'back1', value: 'Back1' },
                { key: 'back2', value: 'Back2' },
                { key: 'sleeve1', value: 'Sleeve1' },
                { key: 'sleeve2', value: 'Sleeve2' },
                { key: 'collar1', value: 'Collar1' },
                { key: 'collar2', value: 'Collar2' },
            ],
        },
        {
            category: Constants.PANTS,
            refImage: TrousersRefImage,
            name: intl.formatMessage({
                id: 'component.patternPropsSelect.pants',
            }),
            patterns: [
                { key: 'front', value: 'Front' },
                { key: 'back', value: 'Back' },
                { key: 'waistband', value: 'Waistband' },
            ],
        },
        {
            category: Constants.SKIRTS,
            refImage: SkirtsRefImage,
            name: intl.formatMessage({
                id: 'component.patternPropsSelect.skirts',
            }),
            patterns: [
                { key: 'front', value: 'Front' },
                { key: 'back', value: 'Back' },
            ],
        },
        {
            category: Constants.DRESS,
            refImage: DressRefImage,
            name: intl.formatMessage({
                id: 'component.patternPropsSelect.dress',
            }),
            patterns: [
                { key: 'front', value: 'Front' },
                { key: 'back', value: 'Back' },
                { key: 'sleeve', value: 'Sleeve' },
            ],
        },
    ];
};

export const getFemaleCategory = (intl: any, category: string | undefined) => {
    return getFemaleCategories(intl).find((it) => it.category === category);
};

// 选择Bust/Chest
export const getBustChest = (intl: any) => {
    return [
        {
            key: 'normal',
            name: intl.formatMessage({
                id: 'component.autoGrading.form.bodyShape.normal',
            }),
        },
        {
            key: 'larger',
            name: intl.formatMessage({
                id: 'component.autoGrading.form.bodyShape.bustChest.larger',
            }),
        },
    ];
};

// 选择Belly hump degree
export const getBellyHumpDegree = (intl: any) => {
    return [
        {
            key: 'normal',
            name: intl.formatMessage({
                id: 'component.autoGrading.form.bodyShape.normal',
            }),
        },
        {
            key: 'curved',
            name: intl.formatMessage({
                id: 'component.autoGrading.form.bodyShape.belly.curved',
            }),
        },
    ];
};

// 选择Shoulder slope
export const getShoulderSlope = (intl: any) => {
    return [
        {
            key: 'straight',
            name: intl.formatMessage({
                id: 'component.autoGrading.form.bodyShape.shoulder.straight',
            }),
        },
        {
            key: 'normal',
            name: intl.formatMessage({
                id: 'component.autoGrading.form.bodyShape.shoulder.normal',
            }),
        },
        {
            key: 'sloping',
            name: intl.formatMessage({
                id: 'component.autoGrading.form.bodyShape.shoulder.sloping',
            }),
        },
    ];
};
