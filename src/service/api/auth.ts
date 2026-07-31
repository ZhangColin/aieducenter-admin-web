import { request } from '../request';

/**
 * Login
 *
 * @param username 用户名
 * @param password 密码
 * @param rememberMe 记住我（Sa-Token：true=7天，false=24h）
 */
export function fetchLogin(username: string, password: string, rememberMe = false) {
  return request<Api.Auth.LoginToken>({
    url: '/auth/login',
    method: 'post',
    data: {
      username,
      password,
      rememberMe
    }
  });
}

/** 获取当前登录用户信息（GET /auth/current） */
export function fetchGetUserInfo() {
  return request<Api.Auth.CurrentUser>({ url: '/auth/current' });
}

/** 登出（POST /auth/logout，best-effort，忽略错误） */
export function fetchLogout() {
  return request<null>({ url: '/auth/logout', method: 'post' });
}
