import component from './zh-CN/component';
import menu from './zh-CN/menu';
import pages from './zh-CN/pages';
import pwa from './zh-CN/pwa';
import settingDrawer from './zh-CN/settingDrawer';
import settings from './zh-CN/settings';

export default {
    'navBar.lang': '语言',
    'app.copyright.produced': 'Cafilab出品',
    ...pages,
    ...menu,
    ...settingDrawer,
    ...settings,
    ...pwa,
    ...component,
};
