# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用命令

- 开发：`pnpm dev`（端口 3001）
- 构建：`pnpm build`
- 类型检查：`pnpm typecheck`
- 代码检查：`pnpm lint`

## 技术栈

- Next.js 15 App Router / React 19 / TypeScript（strict mode）
- shadcn-ui + Radix UI + Tailwind CSS（dark mode: class 策略）
- Zustand（persist middleware）状态管理
- 路径别名：`@/*` → `./src/*`

## 架构概览

### API 层

`HttpClient`（`src/lib/http-client.ts`）封装所有请求，baseUrl 为 `/api/admin`。

- 自动注入 Bearer token（从 Zustand store 读取）
- 401 响应自动登出并跳转 `/`
- 后端统一响应格式：`{ code: number, message: string, data: T }`，code 200 为成功
- `credentials: 'include'` 携带 cookie（后端 Sa-Token 需要）

具体业务 API 在 `src/lib/admin-api.ts`。

### 认证

`useAdminAuthStore`（`src/lib/admin-auth-store.ts`）管理 token 和当前用户信息，通过 Zustand persist 持久化到 localStorage（key: `aieducenter-admin-auth`）。

用户信息包含 `roleCodes`、`menus`、`permissions`，用于前端权限控制。

### API 代理

开发时通过 `next.config.mjs` rewrites 将 `/api/*` 代理到后端（默认 `http://localhost:8081`）。

生产环境通过 `BACKEND_URL` 环境变量配置后端地址。

### 页面结构

- `/` — 登录页
- `/dashboard` — 主后台（带 sidebar + header 布局）
- `/showcase` — UI 组件展示页

### 组件约定

- UI 基础组件：`src/components/ui/`（shadcn/ui，使用 CVA 变体模式）
- 业务组件：`src/components/admin/`
- 新增 shadcn 组件用 `npx shadcn@latest add <component>` 生成

### 主题

支持 light/dark 双主题，CSS 变量定义在 `globals.css`，通过 `next-themes` ThemeProvider 切换。主色：`#308ce8`。

### Docker 部署

- 开发：`docker-compose -f docker-compose.dev.yml up -d`
- 生产：`docker-compose -f docker-compose.prod.yml up -d`
- Next.js output 设为 `standalone`，配合多阶段 Docker 构建
