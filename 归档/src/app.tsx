import { AvatarDropdown, AvatarName, Footer, SelectLang } from '@/components';
import type { Settings as LayoutSettings } from '@ant-design/pro-components';
import { PageLoading, SettingDrawer } from '@ant-design/pro-components';
import type { RunTimeLayoutConfig } from '@umijs/max';
import { history } from '@umijs/max';
import defaultSettings from '../config/defaultSettings';
import userAvatar from './assets/icons/user.svg';
import {
    ROUTE_FASHION_LOGIN,
    ROUTE_FORGOT_PSW,
    ROUTE_LOGIN,
    ROUTE_REGISTER,
    ROUTE_RESET_PSW,
    ROUTE_VERIFY_EMAIL,
} from './constants/routes';
import { GolangServerCode, errorConfig } from './requestConfig';
import { getUserByAuthid } from './services/im2m-golang/users';
import { isDev, isPathMatch } from './utils/utils';

/**
 * @see  https://umijs.org/zh-CN/plugins/plugin-initial-state
 * */
export async function getInitialState(): Promise<{
    settings?: Partial<LayoutSettings>;
    currentUser?: API.User;
    loading?: boolean;
    fetchUserInfo?: () => Promise<any>;
}> {
    const fetchUserInfo = async () => {
        try {
            const resp = await getUserByAuthid();
            if (resp && resp.code === GolangServerCode.SUCCESS && resp.data) {
                return resp.data;
            } else {
                history.push(ROUTE_LOGIN);
            }
        } catch (error) {
            history.push(ROUTE_LOGIN);
        }
        return undefined;
    };
    // 如果不是登录页面，执行
    const { location } = history;
    if (
        !isPathMatch(location.pathname, ROUTE_LOGIN) &&
        !isPathMatch(location.pathname, ROUTE_FASHION_LOGIN) &&
        !isPathMatch(location.pathname, ROUTE_REGISTER) &&
        !isPathMatch(location.pathname, ROUTE_VERIFY_EMAIL) &&
        !isPathMatch(location.pathname, ROUTE_RESET_PSW) &&
        !isPathMatch(location.pathname, ROUTE_FORGOT_PSW)
    ) {
        const currentUser = await fetchUserInfo();
        return {
            fetchUserInfo,
            currentUser,
            settings: defaultSettings as Partial<LayoutSettings>,
        };
    }
    return {
        fetchUserInfo,
        settings: defaultSettings as Partial<LayoutSettings>,
    };
}

// ProLayout 支持的api https://procomponents.ant.design/components/layout
export const layout: RunTimeLayoutConfig = ({ initialState, setInitialState }) => {
    return {
        actionsRender: () => [<SelectLang key="SelectLang" />],
        avatarProps: {
            src: userAvatar,
            title: <AvatarName />,
            render: (_, avatarChildren) => {
                return <AvatarDropdown>{avatarChildren}</AvatarDropdown>;
            },
        },
        waterMarkProps: {
            content: initialState?.currentUser?.firstName,
        },
        contentStyle: {
            padding: 0,
            height: '100vh',
            backgroundColor: 'white',
        },
        style: {
            height: '100vh',
        },
        footerRender: () => <Footer />,
        onPageChange: () => {
            const { location } = history;
            // 如果没有登录，重定向到 login
            if (
                !initialState?.currentUser &&
                !isPathMatch(location.pathname, ROUTE_LOGIN) &&
                !isPathMatch(location.pathname, ROUTE_FASHION_LOGIN) &&
                !isPathMatch(location.pathname, ROUTE_REGISTER) &&
                !isPathMatch(location.pathname, ROUTE_VERIFY_EMAIL) &&
                !isPathMatch(location.pathname, ROUTE_RESET_PSW) &&
                !isPathMatch(location.pathname, ROUTE_FORGOT_PSW)
            ) {
                history.push(ROUTE_LOGIN);
            }
        },
        menuHeaderRender(logo) {
            return <div>{logo}</div>;
        },
        // 自定义 403 页面
        // unAccessible: <div>UnAccessible</div>,
        // 增加一个 loading 的状态
        childrenRender: (children) => {
            if (initialState?.loading) return <PageLoading />;
            return (
                <>
                    {children}
                    {isDev() && (
                        <SettingDrawer
                            disableUrlParams
                            enableDarkTheme
                            settings={initialState?.settings}
                            onSettingChange={(settings) => {
                                setInitialState((preInitialState) => ({
                                    ...preInitialState,
                                    settings,
                                }));
                            }}
                        />
                    )}
                </>
            );
        },
        ...initialState?.settings,
    };
};

/**
 * @name request 配置，可以配置错误处理
 * 它基于 axios 和 ahooks 的 useRequest 提供了一套统一的网络请求和错误处理方案。
 * @doc https://umijs.org/docs/max/request#配置
 */
export const request = {
    ...errorConfig,
};
