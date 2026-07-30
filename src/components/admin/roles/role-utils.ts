import type { AdminRole } from '@/lib/admin-api'
import { SUPER_ADMIN_CODE } from '@/lib/admin-auth-store'

/** 是否基石 SUPER_ADMIN 角色（不可删、code 不可改；后端另有拦截兜底）。 */
export function isSuperAdminRole(role: AdminRole | null | undefined): boolean {
  return role?.code === SUPER_ADMIN_CODE
}
