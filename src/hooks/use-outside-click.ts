'use client'

import { useEffect } from 'react'

/**
 * 监听 ref 集合外部的鼠标/触摸点击，触发 handler。
 * 用于 Select / DropdownMenu 等弹出层的「点外部收起」。
 * 传入多个 ref（如 trigger + portal 菜单）时，点击任一内部均不收起。
 *
 * ref 对象本身稳定，仅在事件触发时读取 .current，故不放入依赖。
 */
export function useOutsideClick(
  refs: React.RefObject<HTMLElement | null>[],
  handler: () => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const inside = refs.some(
        (r) => r.current && r.current.contains(e.target as Node)
      )
      if (inside) return
      handler()
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
    }
  }, [handler, enabled])
}
