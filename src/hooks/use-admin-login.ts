'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuthStore } from '@/lib/admin-auth-store'
import {
  adminLogin,
  getCurrentAdmin,
  transformUser,
  type LoginParams,
} from '@/lib/admin-api'

export interface LoginResult {
  success: boolean
  error?: string
}

export function useAdminLogin() {
  const router = useRouter()
  const { login: authLogin } = useAdminAuthStore()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = useCallback(
    async (username: string, password: string, rememberMe: boolean): Promise<LoginResult> => {
      setIsLoading(true)
      setError(null)

      try {
        // 1. 调用登录接口获取 token
        const params: LoginParams = { username, password, rememberMe }
        const tokenInfo = await adminLogin(params)

        // 2. 用刚获取的 token 请求用户信息
        const userResponse = await getCurrentAdmin(tokenInfo.token)

        // 3. 转换数据格式
        const user = transformUser(userResponse)

        // 4. 存储到状态管理
        authLogin(tokenInfo.token, user)

        // 5. 跳转到 dashboard
        router.push('/dashboard')

        return { success: true }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '登录失败，请重试'
        setError(message)
        return { success: false, error: message }
      } finally {
        setIsLoading(false)
      }
    },
    [authLogin, router]
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    isLoading,
    error,
    login,
    clearError,
  }
}
