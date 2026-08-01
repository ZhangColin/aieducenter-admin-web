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

/** 用户详情（GET /users/{id}；含 `roles` 回显——列表不含，分配角色取此回显） */
export function fetchGetUserDetail(id: string) {
  return request<Api.SystemManage.User>({
    url: `/users/${id}`,
    method: 'get'
  });
}

/**
 * 分配角色（PUT /users/{id}/roles）。
 * - 全量替换语义（提交集合即新集合）；`roleIds` 后端 @NotEmpty——前端禁空提交（双保险）。
 * - break-glass（内置 admin）用户后端强制保留 SUPER_ADMIN（403），前端亦锁定不可移除。
 */
export function fetchAssignUserRoles(id: string, body: Api.SystemManage.AssignUserRolesCommand) {
  return request<null>({
    url: `/users/${id}/roles`,
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

/** 启停角色（PUT /roles/{id}/status?status=1|0；SUPER_ADMIN 角色后端拦截禁用）。REQ-10 */
export function fetchUpdateRoleStatus(id: string, status: number) {
  return request<null>({
    url: `/roles/${id}/status`,
    method: 'put',
    params: { status }
  });
}

/** 分配菜单（PUT /roles/{id}/menus；menuIds 全量替换，空集=清空——REQ-10 已去 @NotEmpty） */
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

/** 菜单树（GET /menus/tree；返回 MenuResponse[] 树，menuType=directory/menu，供角色分配勾选） */
export function fetchGetMenuTree() {
  return request<Api.Auth.BackendMenu[]>({
    url: '/menus/tree',
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

/**
 * 全量启用角色字典（「分配角色」选项源；GET /roles/all）。
 *
 * REQ-10 / 后端 #16 已落地：`/roles/all` 轻量端点——仅启用、不分页、精简 `{id,name,code}`，
 * 取代此前 `GET /roles` 大页兜底。
 */
export function fetchGetAllRoles() {
  return request<Api.SystemManage.RoleOption[]>({
    url: '/roles/all',
    method: 'get'
  });
}
