'use client'

import { useAdminAuthStore } from '@/lib/admin-auth-store'
import { useHydrated } from './use-hydrated'

/** 超管角色编码（后端 bypass 放行）。 */
const SUPER_ADMIN = 'SUPER_ADMIN'

/**
 * 权限判断 hook：基于当前登录用户的 permissions / roleCodes。
 * - 未 hydrate 完成前恒为 false（与 SSR 输出一致，避免 hydrate 不匹配）；
 * - SUPER_ADMIN 恒放行（与后端 bypass 一致）；
 * - 否则按 permissions 数组是否包含 code 判断。
 *
 * 不在 UI 硬编码角色判断（架构不变式 #2）。
 */
export function useCan(code: string): boolean {
  const hydrated = useHydrated()
  const roleCodes = useAdminAuthStore((s) => s.currentUser?.roleCodes ?? [])
  const permissions = useAdminAuthStore((s) => s.currentUser?.permissions ?? [])

  if (!hydrated) return false
  if (roleCodes.includes(SUPER_ADMIN)) return true
  return permissions.includes(code)
}
