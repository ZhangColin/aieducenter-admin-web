"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

interface PaginationProps {
  /** 当前页，0-based */
  page: number
  /** 总记录数 */
  total: number
  /** 每页大小 */
  size: number
  onPageChange: (page: number) => void
  className?: string
}

/**
 * 手写分页：本地 page(0-based) + total 驱动，不依赖响应 page。
 * 展示「共 N 条」+ 上一页/页码/下一页；页码过多时以省略号收拢窗口。
 */
export function Pagination({
  page,
  total,
  size,
  onPageChange,
  className,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / size))
  const currentPage = Math.min(page, totalPages - 1) // 防越界

  // 页码窗口：当前页前后各 1，首尾各保留 1，超界用省略号
  const pages = buildPageWindow(currentPage, totalPages)

  const go = (p: number) => {
    const next = Math.max(0, Math.min(p, totalPages - 1))
    if (next !== currentPage) onPageChange(next)
  }

  if (total === 0) return null

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 text-sm text-muted-foreground",
        className
      )}
    >
      <span>
        共 <span className="font-medium text-foreground">{total}</span> 条
      </span>
      <div className="flex items-center gap-1">
        <PaginationButton
          onClick={() => go(currentPage - 1)}
          disabled={currentPage === 0}
          aria-label="上一页"
        >
          <ChevronLeft className="size-4" />
        </PaginationButton>

        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-2 text-slate-400">
              …
            </span>
          ) : (
            <PaginationButton
              key={p}
              active={p === currentPage}
              onClick={() => go(p)}
            >
              {p + 1}
            </PaginationButton>
          )
        )}

        <PaginationButton
          onClick={() => go(currentPage + 1)}
          disabled={currentPage >= totalPages - 1}
          aria-label="下一页"
        >
          <ChevronRight className="size-4" />
        </PaginationButton>
      </div>
    </div>
  )
}

function PaginationButton({
  children,
  active,
  disabled,
  onClick,
  ...rest
}: {
  children: React.ReactNode
  active?: boolean
  disabled?: boolean
  onClick?: () => void
} & React.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40",
        active
          ? "bg-primary text-primary-foreground"
          : "hover:bg-muted hover:text-foreground"
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

/** 构造页码窗口：数字为 0-based 页码，"..." 表示省略。 */
function buildPageWindow(current: number, total: number): Array<number | "..."> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i)
  if (current <= 2) return [0, 1, 2, 3, "...", total - 1]
  if (current >= total - 3)
    return [0, "...", total - 4, total - 3, total - 2, total - 1]
  return [0, "...", current - 1, current, current + 1, "...", total - 1]
}
