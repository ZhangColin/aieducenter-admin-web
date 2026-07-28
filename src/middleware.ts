import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { AUTH_TOKEN_COOKIE } from '@/lib/auth-cookie'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8081'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. 路由守卫：未登录访问 /dashboard(/...) → 重定向到登录页。
  //    cookie 只是 localStorage token 的镜像，仅判断登录「存在性」；
  //    token 真伪/过期由 http-client 在 API 层 401 时兜底（→ store.logout 顺带清此 cookie）。
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value
    if (!token) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/'
      loginUrl.search = ''
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  // 2. /api/* 反向代理到 admin 后端（BFF 边界：前端只调 admin 后端）。
  if (pathname.startsWith('/api/')) {
    const url = request.nextUrl.clone()
    const apiUrl = `${BACKEND_URL}${url.pathname}${url.search}`

    return fetch(apiUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      // @ts-ignore
      duplex: 'half',
    }).then(async (response) => {
      const data = await response.arrayBuffer()
      const headers = new Headers()

      // 复制响应头（排除一些不需要的）
      response.headers.forEach((value, key) => {
        if (!['content-encoding', 'transfer-encoding'].includes(key)) {
          headers.set(key, value)
        }
      })

      return new NextResponse(data, {
        status: response.status,
        headers,
      })
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*', '/dashboard', '/dashboard/:path*'],
}
