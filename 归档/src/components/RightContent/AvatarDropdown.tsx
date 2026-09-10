import { ROUTE_LOGIN } from '@/constants/routes';
import { GolangServerCode } from '@/requestConfig';
import { logout } from '@/services/im2m-golang/accounts';
import { ApiType, handleApiError } from '@/utils/errHandler';
import { LogoutOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';
import { useEmotionCss } from '@ant-design/use-emotion-css';
import { history, useIntl, useModel } from '@umijs/max';
import { useRequest } from 'ahooks';
import { Spin, Typography, notification } from 'antd';
import { stringify } from 'querystring';
import type { MenuInfo } from 'rc-menu/lib/interface';
import React, { useCallback } from 'react';
import { flushSync } from 'react-dom';
import HeaderDropdown from '../HeaderDropdown';

const { Text } = Typography;

export type GlobalHeaderRightProps = {
    menu?: boolean;
    children?: React.ReactNode;
};

export const AvatarName = () => {
    const { initialState } = useModel('@@initialState');
    const { currentUser } = initialState || {};
    return <Text strong>{currentUser?.firstName}</Text>;
};

export const AvatarDropdown: React.FC<GlobalHeaderRightProps> = ({ menu, children }) => {
    const [notificationApi, contextHolder] = notification.useNotification();
    const intl = useIntl();

    // logout
    const { run: logoutRun } = useRequest(logout, {
        manual: true,
        onSuccess(resp) {
            if (resp && resp.code === GolangServerCode.SUCCESS) {
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
            } else {
                notificationApi.error({
                    message: intl.formatMessage({
                        id: 'message.error.title',
                    }),
                    description: 'logout failed',
                });
            }
        },
        onError(err) {
            notificationApi.error({
                message: intl.formatMessage({
                    id: 'message.error.title',
                }),
                description: handleApiError(err, ApiType.CreateDummy),
            });
        },
    });
    /**
     * 退出登录，并且将当前的 url 保存
     */
    const loginOut = async () => {
        logoutRun();
    };
    const actionClassName = useEmotionCss(({ token }) => {
        return {
            display: 'flex',
            height: '48px',
            marginLeft: 'auto',
            overflow: 'hidden',
            alignItems: 'center',
            padding: '0 8px',
            cursor: 'pointer',
            borderRadius: token.borderRadius,
            '&:hover': {
                backgroundColor: token.colorBgTextHover,
            },
        };
    });
    const { initialState, setInitialState } = useModel('@@initialState');

    const onMenuClick = useCallback(
        (event: MenuInfo) => {
            const { key } = event;
            if (key === 'logout') {
                flushSync(() => {
                    setInitialState((s) => ({ ...s, currentUser: undefined }));
                });
                loginOut();
                return;
            }
            history.push(`/account/${key}`);
        },
        [setInitialState],
    );

    const loading = (
        <span className={actionClassName}>
            <Spin
                size="small"
                style={{
                    marginLeft: 8,
                    marginRight: 8,
                }}
            />
        </span>
    );

    if (!initialState) {
        return loading;
    }

    const { currentUser } = initialState;

    if (!currentUser || !currentUser.firstName) {
        return loading;
    }

    const menuItems = [
        ...(menu
            ? [
                  {
                      key: 'center',
                      icon: <UserOutlined />,
                      label: '个人中心',
                  },
                  {
                      key: 'settings',
                      icon: <SettingOutlined />,
                      label: '个人设置',
                  },
                  {
                      type: 'divider' as const,
                  },
              ]
            : []),
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: '退出登录',
        },
    ];

    return (
        <>
            {contextHolder}
            <HeaderDropdown
                menu={{
                    selectedKeys: [],
                    onClick: onMenuClick,
                    items: menuItems,
                }}
            >
                {children}
            </HeaderDropdown>
        </>
    );
};
