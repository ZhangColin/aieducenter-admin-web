import { HttpClient } from './http-client'
import type { CurrentAdminUser } from './admin-auth-store'

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
  menus: any[]
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
