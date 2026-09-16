# REQ-20：aiplatform BFF swagger 契约缺口——cost / conversation 子结构空对象 + unitPrice 类型不对称

- 提出方：admin-web（#56 AI 平台管理对接 grill 中发现，契约正本 = admin :8081 `/v3/api-docs`）
- 状态：**已提**（admin 仓 issue #75）
- 优先级：中（「按币种成本」渲染被阻塞；其余可先渲染已文档化字段绕行）

## 现状（api-docs 实测）

| 字段 | 端点 | api-docs 呈现 | 影响 |
|---|---|---|---|
| `cost` | `costs/overview`、`costs/projects`、`costs/projects/{projectId}`、`projects/{id}.costSummary` | `{}` 空对象 | 前端无法渲染 #56 要求的「按币种成本」 |
| `question` / `closing` / `attachments` | `projects/{id}/conversation` 条目 | `{}` / `[{}]` 空对象 | 对话史子结构未文档化，前端只能渲染 text/kind/answered/at |
| `unitPrice` | `price-entries`（响应 `string`）vs `price-entries/{id}/reprice`（入参 `number`） | 类型不对称 | 改价表单预填需转类型 |

## 需求

请把上表字段的真实结构钉进 swagger（改 DTO 形状 / 加 @Schema 注解 / 附 example），使前端按 api-docs 即可对接，无需反向读源码。

## 前端过渡（不阻塞对接）

- 「按币种成本」渲染暂缓，等本 issue 落地；
- 成本页先渲染已文档化字段（token 五档 / byModel / byAgentKind / unpriced / 项目成本表）；
- 对话史先渲染 `text`/`kind`/`answered`/`at`，`question`/`closing`/`attachments` 跳过。
