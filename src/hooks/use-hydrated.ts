'use client'

import { useEffect, useState } from 'react'

/**
 * SSR 时与客户端首次渲染均返回 false，挂载后返回 true。
 * 用于依赖 zustand-persist（localStorage）的 UI，避免 SSR/hydrate 不一致
 * （服务端无 localStorage → store 为默认值；客户端首帧已 rehydrate → 值不同 → 闪烁/告警）。
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])
  return hydrated
}
