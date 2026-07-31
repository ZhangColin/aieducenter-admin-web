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

/**
 * 角色管理（admin 后端 /api/admin/roles）
 *
 * 分页约定同用户：请求 `page` **0-based**、响应 PageResponse{ items, total, page(1-based), size }。
 * `RoleResponse` 自带 `menuIds`/`permissionCodes`，分配弹窗回显直接用列表项。
 */

/** 角色分页列表（GET /roles） */
export function fetchGetRoleList(params: Api.SystemManage.RoleSearchParams) {
  return request<Api.Common.PageResponse<Api.SystemManage.Role>>({
    url: '/roles',
    method: 'get',
    params
  });
}

/** 新增角色（POST /roles；返回新角色 id，Long→字符串） */
export function fetchCreateRole(body: Api.SystemManage.RoleCreateCommand) {
  return request<string>({
    url: '/roles',
    method: 'post',
    data: body
  });
}

/** 编辑角色（PUT /roles/{id}；与 Create 同构） */
export function fetchUpdateRole(id: string, body: Api.SystemManage.RoleUpdateCommand) {
  return request<null>({
    url: `/roles/${id}`,
    method: 'put',
    data: body
  });
}

/** 删除角色（DELETE /roles/{id}；SUPER_ADMIN 角色后端拦截） */
export function fetchDeleteRole(id: string) {
  return request<null>({
    url: `/roles/${id}`,
    method: 'delete'
  });
}

/** 分配菜单（PUT /roles/{id}/menus；menuIds @NotEmpty，前端禁空提交） */
export function fetchAssignRoleMenus(id: string, body: Api.SystemManage.AssignMenusCommand) {
  return request<null>({
    url: `/roles/${id}/menus`,
    method: 'put',
    data: body
  });
}

/** 分配权限（PUT /roles/{id}/permissions；permissionCodes @NotEmpty，前端禁空提交） */
export function fetchAssignRolePermissions(id: string, body: Api.SystemManage.AssignPermissionsCommand) {
  return request<null>({
    url: `/roles/${id}/permissions`,
    method: 'put',
    data: body
  });
}

/**
 * 菜单 / 权限字典（角色分配弹窗用）
 */

/** 菜单树（GET /menus；返回 MenuResponse[] 树，含 type，分配时前端过滤 DIVIDER） */
export function fetchGetMenuTree() {
  return request<Api.Auth.BackendMenu[]>({
    url: '/menus',
    method: 'get'
  });
}

/** 全量权限字典（GET /permissions；扁平 { code, name }） */
export function fetchGetAllPermissions() {
  return request<Api.SystemManage.Permission[]>({
    url: '/permissions',
    method: 'get'
  });
}
