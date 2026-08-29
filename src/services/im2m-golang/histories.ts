// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** get all histories of download recently, determined by month response status：SUCCESS、TOKEN_MISSING、INVALID_TOKEN,NO_USER_FOUND GET /api/v1/downloadHistories */
export async function getDownloadHistories(
    // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
    params: API.getDownloadHistoriesParams,
    options?: { [key: string]: any },
) {
    return request<API.HTTPResponse & { data?: API.GetDownloadHistoriesResp }>(
        '/api/v1/downloadHistories',
        {
            method: 'GET',
            params: {
                ...params,
            },
            ...(options || {}),
        },
    );
}

/** delete download history by id response status：SUCCESS、TOKEN_MISSING、INVALID_TOKEN、NOT_FOUND DELETE /api/v1/downloadHistories/${param0} */
export async function deleteDownloadHistory(
    // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
    params: API.deleteDownloadHistoryParams,
    options?: { [key: string]: any },
) {
    const { id: param0, ...queryParams } = params;
    return request<API.HTTPResponse>(`/api/v1/downloadHistories/${param0}`, {
        method: 'DELETE',
        params: { ...queryParams },
        ...(options || {}),
    });
}

/** patch delete download history by ids response status：SUCCESS、TOKEN_MISSING、INVALID_TOKEN、NOT_FOUND DELETE /api/v1/downloadHistories/deleteByIds */
export async function deleteDownloadHistoryByIds(
    body: API.DeleteByIdsReq,
    options?: { [key: string]: any },
) {
    return request<API.HTTPResponse>('/api/v1/downloadHistories/deleteByIds', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        data: body,
        ...(options || {}),
    });
}
