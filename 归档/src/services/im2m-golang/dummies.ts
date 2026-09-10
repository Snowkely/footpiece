// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** get all dummies of user response status：SUCCESS、TOKEN_MISSING、INVALID_TOKEN,NO_USER_FOUND GET /api/v1/dummies */
export async function getDummies(
    // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
    params: API.getDummiesParams,
    options?: { [key: string]: any },
) {
    return request<API.HTTPResponse & { data?: API.GetDummiesResp }>('/api/v1/dummies', {
        method: 'GET',
        params: {
            ...params,
        },
        ...(options || {}),
    });
}

/** update dummy response status：SUCCESS、TOKEN_MISSING、INVALID_TOKEN、NOT_FOUND,NO_USER_FOUND PUT /api/v1/dummies */
export async function updateDummy(body: API.UpdateDummyReq, options?: { [key: string]: any }) {
    return request<API.HTTPResponse & { data?: API.Dummy }>('/api/v1/dummies', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        data: body,
        ...(options || {}),
    });
}

/** create dummy response status：SUCCESS、TOKEN_MISSING、INVALID_TOKEN、NO_USER_FOUND,EXSITS POST /api/v1/dummies */
export async function createDummy(body: API.CreateDummyReq, options?: { [key: string]: any }) {
    return request<API.HTTPResponse & { data?: API.Dummy }>('/api/v1/dummies', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        data: body,
        ...(options || {}),
    });
}

/** get dummy by id response status：SUCCESS、TOKEN_MISSING、INVALID_TOKEN、NOT_FOUND GET /api/v1/dummies/${param0} */
export async function getDummy(
    // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
    params: API.getDummyParams,
    options?: { [key: string]: any },
) {
    const { id: param0, ...queryParams } = params;
    return request<API.HTTPResponse & { data?: API.Dummy }>(`/api/v1/dummies/${param0}`, {
        method: 'GET',
        params: { ...queryParams },
        ...(options || {}),
    });
}

/** delete dummy by id response status：SUCCESS、TOKEN_MISSING、INVALID_TOKEN、NOT_FOUND、DELETE_FORBIDDEN DELETE /api/v1/dummies/${param0} */
export async function deleteDummy(
    // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
    params: API.deleteDummyParams,
    options?: { [key: string]: any },
) {
    const { id: param0, ...queryParams } = params;
    return request<API.HTTPResponse>(`/api/v1/dummies/${param0}`, {
        method: 'DELETE',
        params: { ...queryParams },
        ...(options || {}),
    });
}

/** patch delete dummy by ids response status：SUCCESS、TOKEN_MISSING、INVALID_TOKEN、NOT_FOUND、DELETE_DUMMIES_FORBIDDEN DELETE /api/v1/dummies/deleteByIds */
export async function deleteDummyByIds(body: API.DeleteByIdsReq, options?: { [key: string]: any }) {
    return request<API.HTTPResponse>('/api/v1/dummies/deleteByIds', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        data: body,
        ...(options || {}),
    });
}
