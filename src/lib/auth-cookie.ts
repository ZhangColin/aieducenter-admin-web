// token 镜像 cookie：仅用于 edge middleware 的路由守卫（判断登录存在性）。
// 发请求仍走 Authorization: Bearer header（http-client），cookie 不参与鉴权。
// 参考 CONTEXT.md「鉴权 / token」决策。

export const AUTH_TOKEN_COOKIE = 'admin_token'

// rememberMe=true → 7 天（与后端 Sa-Token rememberMe timeout 对齐）；false → 会话型（无 max-age）。
const REMEMBER_ME_MAX_AGE = 7 * 24 * 60 * 60

export function setAuthTokenCookie(token: string, rememberMe: boolean) {
  if (typeof document === 'undefined') return
  const maxAge = rememberMe ? `; max-age=${REMEMBER_ME_MAX_AGE}` : ''
  document.cookie = `${AUTH_TOKEN_COOKIE}=${token}; path=/${maxAge}; samesite=lax`
}

export function clearAuthTokenCookie() {
  if (typeof document === 'undefined') return
  document.cookie = `${AUTH_TOKEN_COOKIE}=; path=/; max-age=0`
}
