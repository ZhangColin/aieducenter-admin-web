# aieducenter-admin-web

前端项目，基于 Next.js。

## 技术栈

- Next.js 15（App Router）/ React 19 / TypeScript（strict）
- Tailwind CSS / Zustand / pnpm
- 路径别名：`@/*` → `./src/*`，工具函数：`@/lib/utils`（cn）

## 常用命令

- 开发：`pnpm dev`（端口 3001，与后端 CORS 放行一致）
- 构建：`pnpm build`
- 代码检查：`pnpm lint`
- 类型检查：`pnpm typecheck`

## 编码规范

- 函数组件 + hooks，禁止 class 组件
- 状态管理：Zustand store，放 `src/lib/store/`
- 样式：Tailwind CSS，用 `cn()` 合并类名
- API 调用：通过 `src/middleware.ts` 反向代理 `/api/*` → 后端（同一 middleware 兼任 `/dashboard/*` 路由守卫），前端直接 fetch

## Agent skills

### Issue tracker

Issues are tracked as GitHub issues in this repo (via the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-label vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.


## 平台架构上下文
本应用（admin-web）是统一后台前端（应用层），内部门户 SPA。继续在现有项目上开发。完整架构与决策在兄弟仓库 ../aieducenter-architecture/（起步包 docs/starters/admin-web.md）。

稳定不变式（务必遵守）：
- 前端不直接调各能力域——经 admin 后端 BFF 聚合。
- 权限控制用登录已拉取的 permissions/roleCodes（加 v-permission / useCan），别在 UI 硬编码角色判断。
- 必修现状：加路由守卫（/dashboard 现在可不登录访问）、加退出按钮、sidebar 读后端 menus（别硬编码）、dashboard 接真数据（现在是 mock）。
- 登录链路保留（http-client / auth-store / use-admin-login / middleware 反代），业务页重写。
- 新页（部门/岗位/财务视图）跟 admin 后端新增同步。

深度（平台自带应用定位）：读架构仓库 architecture.md §5.3、CONTEXT.md，以及 admin 后端起步包 docs/starters/admin.md（契约 + 必修 bug）。
本项目自己的设计演进 → 本项目的 CONTEXT.md + docs/adr/。