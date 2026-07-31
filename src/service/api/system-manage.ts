import { request } from '../request';

/**
 * 用户管理（admin 后端 /api/admin/users）
 *
 * 分页约定：请求 `page` **0-based**、响应 PageResponse{ items, total, page(1-based), size }。
 * `defaultTransform` 已把响应映射为 useTable 所需的 PaginationData。
 */

/** 用户分页列表（GET /users） */
export function fetchGetUserList(params: Api.SystemManage.UserSearchParams) {
  return request<Api.Common.PageResponse<Api.SystemManage.User>>({
    url: '/users',
    method: 'get',
    params
  });
}

/** 新增用户（POST /users；返回新用户 id，Long→字符串） */
export function fetchCreateUser(body: Api.SystemManage.UserCreateCommand) {
  return request<string>({
    url: '/users',
    method: 'post',
    data: body
  });
}

/** 编辑用户（PUT /users/{id}；username 不可改） */
export function fetchUpdateUser(id: string, body: Api.SystemManage.UserUpdateCommand) {
  return request<null>({
    url: `/users/${id}`,
    method: 'put',
    data: body
  });
}

/** 删除用户（DELETE /users/{id}） */
export function fetchDeleteUser(id: string) {
  return request<null>({
    url: `/users/${id}`,
    method: 'delete'
  });
}

/** 启停用户（PUT /users/{id}/status?status=1|0） */
export function fetchUpdateUserStatus(id: string, status: number) {
  return request<null>({
    url: `/users/${id}/status`,
    method: 'put',
    params: { status }
  });
}

/** 重置密码（PUT /users/{id}/password） */
export function fetchResetUserPassword(id: string, body: Api.SystemManage.ResetPasswordCommand) {
  return request<null>({
    url: `/users/${id}/password`,
    method: 'put',
    data: body
  });
}
