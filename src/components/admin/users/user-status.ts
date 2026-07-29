/** 用户状态枚举 code（与后端 AdminUserStatus 一致：1=激活 ACTIVE, 0=禁用 DISABLED）。 */
export const USER_STATUS_LABEL: Record<number, string> = {
  1: '激活',
  0: '禁用',
}

/** 状态 code → 展示名（未知 code 兜底）。 */
export function statusLabel(status: number): string {
  return USER_STATUS_LABEL[status] ?? '未知'
}
