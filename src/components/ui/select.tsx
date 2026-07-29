"use client"

import { useRef, useState, useId } from "react"
import { ChevronDown, Check } from "lucide-react"

import { cn } from "@/lib/utils"
import { useOutsideClick } from "@/hooks/use-outside-click"

export interface SelectOption {
  label: string
  value: string
}

export interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  disabled?: boolean
}

/**
 * 受控单选下拉。手写（trigger + 浮层 listbox + 点外部收起）。
 * value 为字符串；调用方负责与业务值（如 number）的转换。
 */
export function Select({
  value,
  onValueChange,
  options,
  placeholder = "请选择",
  className,
  disabled,
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const listboxId = useId()

  useOutsideClick([ref], () => setOpen(false), open)

  const selected = options.find((o) => o.value === value)

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          !selected && "text-muted-foreground"
        )}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown
          className={cn(
            "size-4 opacity-50 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-md dark:border-slate-700 dark:bg-slate-900"
        >
          {options.map((opt) => {
            const active = opt.value === value
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={active}
                onClick={() => {
                  onValueChange(opt.value)
                  setOpen(false)
                }}
                className={cn(
                  "flex cursor-pointer items-center justify-between px-3 py-1.5 text-sm transition-colors hover:bg-muted",
                  active && "font-medium text-primary"
                )}
              >
                <span className="truncate">{opt.label}</span>
                {active && <Check className="size-4" />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
