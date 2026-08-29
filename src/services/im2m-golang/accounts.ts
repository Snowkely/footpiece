// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** issue new JWTs after user:pass verification login by email and password
response status：SUCCESS、NOT_FOUND、NEED_VERIFY、INVALID_PASSWORD POST /api/v1/login */
export async function login(body: API.LoginReq, options?: { [key: string]: any }) {
    return request<API.HTTPResponse & { data?: API.LoginResp }>('/api/v1/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        data: body,
        ...(options || {}),
    });
}

/** if 'AUTH_COOKIE_ACTIVATE=yes', delete tokens from client browser.
if Redis is enabled, save invalid tokens in Redis up until the expiry time.
response status：SUCCESS、TOKEN_MISSING、INVALID_TOKEN POST /api/v1/logout */
export async function logout(options?: { [key: string]: any }) {
    return request<API.HTTPResponse & { data?: API.LogoutResp }>('/api/v1/logout', {
        method: 'POST',
        ...(options || {}),
    });
}

/** change password in logged-in state response status：SUCCESS、TOKEN_MISSING、INVALID_TOKEN、SHORT_PASSWORD、PASSWORD_MISMATCH、INVALID_PASSWORD POST /api/v1/password/edit */
export async function passwordUpdate(
    body: API.PasswordUpdateReq,
    options?: { [key: string]: any },
) {
    return request<API.HTTPResponse & { data?: API.PasswordUpdateResp }>('/api/v1/password/edit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        data: body,
        ...(options || {}),
    });
}

/** send password recovery email for resetting a forgotten password response status：SUCCESS、NOT_FOUND、EMAIL_NOT_VERIFIED、EMAIL_DELIVERY_FAILED POST /api/v1/password/forgot */
export async function passwordForgot(
    body: API.PasswordForgotReq,
    options?: { [key: string]: any },
) {
    return request<API.HTTPResponse & { data?: API.PasswordForgotResp }>(
        '/api/v1/password/forgot',
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

/** verify jwt is valid response status：SUCCESS、TOKEN_MISSING、INVALID_RESETPSW_TOKEN GET /api/v1/password/reset-jwt */
export async function passwordJwtValid(options?: { [key: string]: any }) {
    return request<API.HTTPResponse & { data?: API.PasswordRecoverJwtResp }>(
        '/api/v1/password/reset-jwt',
        {
            method: 'GET',
            ...(options || {}),
        },
    );
}

/** resets a forgotten password by jwt click email link to activate reset password UI
response status：SUCCESS、TOKEN_MISSING、INVALID_VERIFY_TOKEN、SHORT_PASSWORD、PASSWORD_MISMATCH、NOT_FOUND POST /api/v1/password/reset-jwt */
export async function passwordRecoverJwt(
    body: API.PasswordRecoverJwtReq,
    options?: { [key: string]: any },
) {
    return request<API.HTTPResponse & { data?: API.PasswordRecoverJwtResp }>(
        '/api/v1/password/reset-jwt',
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

/** issue new JWTs after validation refresh token when access token is expired
response status：SUCCESS、TOKEN_MISSING、INVALID_TOKEN POST /api/v1/refresh */
export async function refresh(body: API.RefreshReq, options?: { [key: string]: any }) {
    return request<API.HTTPResponse & { data?: API.RefreshResp }>('/api/v1/refresh', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        data: body,
        ...(options || {}),
    });
}

/** register a new user account create an account by email and password
response status：SUCCESS、EXSITS、EMAIL_DELIVERY_FAILED,EMAIL_NOT_VERIFIED POST /api/v1/register */
export async function createUserAuth(body: API.RegisterReq, options?: { [key: string]: any }) {
    return request<API.HTTPResponse & { data?: API.RegisterResp }>('/api/v1/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        data: body,
        ...(options || {}),
    });
}

/** delete auth by id response status：SUCCESS、NOT_FOUND DELETE /api/v1/register/${param0} */
export async function deleteAuth(
    // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
    params: API.deleteAuthParams,
    options?: { [key: string]: any },
) {
    const { id: param0, ...queryParams } = params;
    return request<API.HTTPResponse>(`/api/v1/register/${param0}`, {
        method: 'DELETE',
        params: { ...queryParams },
        ...(options || {}),
    });
}

/** register a new user account with customer size create an account with customer size
response status：SUCCESS、EXSITS、EMAIL_DELIVERY_FAILED,EMAIL_NOT_VERIFIED POST /api/v1/register/bind */
export async function bindUserAuth(body: API.BindAccountReq, options?: { [key: string]: any }) {
    return request<API.HTTPResponse & { data?: API.BindAccountResp }>('/api/v1/register/bind', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        data: body,
        ...(options || {}),
    });
}

/** delete auth by email response status：SUCCESS、NOT_FOUND DELETE /api/v1/register/deleteAuthByEmail */
export async function deleteAuthByEmail(
    body: API.DeleteAuthByEmailReq,
    options?: { [key: string]: any },
) {
    return request<API.HTTPResponse>('/api/v1/register/deleteAuthByEmail', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        data: body,
        ...(options || {}),
    });
}

/** verify email address of a newly registered user account when user click email active link
response status：SUCCESS、TOKEN_MISSING、INVALID_VERIFY_TOKEN、EMAIL_VERIFIED GET /api/v1/verify-email-jwt */
export async function verifyEmailJwt(options?: { [key: string]: any }) {
    return request<API.HTTPResponse & { data?: API.VerifyEmailResp }>('/api/v1/verify-email-jwt', {
        method: 'GET',
        ...(options || {}),
    });
}

/** verify request to modify user's email address when user click email link for jwt validation GET /api/v1/verify-email-jwt/updated */
export async function verifyUpdatedEmailJwt(options?: { [key: string]: any }) {
    return request<API.HTTPResponse & { data?: API.VerifyEmailResp }>(
        '/api/v1/verify-email-jwt/updated',
        {
            method: 'GET',
            ...(options || {}),
        },
    );
}
