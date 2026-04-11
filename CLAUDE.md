# aieducenter-admin-web

管理后台前端，基于 Next.js 15 App Router。

## 技术栈

- Next.js 15（App Router）/ React 19 / TypeScript
- shadcn-ui + Tailwind CSS
- Zustand 状态管理

## 常用命令

- 开发：`pnpm dev`
- 构建：`pnpm build`
- 代码检查：`pnpm lint`

## API 代理

开发时通过 next.config.mjs 的 rewrites 和 middleware 将 `/api/*` 请求代理到后端 8081 端口。
前端 HttpClient 默认 baseUrl 为 `/api/admin`，最终请求路径为 `/api/admin/**`。
