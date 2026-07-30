import { HttpClient } from './http-client'
import type { CurrentAdminUser, MenuResponse } from './admin-auth-store'

export type { MenuResponse }

const httpClient = new HttpClient()

// ========== 类型定义 ==========

export interface LoginParams {
  username: string
  password: string
  rememberMe: boolean
}

export interface TokenInfo {
  token: string
  loginId: number
  expireTime: string
}

export interface CurrentUserResponse {
  user: {
    id: number
    username: string
    nickname: string
    email: string | null
    phone: string | null
    avatar: string | null
    status: number  // AdminUserStatus 枚举 code（1=ACTIVE, 0=DISABLED）
    statusName: string | null  // 枚举名称（"激活"/"禁用"）
    createdAt: string
    updatedAt: string
  }
  roleCodes: string[]
  menus: MenuResponse[]
  permissions: string[]
}

// ========== API 函数 ==========

/**
 * 管理员登录
 */
export async function adminLogin(params: LoginParams): Promise<TokenInfo> {
  return httpClient.post<TokenInfo>('/auth/login', params)
}

/**
 * 获取当前管理员信息
 */
export async function getCurrentAdmin(token?: string): Promise<CurrentUserResponse> {
  return httpClient.get<CurrentUserResponse>('/auth/current', token)
}

/**
 * 退出登录（best-effort：调用方应捕获错误并继续清理本地状态）
 */
export async function adminLogout(): Promise<void> {
  return httpClient.post<void>('/auth/logout')
}

// ========== 用户管理（Users）==========

/** 后端 PageResponse<T>：响应 page 为 1-based（前端请求 page 0-based，见 listUsers）。 */
export interface PageResponse<T> {
  items: T[]
  total: number
  page: number  // 1-based（仅展示参考；前端用本地 page + total 驱动分页）
  size: number
}

/**
 * 后端 AdminUserResponse。status 为枚举 code（1=ACTIVE, 0=DISABLED）。
 * id 为后端 Long（雪花 id，超 JS 安全整数），后端以**字符串**序列化 → 此处保持 string，
 * 避免精度丢失（与 store 中 loginId 取 String 同理）。
 */
export interface AdminUser {
  id: string
  username: string
  nickname: string
  email: string | null
  phone: string | null
  avatar: string | null
  status: number  // 1=激活, 0=禁用
  statusName: string | null
  breakGlass: boolean  // 破窗账号（内置超管）：前端据此拦截删除等危险操作
  createdAt: string
  updatedAt: string
  /** 已分配角色（仅 GET /users/{id} 详情返回，列表省略；用于「分配角色」回显） */
  roles?: AssignedRole[]
}

/**
 * 用户已分配角色的裁剪投影（仅 GET /users/{id} 详情返回；列表不返回）。
 * id 为后端 Long（雪花 id），以字符串序列化 → 保持 string，避免精度丢失。
 */
export interface AssignedRole {
  id: string
  name: string
  code: string
}

export interface AdminUserListParams {
  /** 0-based 页码（第一页传 0） */
  page: number
  size: number
  /** 关键字（用户名/昵称/邮箱模糊） */
  keyword?: string
  /** 状态筛选：1=激活, 0=禁用；undefined=全部 */
  status?: number
  /** 用户名模糊（与 keyword 独立） */
  username?: string
}

export interface CreateAdminUserParams {
  username: string
  password: string
  nickname: string
  email?: string
  phone?: string
}

export interface UpdateAdminUserParams {
  nickname?: string
  email?: string
  phone?: string
  avatar?: string
}

export interface ResetPasswordParams {
  newPassword: string
}

/** 查询用户列表（分页）。请求 page 0-based，按后端 Pageable 约定。 */
export async function listUsers(
  params: AdminUserListParams
): Promise<PageResponse<AdminUser>> {
  const qs = new URLSearchParams()
  qs.set('page', String(params.page))
  qs.set('size', String(params.size))
  if (params.keyword) qs.set('keyword', params.keyword)
  if (params.status !== undefined) qs.set('status', String(params.status))
  if (params.username) qs.set('username', params.username)
  // 后端 long total 以字符串序列化，此处归一化为 number 供前端分页计算。
  const res = await httpClient.get<PageResponse<AdminUser>>(`/users?${qs.toString()}`)
  return { ...res, total: Number(res.total) }
}

/** 查询用户详情。 */
export async function getUser(id: string): Promise<AdminUser> {
  return httpClient.get<AdminUser>(`/users/${id}`)
}

/** 新建用户，返回新用户 id（后端 Long，字符串）。 */
export async function createUser(params: CreateAdminUserParams): Promise<string> {
  return httpClient.post<string>('/users', params)
}

/** 更新用户（nickname/email/phone/avatar）。 */
export async function updateUser(id: string, params: UpdateAdminUserParams): Promise<void> {
  return httpClient.put<void>(`/users/${id}`, params)
}

/** 删除用户。 */
export async function deleteUser(id: string): Promise<void> {
  return httpClient.delete<void>(`/users/${id}`)
}

