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
  support/
    harness.mjs            断言台账 + /proxy-default/** mock 安装器（auth / menus.my / aiplatform.orders 全量）
    order-fixtures.mjs     订单 fixtures（AiplatformOrderSummaryResponse / DetailResponse 形状）
```

## 为新域加 E2E（T2–T6 照此扩展）

1. `support/<domain>-fixtures.mjs`：fixtures 字段对照 api-docs 对应 `*Response` schema 逐个核对。
2. `harness.mjs` 的 mock 安装器加该域端点分支（参照订单域 `listResponse` 的筛选/分页切片）。
3. `<domain>.e2e.mjs`：验收流按该票 acceptance criteria 展开。

## 口径备忘

- 登录走真实 UI（`/auth/login` → mock token → 守卫 → `/menus/my` 动态菜单），不直种 localStorage。
- 列表筛选断言看 `calls` 里最后一次清单请求的 query（`status` 多选断言**解码后**为逗号单值 `1,5`）。
- 写失败 toast 断言透传 message 原文（mock 抛 409 + 数字业务码，形如 `订单已支付或已终结，无法报价（ORD_007）`）。
- 源码包/文件包为二进制流（`application/gzip`），mock 用 `zlib.gzipSync` 生成真 gzip 字节。
