// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** get all users response status：SUCCESS、NOT_FOUND GET /api/v1/users */
export async function getUsers(options?: { [key: string]: any }) {
    return request<API.HTTPResponse & { data?: API.User[] }>('/api/v1/users', {
        method: 'GET',
        ...(options || {}),
    });
}

/** update user response status：SUCCESS、TOKEN_MISSING、INVALID_TOKEN、NOT_FOUND PUT /api/v1/users */
export async function updateUser(body: API.UpdateUserReq, options?: { [key: string]: any }) {
    return request<API.HTTPResponse & { data?: API.User }>('/api/v1/users', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        data: body,
        ...(options || {}),
    });
}

/** create user response status：SUCCESS、NOT_FOUND、EXSITS POST /api/v1/users */
export async function createUser(body: API.CreateUserReq, options?: { [key: string]: any }) {
    return request<API.HTTPResponse & { data?: API.User }>('/api/v1/users', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        data: body,
        ...(options || {}),
    });
}

/** get user by id response status：SUCCESS、NOT_FOUND GET /api/v1/users/${param0} */
export async function getUser(
    // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
    params: API.getUserParams,
    options?: { [key: string]: any },
) {
    const { id: param0, ...queryParams } = params;
    return request<API.HTTPResponse & { data?: API.User }>(`/api/v1/users/${param0}`, {
        method: 'GET',
        params: { ...queryParams },
        ...(options || {}),
    });
}

/** get user by auth id response status：SUCCESS、TOKEN_MISSING、INVALID_TOKEN、NOT_FOUND GET /api/v1/users/getUserByAuthId */
export async function getUserByAuthid(options?: { [key: string]: any }) {
    return request<API.HTTPResponse & { data?: API.User }>('/api/v1/users/getUserByAuthId', {
        method: 'GET',
        ...(options || {}),
    });
}
