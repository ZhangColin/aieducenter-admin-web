'use client'

import { useCan } from '@/hooks/use-can'

interface HasPermissionProps {
  /** 权限码，如 admin:user:write */
  code: string
  children: React.ReactNode
  /** 无权限时的兜底渲染（默认不渲染任何内容） */
  fallback?: React.ReactNode
}

/**
 * 条件渲染：当前用户具备 code 权限（或为超管）时渲染 children，否则渲染 fallback。
 * 配合 useCan 使用，避免在 UI 硬编码角色判断。
 */
export function HasPermission({ code, children, fallback = null }: HasPermissionProps) {
  const can = useCan(code)
  return <>{can ? children : fallback}</>
}
