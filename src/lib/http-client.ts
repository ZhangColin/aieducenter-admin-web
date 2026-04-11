import { useAdminAuthStore } from './admin-auth-store'

// 后端统一响应格式
interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export class HttpClient {
  private baseUrl: string

  constructor(baseUrl: string = '/api/admin') {
    this.baseUrl = baseUrl
  }

  private getDefaultError(status: number): string {
    const errorMap: Record<number, string> = {
      401: '用户名或密码错误',
      403: '权限不足',
      500: '服务器错误，请稍后重试',
      503: '服务暂时不可用',
    }
    return errorMap[status] || '请求失败，请重试'
  }

  private async request<T>(
    method: string,
    url: string,
    data?: object
  ): Promise<T> {
    const token = useAdminAuthStore.getState().token

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const fullUrl = `${this.baseUrl}${url}`

    try {
      const response = await fetch(fullUrl, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        credentials: 'include', // 携带 cookie（Sa-Token 需要）
      })

      // 统一处理 401
      if (response.status === 401) {
        useAdminAuthStore.getState().logout()
        window.location.href = '/'
        throw new Error('未登录或登录已过期')
      }

      // 解析响应
      const result: ApiResponse<T> = await response.json()

      if (!response.ok || result.code !== 200) {
        throw new Error(result.message || this.getDefaultError(response.status))
      }

      return result.data
    } catch (error: any) {
      // 网络错误或 fetch 错误（TypeError 通常表示网络错误）
      if (error instanceof TypeError) {
        throw new Error('网络错误，请重试')
      }
      // 其他错误直接抛出
      throw error
    }
  }

  async get<T>(url: string): Promise<T> {
    return this.request<T>('GET', url)
  }

  async post<T>(url: string, data?: object): Promise<T> {
    return this.request<T>('POST', url, data)
  }

  async put<T>(url: string, data?: object): Promise<T> {
    return this.request<T>('PUT', url, data)
  }

  async delete<T>(url: string): Promise<T> {
    return this.request<T>('DELETE', url)
  }
}
