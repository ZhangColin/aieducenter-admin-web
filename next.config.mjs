/** @type {import('next').NextConfig} */
// /api/* 反向代理与页面守卫统一在 src/middleware.ts，此处不再配置 rewrites（避免双反代）。
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
}

export default nextConfig
