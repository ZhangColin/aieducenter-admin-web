import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface MenuResponse {
  id: number
  name: string
  path: string
  icon: string
  parentId: number  // 后端 Long parentId，不可为 null
  sortOrder: number
  children: MenuResponse[]
}

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
  login: (token: string, user: CurrentAdminUser) => void
  logout: () => void
  setCurrentUser: (user: CurrentAdminUser) => void
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set) => ({
      token: null,
      currentUser: null,
      isAuthenticated: false,
      login: (token, user) => set({ token, currentUser: user, isAuthenticated: true }),
      logout: () => set({ token: null, currentUser: null, isAuthenticated: false }),
      setCurrentUser: (user) => set({ currentUser: user }),
    }),
    {
      name: 'aieducenter-admin-auth',
    }
  )
)
