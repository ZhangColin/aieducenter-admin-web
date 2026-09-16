# REQ-18：account BFF 分页响应 `page` 0-based → 平台分页协议统一

- 提出方：admin-web（#50 平台账号管理对接中发现）
- 状态：**✅ 已落地（2026-09-16 核实）**——落地形态比本 REQ 拍板更彻底（全链 1-based 含请求侧），见「落地结果」
- 优先级：中（前端已有 +1 过渡适配，不阻塞对接；但「同壳不同义」是持续陷阱）

## 现状（本地源码核实）

| 域 | 请求 `page` | 响应 `page` |
|---|---|---|
| system-manage（users/roles/menus） | 0-based | **1-based** |
| payment（4 列表端点） | 0-based | **1-based** |
| **account（GET /api/admin/accounts）** | 0-based | **0-based** ❌ |

account 是 BFF 透传 identity 的分页协议（identity 回显 0-based，`AccountBffIntegrationTest`
断言 `page() == 0`）。三个域共用同一个 `PageResponse{items,total,page,size}` 外壳，却有两种
`page` 语义——前端 `defaultTransform` 按「响应 1-based」假设写，对 account 会错 1 页。

## 需求（用户拍板路线：整个平台分页协议保持一致）

1. **前端 ↔ admin BFF 约定一种**：即北向既有主流「**请求 0-based / 响应 1-based**」
   （反向统一要改 system-manage + payment 全部端点与测试，代价不可接受）。
2. **admin BFF account 归一化**：`GET /api/admin/accounts` 响应 `page` 回显 +1（1-based）。
3. **层层向上游提 issue**：identity（及后续各能力域服务）的分页回显协议向平台约定统一
   （或由各 BFF 归一化吸收——admin 侧权衡定夺；BFF 归一化的话本 REQ 仅需第 2 条）。

## 落地结果（2026-09-16 核实）

拍板路线是「北向统一请求 0-based / 响应 1-based + account BFF 归一化」，最终落地**更彻底**：

- **admin#73**「分页全链 1-based 收口」+ **identity#78**「迁移框架 Pagination（1-based + clamp）」——全链 1-based，含**请求侧**，无 ±1。
- **前端 account 已删临时适配**（admin-web #52）：`page` 初值 0→1、`onPaginationParamsChange` 删 `-1`。
- **其余域请求侧对齐**（manage/payment/app 共 7 个列表页删 `-1`）→ 独立 ticket **admin-web #55**（OPEN）。

> 说明：`src/typings/api/common.d.ts` 的 `PageResponse.page` 注释「请求 0-based」为全平台旧约定，随 #55 统一收口时一并更新。
