// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** get all patterns of user response status：SUCCESS、TOKEN_MISSING、INVALID_TOKEN,NO_USER_FOUND GET /api/v1/patterns */
export async function getPatterns(
    // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
    params: API.getPatternsParams,
    options?: { [key: string]: any },
) {
    return request<API.HTTPResponse & { data?: API.GetPatternsResp }>('/api/v1/patterns', {
        method: 'GET',
        params: {
            ...params,
        },
        ...(options || {}),
    });
}

/** update pattern response status：SUCCESS、TOKEN_MISSING、INVALID_TOKEN、NOT_FOUND,NO_USER_FOUND PUT /api/v1/patterns */
export async function updatePattern(body: API.UpdatePatternReq, options?: { [key: string]: any }) {
    return request<API.HTTPResponse & { data?: API.Pattern }>('/api/v1/patterns', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        data: body,
        ...(options || {}),
    });
}

/** create pattern response status：SUCCESS、TOKEN_MISSING、INVALID_TOKEN、NO_USER_FOUND,EXSITS POST /api/v1/patterns */
export async function createPattern(
    body: {
        category?: string;
        dummyId?: string;
        dummyName?: string;
        dummySizeStr?: string;
        dxfInfo?: string;
        gender?: string;
        patternName?: string;
        patternSizeStr?: string;
    },
    file?: File,
    options?: { [key: string]: any },
) {
    const formData = new FormData();

    if (file) {
        formData.append('file', file);
    }

    Object.keys(body).forEach((ele) => {
        const item = (body as any)[ele];

        if (item !== undefined && item !== null) {
            if (typeof item === 'object' && !(item instanceof File)) {
                if (item instanceof Array) {
                    item.forEach((f) => formData.append(ele, f || ''));
                } else {
                    formData.append(ele, JSON.stringify(item));
                }
            } else {
                formData.append(ele, item);
            }
        }
    });

    return request<API.HTTPResponse & { data?: API.Pattern }>('/api/v1/patterns', {
        method: 'POST',
        data: formData,
        requestType: 'form',
        ...(options || {}),
    });
}

/** get pattern by id response status：SUCCESS、TOKEN_MISSING、INVALID_TOKEN、NOT_FOUND GET /api/v1/patterns/${param0} */
export async function getPattern(
    // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
    params: API.getPatternParams,
    options?: { [key: string]: any },
) {
    const { id: param0, ...queryParams } = params;
    return request<API.HTTPResponse & { data?: API.Pattern }>(`/api/v1/patterns/${param0}`, {
        method: 'GET',
        params: { ...queryParams },
        ...(options || {}),
    });
}

/** delete pattern by id response status：SUCCESS、TOKEN_MISSING、INVALID_TOKEN、NOT_FOUND DELETE /api/v1/patterns/${param0} */
export async function deletePattern(
    // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
    params: API.deletePatternParams,
    options?: { [key: string]: any },
) {
    const { id: param0, ...queryParams } = params;
    return request<API.HTTPResponse>(`/api/v1/patterns/${param0}`, {
        method: 'DELETE',
        params: { ...queryParams },
        ...(options || {}),
    });
}

/** patch delete pattern by ids response status：SUCCESS、TOKEN_MISSING、INVALID_TOKEN、NOT_FOUND DELETE /api/v1/patterns/deleteByIds */
export async function deletePatternByIds(
    body: API.DeleteByIdsReq,
    options?: { [key: string]: any },
) {
    return request<API.HTTPResponse>('/api/v1/patterns/deleteByIds', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        data: body,
        ...(options || {}),
    });
}

/** load pattern by id response status：SUCCESS、TOKEN_MISSING、INVALID_TOKEN、NOT_FOUND POST /api/v1/patterns/load */
export async function loadPattern(body: API.LoadPatternReq, options?: { [key: string]: any }) {
    return request<API.HTTPResponse & { data?: API.LoadPatternResp }>('/api/v1/patterns/load', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        data: body,
        ...(options || {}),
    });
}
