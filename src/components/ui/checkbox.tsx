"use client"

import { Check, Minus } from "lucide-react"

import { cn } from "@/lib/utils"

export interface CheckboxProps {
  checked: boolean
  /** 半选态（树形父子级联：部分子节点被勾）。为 true 时覆盖 checked 的展示。 */
  indeterminate?: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
  "aria-label"?: string
}

/**
 * 受控复选框。手写，role="checkbox" + aria-checked。
 */
export function Checkbox({
  checked,
  indeterminate,
  onCheckedChange,
  disabled,
  className,
  ...rest
}: CheckboxProps) {
  const marked = checked || indeterminate
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        marked
          ? "border-primary bg-primary text-primary-foreground"
          : "border-slate-300 bg-transparent dark:border-slate-600",
        className
      )}
      {...rest}
    >
      {indeterminate ? (
        <Minus className="size-3" strokeWidth={3} />
      ) : (
        checked && <Check className="size-3" strokeWidth={3} />
      )}
    </button>
  )
}