/** 修改用户启停状态：status=1 激活 / 0 禁用（query param）。 */
export async function updateUserStatus(id: string, status: number): Promise<void> {
  return httpClient.put<void>(`/users/${id}/status?status=${status}`)
}

/** 重置用户密码。 */
export async function resetUserPassword(id: string, params: ResetPasswordParams): Promise<void> {
  return httpClient.put<void>(`/users/${id}/password`, params)
}

/**
 * 给用户分配角色。body: { roleIds } —— 后端 @NotEmpty，至少一项。
 * roleIds 为后端 Long（雪花 id），沿用字符串提交（与 assignRoleMenus 同），避免精度丢失。
 */
export async function assignUserRoles(id: string, roleIds: string[]): Promise<void> {
  return httpClient.put<void>(`/users/${id}/roles`, { roleIds })
}

// ========== 角色管理（Roles）==========

/**
 * 后端 RoleResponse。id 与 menuIds 为后端 Long（雪花 id），以字符串序列化 → 保持 string。
 * menuIds/permissionCodes 为该角色当前已分配的菜单/权限码（用于分配弹窗回显）。
 */
export interface AdminRole {
  id: string
  name: string
  code: string
  description: string | null
  sortOrder: number | null
  menuIds: string[]
  permissionCodes: string[]
}

export interface AdminRoleListParams {
  /** 0-based 页码（第一页传 0） */
  page: number
  size: number
  /** 关键字（name/code/description 模糊，后端 blurry） */
  keyword?: string
}

export interface RoleFormParams {
  name: string
  code: string
  description?: string
  sortOrder?: number
}

/** 查询角色列表（分页）。请求 page 0-based。 */
export async function listRoles(
  params: AdminRoleListParams
): Promise<PageResponse<AdminRole>> {
  const qs = new URLSearchParams()
  qs.set('page', String(params.page))
  qs.set('size', String(params.size))
  if (params.keyword) qs.set('keyword', params.keyword)
  const res = await httpClient.get<PageResponse<AdminRole>>(`/roles?${qs.toString()}`)
  // 后端 long total 以字符串序列化，归一化为 number（同 listUsers）。
  return { ...res, total: Number(res.total) }
}

/** 新建角色，返回新角色 id（后端 Long，字符串）。 */
export async function createRole(params: RoleFormParams): Promise<string> {
  return httpClient.post<string>('/roles', params)
}

/** 更新角色（name/code/description/sortOrder）。 */
export async function updateRole(id: string, params: RoleFormParams): Promise<void> {
  return httpClient.put<void>(`/roles/${id}`, params)
}

/** 删除角色。SUPER_ADMIN 角色后端拦截（SUPER_ADMIN_CANNOT_DELETE），前端亦应禁用入口。 */
export async function deleteRole(id: string): Promise<void> {
  return httpClient.delete<void>(`/roles/${id}`)
}

/**
 * 分配菜单。body: { menuIds } —— 后端 @NotEmpty，至少一项。
 * 只需提交勾选的节点 id：祖先 GROUP 链由后端读取时补全（REQ-1 契约）；
 * DIVIDER（type=3）不可分配（决策 B：按结构自动纳入），提交前过滤。
 */
export async function assignRoleMenus(id: string, menuIds: string[]): Promise<void> {
  return httpClient.put<void>(`/roles/${id}/menus`, { menuIds })
}

/** 分配权限。body: { permissionCodes } —— 后端 @NotEmpty，至少一项。 */
export async function assignRolePermissions(
  id: string,
  permissionCodes: string[]
): Promise<void> {
  return httpClient.put<void>(`/roles/${id}/permissions`, { permissionCodes })
}

// ========== 权限字典（Permissions，只读）==========

/** 后端 PermissionResponse：系统预定义权限码（无写接口，故权限管理并入角色页）。 */
export interface PermissionItem {
  code: string
  /** 层级名，如「平台管理 / 用户管理 / 查看」 */
  name: string
}

/** 查询全部权限码（scope=admin）。 */
export async function listPermissions(): Promise<PermissionItem[]> {
  return httpClient.get<PermissionItem[]>('/permissions?scope=admin')
}

// ========== 菜单（Menus）==========

/**
 * 查询菜单树（管理侧全量，含 DIVIDER）。
 * 树已按 sortOrder 排序（REQ-1 后端兜底），前端 naive 渲染即可。
 */
export async function listMenus(): Promise<MenuResponse[]> {
  return httpClient.get<MenuResponse[]>('/menus')
}

/**
 * 转换后端用户数据为前端格式
 */
export function transformUser(
  response: CurrentUserResponse
): CurrentAdminUser {
  return {
    id: String(response.user.id),
    username: response.user.username,
    nickname: response.user.nickname,
    avatar: response.user.avatar,
    email: response.user.email,
    phone: response.user.phone,
    status: response.user.status,  // 数值型枚举 code
    statusName: response.user.statusName,  // 枚举名称
    roleCodes: response.roleCodes,
    menus: response.menus,
    permissions: response.permissions,
  }
}
