// 存储token
export function setToken(token: string) {
    localStorage.setItem('token', token);
}

// 获取token
export function getToken() {
    return localStorage.getItem('token');
}

// 删除token
export function removeToken() {
    localStorage.removeItem('token');
}

// 存储refresh token
export function setRefreshToken(token: string) {
    localStorage.setItem('refreshToken', token);
}

// 获取refresh token
export function getRefreshToken() {
    return localStorage.getItem('refreshToken');
}

// 删除refresh token
export function removeRefreshToken() {
    localStorage.removeItem('refreshToken');
}

// 存储authId
export function setAuthId(authId: string) {
    localStorage.setItem('authId', authId);
}

// 获取authId
export function getAuthId() {
    return localStorage.getItem('authId');
}

// 删除authId
export function removeAuthId() {
    localStorage.removeItem('authId');
}
