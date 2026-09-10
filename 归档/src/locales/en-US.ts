import component from './en-US/component';
import menu from './en-US/menu';
import message from './en-US/message';
import pages from './en-US/pages';
import pwa from './en-US/pwa';
import settingDrawer from './en-US/settingDrawer';
import settings from './en-US/settings';

export default {
    'navBar.lang': 'Languages',
    'app.copyright.produced': 'Produced by Cafilab',
    ...menu,
    ...settingDrawer,
    ...settings,
    ...pwa,
    ...component,
    ...pages,
    ...message,
};
