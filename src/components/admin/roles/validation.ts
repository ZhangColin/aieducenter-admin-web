// 与后端 CreateRoleCommand / UpdateRoleCommand 校验保持一致（前端先校验，减少无效请求）。
export const ROLE_NAME_MAX = 50
export const ROLE_CODE_MAX = 50
export const ROLE_DESCRIPTION_MAX = 255

export const ROLE_NAME_HINT = '不能为空，最长 50 字符'
export const ROLE_CODE_HINT = '不能为空，最长 50 字符（建议大写下划线，如 OPS_ADMIN）'
