import component from './zh-TW/component';
import menu from './zh-TW/menu';
import pages from './zh-TW/pages';
import pwa from './zh-TW/pwa';
import settingDrawer from './zh-TW/settingDrawer';
import settings from './zh-TW/settings';

export default {
    'navBar.lang': '語言',
    'app.copyright.produced': 'Produced by Cafilab',
    ...menu,
    ...settingDrawer,
    ...settings,
    ...pwa,
    ...component,
    ...pages,
};
