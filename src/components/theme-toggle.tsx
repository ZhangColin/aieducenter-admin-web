'use client'

import { useTheme } from '@/components/ui/theme'
import { Button } from '@/components/ui'
import { Moon, Sun } from 'lucide-react'
import { useHydrated } from '@/hooks'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const mounted = useHydrated()

  // 等 client hydrate 后再读 theme，避免 SSR/暗色模式闪烁
  if (!mounted) {
    return (
      <Button variant="outline" size="sm" className="gap-2" disabled>
        <span className="h-4 w-4" />
        <span>加载中...</span>
      </Button>
    )
  }

  const isDark = theme === 'dark'

  return (
    <Button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {isDark ? '切换到亮色' : '切换到暗色'}
    </Button>
  )
}
