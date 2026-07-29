import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary",
        secondary:
          "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
        success:
          "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
        warning:
          "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
        destructive:
          "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400",
        outline:
          "border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
