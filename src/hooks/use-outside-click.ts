'use client'

import { useEffect, useRef } from 'react'

/**
 * 监听 ref 集合外部的鼠标/触摸点击，触发 handler。
 * 用于 Select / DropdownMenu 等弹出层的「点外部收起」。
 * 传入多个 ref（如 trigger + portal 菜单）时，点击任一内部均不收起。
 *
 * 用 ref 持有最新的 refs/handler，使订阅 effect 仅依赖 enabled——
 * 避免 handler/refs 数组每次渲染变化导致的反复订阅，也满足 exhaustive-deps。
 */
export function useOutsideClick(
  refs: React.RefObject<HTMLElement | null>[],
  handler: () => void,
  enabled: boolean = true
) {
  const refsRef = useRef(refs)
  const handlerRef = useRef(handler)

  // 每次渲染同步最新值（无依赖数组；仅赋值 ref，不触发渲染）
  useEffect(() => {
    refsRef.current = refs
    handlerRef.current = handler
  })

  useEffect(() => {
    if (!enabled) return
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const inside = refsRef.current.some(
        (r) => r.current && r.current.contains(e.target as Node)
      )
      if (inside) return
      handlerRef.current()
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
    }
  }, [enabled])
}
