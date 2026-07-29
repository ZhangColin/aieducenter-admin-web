"use client"

import { useRef, useState, useId, useEffect, createContext, useContext } from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"
import { useOutsideClick } from "@/hooks/use-outside-click"

const DropdownMenuContext = createContext<{ close: () => void }>({
  close: () => {},
})

interface DropdownMenuProps {
  trigger: React.ReactNode
  children: React.ReactNode
  className?: string
  align?: "start" | "end"
}

/**
 * 轻量下拉菜单。用 portal 渲染到 body（避免被表格等 overflow 容器裁剪），
 * 按 trigger 的位置做 fixed 定位；打开期间跟随滚动/缩放重新定位；点项即关。
 */
export function DropdownMenu({
  trigger,
  children,
  className,
  align = "end",
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const menuId = useId()

  const close = () => setOpen(false)

  useOutsideClick([triggerRef, menuRef], close, open)

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev
      if (next && triggerRef.current) {
        setRect(triggerRef.current.getBoundingClientRect())
      }
      return next
    })
  }

  // 打开期间 trigger 可能被滚动，需重新定位
  useEffect(() => {
    if (!open) return
    const update = () => {
      if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect())
    }
    window.addEventListener("scroll", update, true)
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update, true)
      window.removeEventListener("resize", update)
    }
  }, [open])

  const menuStyle: React.CSSProperties | undefined = rect
    ? {
        position: "fixed",
        top: rect.bottom,
        ...(align === "end"
          ? { right: window.innerWidth - rect.right }
          : { left: rect.left }),
      }
    : undefined

  return (
    <>
      <div
        ref={triggerRef}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={toggle}
      >
        {trigger}
      </div>
      {open && typeof document !== "undefined" && (
        <DropdownMenuContext.Provider value={{ close }}>
          {createPortal(
            <div
              id={menuId}
              ref={menuRef}
              role="menu"
              style={menuStyle}
              className={cn(
                "z-50 mt-1 min-w-[8rem] overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-md dark:border-slate-700 dark:bg-slate-900",
                className
              )}
            >
              {children}
            </div>,
            document.body
          )}
        </DropdownMenuContext.Provider>
      )}
    </>
  )
}

interface DropdownMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
  destructive?: boolean
  disabled?: boolean
}

export function DropdownMenuItem({
  className,
  destructive,
  disabled,
  onClick,
  children,
  ...props
}: DropdownMenuItemProps) {
  const { close } = useContext(DropdownMenuContext)
  return (
    <div
      role="menuitem"
      aria-disabled={disabled}
      onClick={(e) => {
        if (disabled) return
        onClick?.(e)
        close()
      }}
      className={cn(
        "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted",
        destructive &&
          "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20",
        disabled && "pointer-events-none opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
