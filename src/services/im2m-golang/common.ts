// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** check status of the API GET / */
export async function apiStatus(options?: { [key: string]: any }) {
    return request<any>('/', {
        method: 'GET',
        ...(options || {}),
    });
}

/** openAPI doc GET /openapi */
export async function openapi(options?: { [key: string]: any }) {
    return request<any>('/openapi', {
        method: 'GET',
        ...(options || {}),
    });
}
