'use client'

import { useEffect, useState } from 'react'

/**
 * SSR 时与客户端首次渲染均返回 false，挂载后返回 true。
 *
 * 这是探测「是否已 hydrate」的标准模式：客户端挂载后翻 true，SSR 与首帧保持 false，
 * 避免 zustand-persist（localStorage）等客户端状态导致的 SSR/hydrate 不一致。
 *
 * 此处的 setState-in-effect 是该用途的正当例外（无副作用外部系统可订阅，
 * 也无法用 useSyncExternalStore 干净实现——会触发 getServerSnapshot 循环告警），
 * 故局部豁免 react-hooks/set-state-in-effect；规则在其它地方仍生效。
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setHydrated(true), [])
  return hydrated
}
