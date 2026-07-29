"use client"

import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

export interface CheckboxProps {
  checked: boolean
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
  onCheckedChange,
  disabled,
  className,
  ...rest
}: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? "border-primary bg-primary text-primary-foreground"
          : "border-slate-300 bg-transparent dark:border-slate-600",
        className
      )}
      {...rest}
    >
      {checked && <Check className="size-3" strokeWidth={3} />}
    </button>
  )
}
