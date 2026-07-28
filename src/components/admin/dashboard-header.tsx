'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuthStore } from '@/lib/admin-auth-store'
import { adminLogout } from '@/lib/admin-api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function DashboardHeader() {
  const router = useRouter()
  const currentUser = useAdminAuthStore((s) => s.currentUser)
  const logout = useAdminAuthStore((s) => s.logout)

  const [mounted, setMounted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 等 client 挂载后再读 store，避免 SSR 与 hydrate 后的用户信息不一致闪烁
  useEffect(() => setMounted(true), [])

  // 点击菜单外部关闭
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await adminLogout() // best-effort，失败也继续清理本地
    } catch {
      // 忽略后端登出错误
    }
    logout() // 清 store + 清镜像 cookie
    toast.success('已退出登录')
    router.push('/')
  }

  const nickname = currentUser?.nickname || currentUser?.username || '用户'
  const subtitle = currentUser?.email || currentUser?.username || '运营用户'
  const initial = nickname.charAt(0).toUpperCase()
  const avatarCls =
    'size-10 rounded-full border-2 border-slate-100 dark:border-slate-800 group-hover:border-primary transition-colors'

  return (
    <header className="h-16 flex items-center justify-between px-8 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-4">
        <nav className="flex items-center text-sm text-slate-500 dark:text-slate-400">
          <span>首页</span>
          <span className="mx-2 text-slate-300">/</span>
          <span className="text-slate-900 dark:text-white font-medium">控制台</span>
        </nav>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-6">
        {/* Search */}
        <div className="relative hidden lg:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
            search
          </span>
          <input
            className="pl-10 pr-4 py-1.5 w-64 bg-slate-100/50 dark:bg-slate-800/50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/30 transition-all"
            placeholder="搜索资源、租户或文档..."
            type="text"
          />
        </div>

        {/* Actions & Profile */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg relative transition-colors">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2.5 right-2.5 size-1.5 bg-red-500 rounded-full border border-white dark:border-slate-900" />
          </button>

          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />

          {/* User Profile + Logout */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-3 cursor-pointer group rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">
                  {mounted ? nickname : ' '}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 tracking-tight font-medium truncate max-w-[160px]">
                  {mounted ? subtitle : ' '}
                </p>
              </div>
              {mounted && currentUser?.avatar ? (
                <img
                  className={cn(avatarCls, 'object-cover')}
                  alt={`${nickname} 的头像`}
                  src={currentUser.avatar}
                />
              ) : (
                <div className={cn(avatarCls, 'bg-primary/10 text-primary flex items-center justify-center font-bold')}>
                  {mounted ? initial : ''}
                </div>
              )}
              <span className="material-symbols-outlined text-slate-400 text-lg hidden sm:block">
                expand_more
              </span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg shadow-slate-900/5 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {nickname}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {subtitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-lg">
                    {loggingOut ? 'progress_activity' : 'logout'}
                  </span>
                  <span>{loggingOut ? '退出中...' : '退出登录'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
