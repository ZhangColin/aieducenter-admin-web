# REQ-21：aiplatform 订单/项目 DTO 缺 owner externalId —— 账号档案嵌件被阻塞

- 提出方：admin-web（#56 AI 平台管理对接 grill 中发现，契约正本 = admin :8081 `/v3/api-docs`）
- 状态：**已提**（admin 仓 issue #76）
- 优先级：低（账号档案嵌件为「有码无页」的次要功能，不阻塞六域主线）

## 现状（api-docs 实测）

`externalId` 只在三处出现：

- `GET /accounts/{externalId}` 的路径参数（账号极简档案查询键）
- `GET /orders`、`GET /projects` 的筛选入参（按账号 externalId 过滤清单）

而订单/项目的 summary 与 detail DTO 只有 `ownerDisplayName`，**没有 `externalId`/`ownerId` 字段**——账号档案嵌件「按 externalId 查 `/accounts/{externalId}`」在抽屉里拿不到 externalId。

## 需求

order/project 的 DTO 补 owner 的 externalId（如 `ownerExternalId`），使前端在订单/项目详情抽屉里能按 `externalId` 查账号档案嵌件（#56「账号读口有码无页 account:read」）。

## 影响

账号档案嵌件（有码无页）当前无法实现，已从六域拆票中搁置。六域主线（订单/项目/沙箱/成本/单价表/素材）不受影响。
