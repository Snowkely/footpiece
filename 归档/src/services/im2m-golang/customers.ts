// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** get all customers of user response status：SUCCESS、TOKEN_MISSING、INVALID_TOKEN,NO_USER_FOUND GET /api/v1/customers */
export async function getCustomers(
    // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
    params: API.getCustomersParams,
    options?: { [key: string]: any },
) {
    return request<API.HTTPResponse & { data?: API.GetCustomersResp }>('/api/v1/customers', {
        method: 'GET',
        params: {
            ...params,
        },
        ...(options || {}),
    });
}

/** update customer response status：SUCCESS、TOKEN_MISSING、INVALID_TOKEN、NOT_FOUND,NO_USER_FOUND PUT /api/v1/customers */
export async function updateCustomer(
    body: API.UpdateCustomerReq,
    options?: { [key: string]: any },
) {
    return request<API.HTTPResponse & { data?: API.Customer }>('/api/v1/customers', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        data: body,
        ...(options || {}),
    });
}

/** create customer response status：SUCCESS、TOKEN_MISSING、INVALID_TOKEN、NO_USER_FOUND,CUSTOMER_SIZE_NAME_EXISTS POST /api/v1/customers */
export async function createCustomer(
    body: API.CreateCustomerReq,
    options?: { [key: string]: any },
) {
    return request<API.HTTPResponse & { data?: API.Customer }>('/api/v1/customers', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        data: body,
        ...(options || {}),
    });
}

/** get customer by id response status：SUCCESS、TOKEN_MISSING、INVALID_TOKEN、NOT_FOUND GET /api/v1/customers/${param0} */
export async function getCustomer(
    // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
    params: API.getCustomerParams,
    options?: { [key: string]: any },
) {
    const { id: param0, ...queryParams } = params;
    return request<API.HTTPResponse & { data?: API.Customer }>(`/api/v1/customers/${param0}`, {
        method: 'GET',
        params: { ...queryParams },
        ...(options || {}),
    });
}

/** delete customer by id response status：SUCCESS、TOKEN_MISSING、INVALID_TOKEN、NOT_FOUND DELETE /api/v1/customers/${param0} */
export async function deleteCustomer(
    // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
    params: API.deleteCustomerParams,
    options?: { [key: string]: any },
) {
    const { id: param0, ...queryParams } = params;
    return request<API.HTTPResponse>(`/api/v1/customers/${param0}`, {
        method: 'DELETE',
        params: { ...queryParams },
        ...(options || {}),
    });
}

/** patch delete customer by ids response status：SUCCESS、TOKEN_MISSING、INVALID_TOKEN、NOT_FOUND DELETE /api/v1/customers/deleteByIds */
export async function deleteCustomerByIds(
    body: API.DeleteByIdsReq,
    options?: { [key: string]: any },
) {
    return request<API.HTTPResponse>('/api/v1/customers/deleteByIds', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        data: body,
        ...(options || {}),
    });
}
