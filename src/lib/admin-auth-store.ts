import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { setAuthTokenCookie, clearAuthTokenCookie } from './auth-cookie'

/**
 * 后端菜单节点（REQ-1 已交付契约）。
 * - id/parentId 为后端 Long（雪花 id），以**字符串**序列化；根节点 parentId 为 null。
 * - type 为 MenuType 整数 code（BaseEnumSerializer），与深度正交：深度定「一级图标/二级面板」，type 定组件。
 * - type↔path 不变量（后端聚合强制）：MENU 必有非空 path；GROUP/DIVIDER 的 path 为 null。
 */
export interface MenuResponse {
  id: string
  name: string
  path: string | null
  icon: string | null  // Material Symbols 名（REQ-6 契约）；DIVIDER 可为 null
  parentId: string | null
  sortOrder: number
  type: number  // MENU_TYPE
  children: MenuResponse[]
}

/** 菜单节点类型（后端 MenuType 整数 code，REQ-1）。 */
export const MENU_TYPE = {
  /** 可路由叶子菜单（path 必有） */
  MENU: 1,
  /** 分组容器/小节标题（path 为 null，有子节点） */
  GROUP: 2,
  /** 同级分隔线（fake-row，不分配、按结构自动纳入——决策 B） */
  DIVIDER: 3,
} as const

/**
 * 超管角色编码（后端恒 bypass 放行）。
 * 单一来源：useCan（权限判断）与基石角色保护（role-utils 的删除/编码禁用）共用，
 * 避免「散弹式修改」——改一处字符串要在多文件同步。
 */
export const SUPER_ADMIN_CODE = 'SUPER_ADMIN'

export interface CurrentAdminUser {
  id: string
  username: string
  nickname: string
  avatar: string | null
  email: string | null
  phone: string | null
  status: number  // 后端 AdminUserStatus 枚举的 code（数值：1=ACTIVE, 0=DISABLED）
  statusName: string | null  // 后端提供的枚举名称（"激活"/"禁用"）
  roleCodes: string[]
  menus: MenuResponse[]
  permissions: string[]
}

interface AdminAuthState {
  token: string | null
  currentUser: CurrentAdminUser | null
  isAuthenticated: boolean
  login: (token: string, user: CurrentAdminUser, rememberMe?: boolean) => void
  logout: () => void
  setCurrentUser: (user: CurrentAdminUser) => void
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set) => ({
      token: null,
      currentUser: null,
      isAuthenticated: false,
      login: (token, user, rememberMe = false) => {
        setAuthTokenCookie(token, rememberMe) // 镜像 cookie 供 middleware 守卫
        set({ token, currentUser: user, isAuthenticated: true })
      },
      logout: () => {
        clearAuthTokenCookie() // 清镜像 cookie，使 401 自动登出顺带清守卫 cookie
        set({ token: null, currentUser: null, isAuthenticated: false })
      },
      setCurrentUser: (user) => set({ currentUser: user }),
    }),
    {
      name: 'aieducenter-admin-auth',
    }
  )
)
