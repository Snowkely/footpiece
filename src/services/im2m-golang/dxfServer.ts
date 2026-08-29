// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** check api status response status：SUCCESS、DXF_SERVER_ERR GET /api/v1/calcDxf */
export async function checkStatus(options?: { [key: string]: any }) {
    return request<API.HTTPResponse & { data?: string }>('/api/v1/calcDxf', {
        method: 'GET',
        ...(options || {}),
    });
}

/** download dxf file from cos response status：SUCCESS、TOKEN_MISSING、INVALID_TOKEN, GET /api/v1/calcDxf/download */
export async function downloadDxfFile(
    // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
    params: API.downloadDxfFileParams,
    options?: { [key: string]: any },
) {
    return request<any>('/api/v1/calcDxf/download', {
        method: 'GET',
        params: {
            ...params,
        },
        ...(options || {}),
    });
}

/** download dxf file from cos and save history response status：SUCCESS、TOKEN_MISSING、INVALID_TOKEN,NO_USER_FOUND POST /api/v1/calcDxf/download */
export async function downloadWithInfo(
    body: API.DownloadWithInfoReq,
    options?: { [key: string]: any },
) {
    return request<any>('/api/v1/calcDxf/download', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        data: body,
        ...(options || {}),
    });
}

/** generate dxf, user data not saved response status：SUCCESS、TOKEN_MISSING、INVALID_TOKEN、DXF_SERVER_ERR,NO_USER_FOUND,CUSTOMER_SIZE_NAME_EXSITS,PATTERN_NOT_FOUND,DUMMY_NOT_FOUND,CUSTOMER_NOT_FOUND POST /api/v1/calcDxf/generateDxf */
export async function generateDxf(body: API.GenerateDxfReq, options?: { [key: string]: any }) {
    return request<API.HTTPResponse & { data?: API.GenerateDxfResp & { dxfData?: API.DxfData } }>(
        '/api/v1/calcDxf/generateDxf',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            data: body,
            ...(options || {}),
        },
    );
}

/** generate auto grading dxf, return new dxf file response status：SUCCESS、TOKEN_MISSING、INVALID_TOKEN、NO_USER_FOUND,EXSITS，DXF_SERVER_ERR,NOT_FOUND POST /api/v1/calcDxf/generateDxfFile */
export async function generateDxfFile(
    body: {
        category?: string;
        customerStr?: string;
        dummyId?: string;
        dummyName?: string;
        dummySizeStr?: string;
        dxfInfoStr?: string;
        gender?: string;
        patternId?: string;
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

    return request<API.HTTPResponse & { data?: API.GenerateDxfResp & { dxfData?: API.DxfData } }>(
        '/api/v1/calcDxf/generateDxfFile',
        {
            method: 'POST',
            data: formData,
            requestType: 'form',
            ...(options || {}),
        },
    );
}

/** parse dxf response status：SUCCESS、TOKEN_MISSING、INVALID_TOKEN、DXF_SERVER_ERR, READ_DXF_FAILED, INVALID_DXF POST /api/v1/calcDxf/parseDxf */
export async function parseDxf(body: API.ParseDxfReq, options?: { [key: string]: any }) {
    return request<API.HTTPResponse & { data?: API.ParseDxfResp }>('/api/v1/calcDxf/parseDxf', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        data: body,
        ...(options || {}),
    });
}

/** parse uploaded dxf file response status：SUCCESS、TOKEN_MISSING、INVALID_TOKEN、DXF_SERVER_ERR, READ_DXF_FAILED, INVALID_DXF POST /api/v1/calcDxf/parseDxfFile */
export async function parseDxfFile(body: {}, file?: File, options?: { [key: string]: any }) {
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

    return request<API.HTTPResponse & { data?: API.ParseDxfResp }>('/api/v1/calcDxf/parseDxfFile', {
        method: 'POST',
        data: formData,
        requestType: 'form',
        ...(options || {}),
    });
}

/** upload dxf file response status：SUCCESS、TOKEN_MISSING、INVALID_TOKEN、DXF_SERVER_ERR POST /api/v1/calcDxf/uploadDxf */
export async function uploadDxf(body: {}, file?: File, options?: { [key: string]: any }) {
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

    return request<API.HTTPResponse & { data?: string }>('/api/v1/calcDxf/uploadDxf', {
        method: 'POST',
        data: formData,
        requestType: 'form',
        ...(options || {}),
    });
}
