# E2E 测试 seam（#57 落地，#56 六域共用）

headless Chrome（`playwright-core` 系统 channel，**免下载浏览器**）+ `page.route` 全量 mock。
mock fixtures 的字段形状**派生自 admin :8081 `/v3/api-docs`**（各域 `support/*-fixtures.mjs` 头注释标明
对照的 schema 名）；错误信封按 BFF `AiplatformUpstreamErrorAdvice` 形状：HTTP 状态照抄 provider、
`code`＝数字业务码（域码×1000＋序号）、`message` 原文透传。

## 运行

```bash
pnpm dev          # 终端 1：dev server 必须落在 :3001（CORS 只放行 3001；残留旧 server 会顺延 3002 导致登录 403）
node e2e/order.e2e.mjs
```

退出码：全部断言通过 = 0，任一 FAIL = 1。

## 结构

```
e2e/
  order.e2e.mjs            订单域验收流（列表/筛选/分页/抽屉/三写/下载/错误 toast）
  project.e2e.mjs          项目域验收流（列表/筛选/分页/抽屉五 tab：基本信息/对话史/PRD/版本/交付文件）
  workspace.e2e.mjs        沙箱域验收流（列表/期望态·实态过滤（漂移组合）/抽屉全字段/四写门控/直填+失败 toast）
  support/
    harness.mjs            断言台账 + /proxy-default/** mock 安装器（auth / menus.my / 各域端点全量；
                           installAiplatformMocks(page, { order?, project?, workspace?, ... }) 域 fixtures 可选挂载）
    order-fixtures.mjs     订单 fixtures（AiplatformOrderSummaryResponse / DetailResponse 形状）
    project-fixtures.mjs   项目 fixtures（ProjectSummary / Detail / Conversation / Prd / Version /
                           Files / FileContent 形状 + 文件拒读响应）
    workspace-fixtures.mjs 沙箱 fixtures（WorkspaceSummary / Detail 形状——期望态/实态全状态矩阵；
                           harness applyWorkspaceAction 按 action 变异基档回「动作后观测详情」）
```

## 为新域加 E2E（T2–T6 照此扩展）

1. `support/<domain>-fixtures.mjs`：fixtures 字段对照 api-docs 对应 `*Response` schema 逐个核对。
2. `harness.mjs` 的 mock 安装器加该域端点分支（参照订单域 `listResponse` 的筛选/分页切片）。
3. `<domain>.e2e.mjs`：验收流按该票 acceptance criteria 展开。

## 口径备忘

- 登录走真实 UI（`/auth/login` → mock token → 守卫 → `/menus/my` 动态菜单），不直种 localStorage。
- 列表筛选断言看 `calls` 里最后一次清单请求的 query（订单 `status` 多选断言**解码后**为逗号单值 `1,5`；项目 `status` 三档单选**单值** `1`/`3`，两域有意不同）。
- 写失败 toast 断言透传 message 原文（mock 抛 409 + 数字业务码，形如 `订单已支付或已终结，无法报价（ORD_007）`）。
- 源码包/文件包为二进制流（`application/gzip`），mock 用 `zlib.gzipSync` 生成真 gzip 字节。
- 跨页导航用 `page.goto` 直达，不点侧栏菜单——动态路由模式下菜单点击与 addRoute 时序竞态，
  可能弹回 home（订单域 E2E 本就 home 直达；菜单渲染断言保留，链路 seam #57 已证）。
