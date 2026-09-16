import { request } from '../request';

/**
 * 用户管理（admin 后端 /api/admin/users）
 *
 * 分页约定：请求 `page` **1-based**、响应 PageResponse{ items, total, page(1-based), size }。
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
 * 分页约定同用户：请求 `page` **1-based**、响应 PageResponse{ items, total, page(1-based), size }。
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

/**
 * 菜单管理（admin 后端 /api/admin/menus；CRUD）。
 *
 * 分页约定同用户/角色：请求 `page` **1-based**、响应 PageResponse{ items, total, page(1-based), size }。
 * menuType/iconType/status 整数（BaseEnum）；id/parentId 字符串（Long）；root = parentId null。
 *
 * ⚠️ 后端**无独立启停端点**（PUT /menus/{id}/status 不存在）——status 经全量 PUT 切换。
 *    删除有子菜单的节点后端 403（MENU_HAS_CHILDREN）。
 */

/** 菜单分页扁平列表（GET /menus；REQ-8 分页扁平端点，Soybean 菜单表格用） */
export function fetchGetMenuList(params: Api.SystemManage.MenuSearchParams) {
  return request<Api.Common.PageResponse<Api.SystemManage.Menu>>({
    url: '/menus',
    method: 'get',
    params
  });
}

/** 新增菜单（POST /menus；返回新菜单 id，Long→字符串） */
export function fetchCreateMenu(body: Api.SystemManage.MenuCommand) {
  return request<string>({
    url: '/menus',
    method: 'post',
    data: body
  });
}

/** 编辑菜单（PUT /menus/{id}；全量替换。无独立启停端点——status 经此端点切换） */
export function fetchUpdateMenu(id: string, body: Api.SystemManage.MenuCommand) {
  return request<null>({
    url: `/menus/${id}`,
    method: 'put',
    data: body
  });
}

/** 删除菜单（DELETE /menus/{id}；有子菜单时后端 403 MENU_HAS_CHILDREN） */
export function fetchDeleteMenu(id: string) {
  return request<null>({
    url: `/menus/${id}`,
    method: 'delete'
  });
}

/**
 * 应用管理（admin 后端 /api/admin/apps）
 *
 * 分页约定同用户/角色：请求 `page` **1-based**、响应 PageResponse{ items, total, page(1-based), size }。
 */

/** 应用分页列表（GET /apps） */
export function fetchGetAppList(params: Api.SystemManage.AppSearchParams) {
  return request<Api.Common.PageResponse<Api.SystemManage.AppSummary>>({
    url: '/apps',
    method: 'get',
    params
  });
}

/** 应用详情聚合（GET /apps/{id}；含 app + apiKey + ssoClient） */
export function fetchGetAppDetail(id: string) {
  return request<Api.SystemManage.AppDetail>({
    url: `/apps/${id}`,
    method: 'get'
  });
}

/** 创建应用（POST /apps；返回新建应用详情聚合 AppDetailResponse，Long→字符串） */
export function fetchCreateApp(body: Api.SystemManage.AppCreateCommand) {
  return request<Api.SystemManage.AppDetail>({
    url: '/apps',
    method: 'post',
    data: body
  });
}

/** 更新应用基本信息（PUT /apps/{id}；name + description） */
export function fetchUpdateApp(id: string, body: Api.SystemManage.AppUpdateCommand) {
  return request<null>({
    url: `/apps/${id}`,
    method: 'put',
    data: body
  });
}

/** 停用应用（PUT /apps/{id}/disable） */
export function fetchDisableApp(id: string) {
  return request<null>({
    url: `/apps/${id}/disable`,
    method: 'put'
  });
}

/** 启用应用（PUT /apps/{id}/enable） */
export function fetchEnableApp(id: string) {
  return request<null>({
    url: `/apps/${id}/enable`,
    method: 'put'
  });
}

/** 生成/重置 API Key（POST /apps/{id}/api-key；apiSecret 仅返回一次） */
export function fetchGenerateApiKey(id: string) {
  return request<Api.SystemManage.ApiKeyResponse>({
    url: `/apps/${id}/api-key`,
    method: 'post'
  });
}

/**
 * 开通 / 重置 SSO 密钥（POST /apps/{id}/sso-client/credentials；无 body）。
 * 首次调用=开通（生成终身稳定的 clientId + 第一份 clientSecret）；后续调用=重置（轮换 clientSecret，clientId 不变）。
 * 响应为全量视图，但仅消费一次性明文 clientSecret 做展示；clientId 经详情刷新揭示。
 */
export function fetchProvisionSsoCredentials(id: string) {
  return request<Api.SystemManage.SsoCredentialsResponse>({
    url: `/apps/${id}/sso-client/credentials`,
    method: 'post'
  });
}

/**
 * 整份替换 SSO 客户端配置（PUT /apps/{id}/sso-client；后端 UpdateSsoClientConfigCommand）。
 * 不轮换 clientSecret、不改 status——只替换 redirectUris/postLogoutRedirectUris/scopes/grants。
 * 配置校验（两 URI 列表 @NotEmpty）在后端 app-registry（admin BFF 纯透传、不加 @Valid）；前端做非空兜底。
 * 响应为不含 clientSecret 的全量视图，前端仅据 error 判成败后 reload 详情，故返回 null。
 */
export function fetchUpdateSsoClientConfig(id: string, body: Api.SystemManage.SsoClientConfigCommand) {
  return request<null>({
    url: `/apps/${id}/sso-client`,
    method: 'put',
    data: body
  });
}

/** 启用 SSO Client（PUT /apps/{id}/sso-client/enable；无 body，与所属应用启停用相互独立、不级联、不动凭证/配置） */
export function fetchEnableSsoClient(id: string) {
  return request<null>({
    url: `/apps/${id}/sso-client/enable`,
    method: 'put'
  });
}

/** 停用 SSO Client（PUT /apps/{id}/sso-client/disable；无 body，与所属应用启停用相互独立、不级联、不动凭证/配置） */
export function fetchDisableSsoClient(id: string) {
  return request<null>({
    url: `/apps/${id}/sso-client/disable`,
    method: 'put'
  });
}
