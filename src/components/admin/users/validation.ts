// 与后端 CreateAdminUserCommand / ResetPasswordCommand 校验保持一致（前端先校验，减少无效请求）。
export const USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/
export const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).{8,20}$/

export const USERNAME_HINT = '3-20 位，字母开头，仅含字母、数字、下划线'
export const PASSWORD_HINT = '8-20 位，需同时包含字母和数字'
