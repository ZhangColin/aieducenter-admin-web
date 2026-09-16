# CONTEXT.md — aieducenter-admin-web

统一后台前端（admin-web）：企业内部运营聚合入口的 SPA。对前端而言，`aieducenter-admin` 后端就是它的 BFF——前端**只调** admin 后端，**禁止**直连各能力域。

> 平台级 ubiquitous language 与架构决策在兄弟仓库 `../aieducenter-architecture/CONTEXT.md` 与 `docs/architecture.md`（§5.3 平台自带应用、§6.15 财务上下文）。本文件只记 admin-web 视角的对接契约与本仓库自己的决策。

> **实现栈（2026-07-31，Soybean 重写后）**：Soybean Admin v2.2 — Vue3 + Vite8 + NaiveUI + Pinia3 + UnoCSS + `@elegant-router`。早期 Next.js/React 版与中途探索的 Ant Design Pro v6 路线**均废弃**（旧 spec #1、map #6 已关闭 superseded；Soybean 脚手架见 #9）。下文凡 Next.js 专项（middleware 守卫 / cookie 镜像 / `useCan`·`<HasPermission>` React hooks / `next.config` 反代）**作废**，以 Soybean 视角决策为准。

---

## 参考资源（开发参考，务必遵守）

做功能时**只**参考以下来源，**禁止随意 web 搜索**（Soybean 迭代快，搜到的内容可能与我们的版本完全不匹配）：

| 来源 | 地址 | 用途 |
|------|------|------|
| Soybean 官方文档 | https://docs.soybeanjs.cn/zh/guide/intro | 框架用法（路由/请求/权限/主题/国际化） |
| Soybean 源码 + example 分支 | https://github.com/soybeanjs/soybean-admin | 源码与完整 demo（`example` 分支 = 预览地址内容；本地已配 `soybean` remote，v2.2.0）。⚠️ **`example` 是 Soybean 上游分支、非本项目分支——只读引用**（`git show soybean/example:<path>` 抄具体页面/用法），**绝不 `merge` 进本项目** |
| Naive UI 中文官网 | https://www.naiveui.com/zh-CN/os-theme | 组件库文档与组件 API（DataTable/Form/Modal/Tree 等，v2.44.1） |
| Pro Naive UI 中文官网 | https://naive-ui.pro-components.cn/zh-CN/os-theme | 基于 Naive UI 的中后台二次封装组件（ProTable 等，v3.2.3，**非官方**） |

**可读性（2026-07-31 已核）**：4 站点首页/文档页 webReader MCP 可读；Naive UI 两个站点的**组件文档页是客户端渲染 SPA，静态抓取只拿到外壳**——用真浏览器（Chrome MCP，需 ≥30s 超时）能完整渲染（实测 data-table 组件页 27KB 正文含 props/示例）。WebFetch 被本环境网络策略拦截，改用 webReader MCP 或 Chrome MCP。

**与 upstream `main` 保持可升级（重要约束）**：Soybean 更新快，做功能时**最小化对框架文件的分叉改动**——优先在 `src/views`、`src/service/api`、`src/store/modules`、`src/typings` 等业务层扩展，**避免大改 `@sa/*` 内部包与 `src/router/elegant/*` 生成产物**；需要时从 `soybean/main` 同步更新。目标：我们做完功能后仍能平滑跟 main。

---

## Glossary（术语表）

| 术语 | 定义 |
|------|------|
| **admin-web** | 统一后台前端，Soybean（Vue3）SPA，应用层·平台自带应用的一半 |
| **admin 后端 (`aieducenter-admin`)** | 统一后台后端，运行在 `localhost:8081`；对前端即 BFF |
| **Operator（运营用户）** | 后台使用者；认证 + 角色/部门/岗位/RBAC 归 admin 自有，不在用户域/IdP，本地登录（非 SSO） |
| **BFF 边界** | 前端 → 只调 admin 后端（经前端反代 `/api/*`，dev 走 Vite proxy）；admin 后端 → 经 `cartisan-openapi` 签名调各能力域 |
| **Sa-Token** | admin 后端的鉴权机制；token 是 UUID 字符串，走 `Authorization: Bearer <uuid>` header（**不是** JWT、**不走** cookie） |
| **统一响应 (`ApiResponse<T>`)** | 后端所有接口返回 `{ code, message, data, requestId, errors }`；`code` = HTTP 状态码本身（200/400/401/403…），**非**业务码。**例外（aiplatform 透传域）**：忠实透传 provider 时，错误信封 `code` = provider 数字业务码（域码×1000＋序号，如 IDN_004→6004）、HTTP 状态独立照抄 |
| **分页 (`PageResponse<T>`)** | `{ items, total, page, size }`；**全链 1-based**（请求与响应 `page` 均 1-based、首页=1、无 ±1——admin ADR-0012 / #73 收口）。旧「请求 0-based」条目作废 |
| **权限三件套** | `AdminUser` / `AdminRole` / `AdminMenu` + 关联表；前端拿到 `roleCodes[]` / `permissions[]` / `menus[]` 做指令级控制 |
| **permissions / roleCodes** | 登录时 `/auth/current` 拉取的权限码数组（如 `admin:user:read`）与角色编码数组（如 `SUPER_ADMIN`）；超管靠后端 bypass 放行 |
| **财务上下文** | admin 内的只读限界上下文（非独立域）；从各能力域只读取数做收入确认/冲销——**后端尚未实现** |
| **应用 (`App`)** | 平台接入的应用（第三方或自有）；admin 后端 `/apps` 管理。每个应用可附带可选的 ApiKey（API 鉴权）与 SsoClient（OIDC 接入），各自独立状态 |
| **SsoClient** | 应用的 OIDC 客户端记录。四要素互相独立：身份（`clientId`，终身稳定）、密钥（`clientSecret`，仅一次性明文可见）、配置（`redirectUris`/`postLogoutRedirectUris`/`scopes`/`grants`）、状态（启用/禁用） |
| **开通 (Provision)** | 首次创建某应用的 SsoClient——生成终身稳定的 `clientId` 与第一份 `clientSecret`（凭证端点的首次调用，无 body） |
| **重置密钥 (Rotate secret)** | 凭证端点的后续调用；轮换 `clientSecret`，`clientId` 不变；旧密钥立即失效。与「开通」共用同一端点，区别仅在是否首次 |
| **配置 (SsoClient Configuration)** | SsoClient 可变的 URI/权限/授权类型集合，整份替换；与凭证、状态三者互相独立。`redirectUris` 与 `postLogoutRedirectUris` 均必填非空 |
| **启停用 (SsoClient Lifecycle)** | SsoClient 的启用/禁用切换，与所属应用的启停用相互独立 |
| **postLogoutRedirectUris** | OIDC RP-Initiated Logout 的登出回跳白名单，与 `redirectUris` 平级、必填非空 |
| **支付管理上下文 (payment admin BFF)** | admin 内新增的 `payment` 子包（≠ 财务上下文）；admin 作 BFF 调 payment、对前端暴露 `/api/admin/payment/**`。运营写操作 + 运营看板，不持业务逻辑/不记业务审计 |
| **支付订单 (PaymentOrder)** | 业务系统发起的一笔支付，以 `paymentOrderNo` 标识。admin 只读 + 通知重发，**不**创建/取消/预下单（业务系统职责） |
| **退款订单 (RefundOrder)** | 针对某支付订单的退款，以 `refundOrderNo` 标识。admin 可**审核**（approve/reject），**不**创建 |
| **通道交互日志 (PaymentLog)** | payment 与银行/通道网关的**机机**交互留痕（logType / bankInterface / returnCode / success）。_Avoid_: 操作记录 |
| **订单操作记录 (OperationLog)** | 行为者（人/系统）**对订单**的操作留痕；操作审计的**权威源**，admin 不本地记账。_Avoid_: 通道日志 |
| **退款审核 (audit)** | 对退款 approve/reject 的**决议**（写操作，落 `auditType=MANUAL`/`auditorId`）。_Avoid_: 审计日志（= OperationLog）、审计字段（已废 REQ-12）——三者不同 |
| **通知重发 (notification resend)** | 补发支付/退款结果通知给业务系统，**不改订单状态**（仅补投递） |
| **主动查行 (bank query)** | 触发 payment 向银行查真相并同步本地状态；条件性暴露（payment 提供端点则做，admin#46 / T9） |
| **订单生命周期 (lifecycle)** | 按时间合并某单的 PaymentLog + OperationLog 的端到端追溯视图；详情抽屉内一个 tab，不种菜单 |
| **Account（终端用户账号）** | 平台终端用户的账号，归 identity 域，以 `userId`(TSID) 标识，email/phone 均可空。与 **Operator（运营用户）** 对举：「账号管理」管 Account，**不**管 Operator（后台员工走系统管理>用户管理）。_Avoid_: 把两者混称「用户」 |
| **封号 / 解封 (disable / activate)** | 管理员对 Account 的手动停用与恢复（status: ACTIVE↔DISABLED），带 reason（封号必填 ≤500）。封号时 identity 自动踢全部会话；解封**不**恢复会话（用户须重新登录） |
| **系统锁定 (locked)** | 登录失败累计等触发的**自动**锁，布尔字段、独立于封号轴（临时锁 vs 永久停用语义不同）。解除走 unlock：只把 locked 置 false，不改 status、不动会话 |
| **强制下线 (revoke sessions)** | 一键撤销某 Account 全部会话——只踢人，不改状态、不动锁。无会话列表视图，仅此一个按钮 |
| **AI 平台（aiplatform）** | 平台自带的应用域；运营在统一后台监管其交易与交付。admin 作 BFF **忠实透传** provider `/api/backoffice/**` 契约（零加戏），前端只调 admin `/api/admin/aiplatform/**`（六域页面 + 账号档案嵌件，共 34 端点） |
| **AI 订单 (Order)** | aiplatform 的一笔交易，以 `id` 标识；含 append-only 报价史 `priceEntries` 与生命周期（quote→pay→archive / cancel）。_Avoid_: 支付管理域的「支付订单 PaymentOrder」——不同域、不同单号体系 |
| **AI 项目 (Project)** | aiplatform 的交付单元；带订单引用（active/latestOrder）、成本指针（costSummary）、工作区引用（workspaceId）；归档项目照读 |
| **沙箱 / 工作区 (Workspace)** | **菜单词用「沙箱」**（`沙箱管理`），**领域实体用「工作区」**（`workspaceId`/`Workspace`）；期望态 `desiredState` 与实态 `containerState` 可漂移（清单按两者过滤找 desired≠actual） |
| **成本 (Cost)** | aiplatform 平台 token 成本观测（与订单报价脱钩、改价不溯及）；时间窗必填（`[from,to)` 半开）、五档用量（input/output/cacheRead/cacheWrite/reasoning）+ 按币种/按模型/按智能体分解 + unpriced 未配价警示 |
| **单价表 / 价目行 (Unit price entry)** | **菜单词「单价表」**，**领域实体「价目行」**（`price-entry`）；成本换算用的单价数据，append-only（改价 = 关当前行 + 开新行，可预发布未来生效） |
| **知识素材 (Material)** | aiplatform 沉淀的知识资产；停用⇄启用可逆、删除为治理移除（不动来源项目） |
| **账号档案 (Account profile)** | aiplatform 侧极简账号档案（`id/externalId/displayName/createdAt`），嵌订单/项目详情抽屉按 `externalId` 查。_Avoid_: identity 域的「Account（终端用户账号）」——不同域 |

---

## 后端契约快照（事实，对接基线）

后端 `aieducenter-admin`（Spring Boot 3.4 / Java 21 / Sa-Token / PostgreSQL+Redis），`localhost:8081`，default profile `local`。

### 鉴权
- Sa-Token：`token-name: Authorization`，`token-prefix: Bearer`，`token-style: uuid`。
- timeout：rememberMe=false → 24h；rememberMe=true → 7d。无 refresh-token。
- 放行路径：`/api/admin/auth/login`、`/api/admin/auth/captcha`(占位未实现)、`/error`、`/actuator/**`、`/swagger-ui/**`、`/api-docs/**`；其余 `/api/admin/**` 全鉴权。
- 超管 `SUPER_ADMIN` 角色自动 bypass 权限检查（仍需登录）。
- CORS：**仅**放行 `http://localhost:3001` 与 `http://127.0.0.1:3001`（`WebConfig.java:33-34`）。

### 接口清单（共 25 个，前缀 `/api/admin`）

| 域 | 方法 | 路径 | 返回 data | 权限码 |
|----|------|------|-----------|--------|
| 认证 | POST | `/auth/login` | `TokenInfo{token,loginId,expireTime}` | 公开 |
| 认证 | POST | `/auth/logout` | Void | 登录即可 |
| 认证 | GET | `/auth/current` | `CurrentUserResponse{user,roleCodes,menus,permissions}` | 登录即可 |
| 认证 | PUT | `/auth/current/password` | Void | 登录即可 |
| 菜单 | GET | `/menus` | `MenuResponse[]`(树) | `admin:menu:read` |
| 菜单 | GET/POST/PUT/DELETE | `/menus[{id}]` | — | `admin:menu:read`/`:write` |
| 角色 | GET | `/roles` | `PageResponse<RoleResponse>` | `admin:role:read` |
| 角色 | GET/POST/PUT/DELETE | `/roles[{id}]` | — | `admin:role:read`/`:write` |
| 角色 | PUT | `/roles/{id}/menus` | Void | `admin:role:write` |
| 角色 | PUT | `/roles/{id}/permissions` | Void | `admin:role:write` |
| 用户 | GET | `/users` | `PageResponse<AdminUserResponse>` | `admin:user:read` |
| 用户 | GET/POST/PUT/DELETE | `/users[{id}]` | — | `admin:user:read`/`:write` |
| 用户 | PUT | `/users/{id}/status` (`?status=1\|0`) | Void | `admin:user:write` |
| 用户 | PUT | `/users/{id}/roles` | Void | `admin:user:write` |
| 用户 | PUT | `/users/{id}/password` | Void | `admin:user:write` |
| 权限 | GET | `/permissions` (`?scope=admin`) | `PermissionResponse[]` | `admin:permission:read` |

### 关键 DTO
- **`AdminUserResponse`**: `id(Long) username nickname email phone avatar status(Integer 1=激活/0=禁用) statusName breakGlass createdAt updatedAt`
- **`MenuResponse`**(树): `id name path icon parentId sortOrder children[]` — ⚠️ **无 `type` 字段**，前端无法直接区分菜单/分组/分隔线
- **`RoleResponse`**: `id name code description sortOrder menuIds(Set) permissionCodes(Set)`
- **`PermissionResponse`**: `code name`
- 登录体 `AdminUserLoginCommand`: `{ username, password, rememberMe }`；内置超管 `admin / Hcy@2026`(id=1, 破窗号)

### ⚠️ 后端**尚未提供**的接口
部门(department)、岗位(position)、财务(finance)、Dashboard 聚合数据、`/auth/captcha`（在放行名单但无实现）。

---

## 不变式（继承自架构，务必遵守）

1. 前端不直接调各能力域——经 admin 后端 BFF 聚合。
2. 权限控制用登录已拉取的 `permissions`/`roleCodes`（Soybean：`useAuth().hasAuth(code)` + `v-if`），不在 UI 硬编码角色判断。
3. 鉴权链路：`/auth/login` 取 token → `/auth/current` 取 `{user,roleCodes,permissions,menus}` → 映射进 auth store（见下「UserInfo 映射」）；路由守卫在 `router.beforeEach`（`src/router/guard/route.ts`）。业务页重写。
4. 新页（部门/岗位/财务）跟 admin 后端新增同步。

---

## 本仓库决策（Decisions）

> 通过 `/grill-with-docs` 逐条结晶。已定稿的迁移至 `docs/adr/`。

### 2026-09-16 AI 平台六域页面 grilling（admin-web #56，消费 admin BFF aiplatform 34 端点；后端已就绪 admin#62/#63–73）

admin 仓 aiplatform BFF 已全量落地（`/api/admin/aiplatform/**` 34 端点，忠实透传 provider `/api/backoffice/**`），菜单 V15 已种、前端无页。本票 grill 拍板 UI 形态与联调口径，逐域按 matt 流程拆票实现（不分批）。

- **契约正本 = admin :8081 `/v3/api-docs`**（不读后端 Java 源码补契约，缺口提 issue）：34 端点与 issue 六域清单吻合（订单 6/项目 9/沙箱 6/成本 4/单价表 3/素材 5/账号 1）。
- **分页全链 1-based**（ADR-0012）：新页面原生 1-based、零 ±1；区别于旧 8 列表页 0-based（归 #55）。`defaultTransform` 响应侧已 1-based 透传，请求侧 1-based 直传。
- **页面形态照先例**（不再逐域 /prototype 三变体）：列表 `NDataTable`（flex-height + sm:h-full）+ `NDrawer` 720 + `.desc-table` 只读 + `NTabs` + 写按钮 `hasAuth` 门控；成本中心、项目文件区两处异质另拍（见下）。
- **错误信封**：aiplatform 透传域 `code`=数字业务码≠HTTP 状态（glossary 已加例外）。前端**不按业务码分支**——写失败走透传 `message` 统一 toast，文件内容拒读走「一态兜底」（统一「无法预览」+ 透传 message，不读 provider 码表）。
- **成本中心 = 单页 dashboard**（复用 payment/stats widget + echarts 范式）：时间窗 `NDatePicker` range 必填（`[from,to)` 半开）→ token 五档 5 stat tile → byModel/byAgentKind 两柱状 → unpriced 警示卡 → 项目成本表（分页、成本降序）+ 行点击 NDrawer 下钻。「按币种成本」暂缓（`cost:{}` 空对象 → REQ-20）。
- **项目文件区 = 项目详情抽屉内「交付文件」tab**：`NTree` 按 path 折叠（显 size）→ 点文本文件内嵌只读（`/files/content`）→ 顶部「下载文件包」（`/files/package` tar.gz）。机密/1MiB/非文本三类拒读**一态兜底**。
- **术语**：沙箱（菜单）/工作区（实体）、单价表（菜单）/价目行（实体）；glossary 补 8 条（AI 平台/订单/项目/沙箱·工作区/成本/单价表·价目行/素材/账号档案）。
- **i18n**：7 键 `route.aiplatform` + `_order/_project/_workspace/_cost/_price_entry/_material`，文案照 issue 菜单表，三处同步（Schema/zh/en），随各域 commit 落。
- **REQ-20（#75）**：`cost:{}`、conversation `question/closing/attachments:{}`、`unitPrice` string/number 不对称 → 已提 [admin#75](https://github.com/ZhangColin/aieducenter-admin/issues/75)，前端先渲染已文档化字段绕行。

**收域标准**（admin#61 冒烟四项，联调通过后 admin#61 方可关）：签名负例三连 / 域内全端点 happy path / 写操作留痕落库 / 分页与过滤边界。

### 2026-09-16 T1 交付：AI 平台脚手架 + 订单域 tracer bullet 点亮 ✅（#57，六域共用基座首次落仓）

mock E2E（headless Chrome + page.route，fixtures 派生自 `/v3/api-docs`）**31/31 两轮全绿**。验收六条全过：列表契约字段（金额 Long 分 string + statusName 直读）/ 四维筛选绑定（status 多选逗号单值 `status=1,5`、createdFrom/To、externalId、orderId）/ 抽屉价目史（append-only 新→旧带操作者）/ 三写（报价·改价、取消 reason 必填、重试归档）成功后回读+刷新 / 源码包 tar.gz 二进制流 / 写失败透传 message toast（409 + 数字业务码 5007）。

- **六域共用地基**（后续 T2–T6 照此扩展）：`Api.Aiplatform` 命名空间（`typings/api/aiplatform.d.ts`）+ `service/api/aiplatform.ts`（六端点）+ `constants/aiplatform.ts`（整数枚举手写 options）+ `route.aiplatform{,_order}` i18n 三处同步 + **首个入仓 E2E seam**（`e2e/`，playwright-core devDep + 系统 Chrome channel 免下载浏览器；T2–T6 按 `e2e/README.md` 三步扩展）。`pnpm gen-route` 产出 `aiplatform`（layout.base 目录）+ `aiplatform_order` 两级，与 V15 种子 `view.aiplatform_order` 精确对齐。
- **status 多选序列化**：service 层显式拼逗号单值（`status.join(',')`）——BFF 文档钉死逗号分隔（provider 签名按参数名去重，`status=1&status=2` 会被丢），不交给 axios 默认数组序列化。
- **状态门控**（provider OrderStatus 五态 + 聚合守卫印证）：未支付 1|2 = 报价/改价（同一端点，已报价=重复提交）+ 取消；已支付 3 = 重试归档；下载源码包无状态门控（404 ORD_001 / 500 WSP_002）。写按钮按态 + `hasAuth` 逐写码（`:quote`/`:cancel`/`:retry-archive`）双门控。
- **坑与定案（E2E 踩出，T2–T6 直接受益）**：① **NInputNumber v-model 仅 blur/Enter 提交**——弹窗内「输完即点确认」撞禁用态是真实 UX 死胡同，报价金额改 NInput 逐键绑定 + 确认时解析（payment 筛选条用 NInputNumber 是筛选场景可容忍，表单弹窗不用）；② **NModal preset dialog 成功失败都自动关**——写失败要留弹窗需 handler 返回 `false`；③ **NDrawer 默认 modal 遮罩挡背景交互**——E2E 里行级操作必须先 Escape 关抽屉；④ toast 断言用轮询采样（`waitForMessage`，~3s 生命周期，单点 `isVisible`/`waitFor` 易错过闪现）；⑤ Naive datetimerange 键盘输入 = `fill`+`Tab`（Enter 不吃）；⑥ 侧栏菜单 DOM 是 `role=treeitem`（非 `.n-menu` 类），断言等其异步渲染；⑦ 抽屉内价目史用 NDataTable（宅标准），plain NTable 在抽屉内渲染异常（空 tbody，未深究）。
- **金额线型复核**：aiplatform `amount` swagger 文档化为 `integer/int64`，与 payment 同型——线上仍是 JSON **string**（框架全局 Long→ToStringSerializer，swagger 只标声明类型）；typings 按 `string`（分）+ `formatMoney` 渲染，quote 入参 `number`（Jackson Long 兼容）。
- **code-review 修正（双轴 review，紧随本票）**：① 删 `orderStatusRecord` 死代码（aiplatform 链路有 `statusName`，record 恒 account 域范式，零引用）+ 死 i18n 键 `confirm.cancel`；② 重试归档收编父页单点（抽屉改 emit `retry`，与 quote/cancel 同先例——此前 index/drawer 双份内联）；③ 「操作」下拉触发器按行隐藏（终态/无写权限行不再出空下拉，account「互斥/不可达不出现」）；④ 列表补 projectId 列（AC 字面九字段齐）；⑤ 下载文件名改读服务端 `Content-Disposition`（端侧拼名降级为兜底）；⑥ `handleWriteSuccess` 注释勘误（modal 遮罩下「开着即同目标」恒成立，非防御性检查遗漏）。review 判断项不修的记录在案：`tsToIso` 第 6 份拷贝（先例容忍）、`installOrderMocks` 名随 T2–T6 泛化时再改。

### 2026-09-16 T2 交付：项目域点亮 ✅（#58，六域之二——列表 + 详情抽屉四 tab）

mock E2E（order 31/31 回归绿 + project **51/51 两轮全绿**）。验收五条全过：列表契约字段（id/name/ownerDisplayName/type·typeName/status·statusName/archived/createdAt/updatedAt，归档照读）/ 四维筛选（**status 三档单选单值直传** `status=1|3`——与订单多选逗号串有意不同、createdFrom/To、externalId、projectId 精确）/ 抽屉四 tab（基本信息含 activeOrder·latestOrder 双档订单引用 + costSummary 指针只读 unpriced（cost:{} REQ-20 暂缓）+ workspaceId 引用；对话史 text/kind·kindName/answered/at 且 question/closing/attachments 载荷跳过（REQ-20 #75，sentinel 断言钉死）；PRD 全文；版本列表新→旧 + 版本详情锚定收尾卡，closing 泛型键值渲染 + null 兜底）/ E2E 覆盖全链路含 PRD 未产出 4015 透传 toast。

- **项目状态两档**（provider ProjectStatus 印证 + api-docs 描述「1=进行中, 3=已归档」，码位 2 注销不复用）：筛选三档 = 全部（缺省不传）/进行中（1)/已归档（3)——「全部」radio 值 'all' 哨兵字符串（NRadio value 不收 null，整数枚举手写 options 先例）。
- **对话史六 kind**（1=user 2=agent 3=question 4=answer 5=closing 6=guide）：text 对 question/closing 条目恒 null（载荷在跳过对象里）→ 正文 '-' 占位照订单域 null 先例；answered 仅 kind=3 有语义（false=挂起待答）→ 已答/待答双态 tag。
- **版本详情 closing** = `Map<String,Object>`（api-docs 唯一文档化形状）→ 泛型键值渲染（原始键直出 + 值按类型格式化），不对 key 做端侧映射（键漂移零风险）；回滚版本 runId 空 + rollbackFrom 锚定源版本、closing 可空（收尾卡缺位）→ 统一兜底文案。
- **E2E seam 泛化**（T1 review 留账）：`installOrderMocks` → `installAiplatformMocks(page, { order?, project?, ... })`，域 fixtures 可选挂载；订单 E2E 仅改导入（31/31 回归证无损）。fixtures 与订单域交叉一致（同批 TSID 项目 id/name）。
- **坑与定案（E2E 踩出）**：① **动态路由模式下菜单点击与 addRoute 时序竞态**——点「项目管理」可能弹回 home（Vue Router 'No match for' 噪音，URL 瞬变后回落），waitForURL 捕获瞬态 through、后续断言全跑在旧页上是极难排查的假性失败——E2E 跨页一律 `page.goto` 直达（菜单渲染断言保留，菜单链路 #57 已证）；② NRadioButton 根类是 `.n-radio-button`（非 `.n-radio`）；③ 版本 tab 列表与详情同现同主题文本，getByText 断言会撞 strict mode——详情独有文本（全 hash / closing summary）作渲染信号；④ mock 失真警觉：fixtures 的 Long id 必须 string（对话条目 id 曾写 number，spec review 抓住）——**wire 形状钉子 = 类型注释自述**。
- **code-review 修正（双轴 review，紧随本票）**：① harness `ownerMap` 两域两份收编单点 `filterByExternalId`；② `costSummary` 去 nullable（provider 文档「无用量＝空 cost＋false 明确空态」指针恒在）——null 兜底渲染「成本完整」是误述；③ conversation fixtures id 字符串化（Long 序列化口径）；④ kind 色注释勘误（收尾卡红非紫）。review 判断项不修记录在案：`.desc-table` CSS 同特性内第二份（全仓 4 份先例容忍，萃取共享样式留待 T3–T6）；`tsToIso` 第 7 份拷贝（先例容忍）；对话条目 runId chip 属 AC 外但为契约字段（运营排障叙事有用，保留）。

### 2026-09-16 T3 交付：项目交付物文件区点亮 ✅（#59，六域之三——详情抽屉第五 tab）

mock E2E（project **63/63 两轮全绿** + order 31/31 回归绿）。验收五条全过：文件树按 path 折叠行内显 size（[{path,size}] 只列文件契约 → 前端目录合成 + `formatFileSize` B/KB/MB 折算）/ 点文本文件内嵌只读（content `<pre>` 只读 + path 原样回显）/ 拒读一态兜底（统一「无法预览」+ 透传 message——4022 超限与 4023 非文本**两码同 UI 态** E2E 钉死「不按业务码分三态」）/ 下载文件包（tar.gz 二进制流无信封 + Content-Disposition 文件名）/ E2E 全覆盖。

- **契约事实（api-docs）**：files 只列文件、目录由前端按路径段合成（目录 key 加 `dir:` 前缀防与文件 path 撞 key）、size Long（字节）→ JSON string；content 拒读全归 provider 裁决（4020 机密/4021 不存在/4022 超 1MiB/4023 非文本）——**4020 经树不可达**（.env 等非交付物不入清单），E2E 只 mock 树内可达的 4022/4023 两类（fixtures 头注释钉死此口径）；package 无信封、sealed=-archive/未封存=-source 文件名由 provider 经 Content-Disposition 决定（BFF 不判封存态）。
- **交互定案**：树 `NTree` block-line + expand-on-click + selectable，根级目录默认展开（树随数据后挂载、default-expanded 生效于挂载时）；目录选中 = 回提示态（防旧内容/拒读态残留）；拒读 onError toast（全局兜底）与 pane 内锚定态**双显**是有意为之（toast 不抑止，先例 ADR-0001）。
- **code-review 修正（双轴 review，紧随本票）**：① 点目录后查看器残留旧态 → 目录/取消选中回提示态；② 下载落盘动作（objectURL→anchor→revoke ~15 行）与订单源码包第 2 份逐字重复 → 萃取 `saveBlobFile` 收编 utils/common.ts、两调用点归一（订单回归 31/31 证无损）；③ `buildTree` 双遍历收敛单次递归铺平索引；④ 删仅为空态判断存在的 `files` ref；⑤ E2E 断言名与实断对齐（补 12 MB）。review 判断项不修记录在案：`error.response.data.message` 内联提取与 onError 重复（单一消费者，出现第二处再萃取）。

### 2026-09-16 T1 E2E 联调闭环：平台账号全流程点亮 ✅（#52 / spec #51）

真后端（admin BFF :8081 + identity :10001 均 local profile）全链验证。**验收八条全过**（含两条语义校准，见下）：

- **菜单/列表/详情**：V14 菜单经 `/menus/my` 下发、侧栏「平台账号」可见可进；列表出 identity 真数据（`userId` JSON 字符串）；详情与列表行同构（含 `locked`/`hasPassword` 两轴）。
- **六字段筛选**：phone（精确/模糊 INNER_LIKE）、email 模糊、userId 精确、status 整数枚举、locked 布尔转换 **五字段全绿**；**注册时间区间 → BFF 502**（KNOWN，REQ-19 / [admin#74](https://github.com/ZhangColin/aieducenter-admin/issues/74)，契约内 date-time 透传炸下游，前端格式与 payment 域同形无锅）。
- **分页 1-based 收口**：REQ-18 已落地（admin#73 + identity#78，全链 1-based 无 ±1）——前端删临时适配（请求 `page` 回 1-based 直传，`index.vue`/`account.ts`/`account.d.ts` 三处 ⚠️ 注释清除），实测 page=1/2 回显与翻页正确、page=0 clamp 到 1。**其余域（manage/payment/app 共 7 个列表页）请求侧对齐归 #55（OPEN，同窗 admin#73）**——本票只收口 account；后端已全链 1-based，那 7 处当前翻页会 off-by-one（`page-1` 发 0-based 请求被 clamp），#55 落地即愈。`common.d.ts` 的「请求 0-based」注释亦随 #55 统一更新。
- **封号链**：disable 200 → 列表/详情 status=0 → 测试账号登录 **401「账号已停用」** → activate → status=1 → 登录恢复。
- **锁定链**：「登录失败累计自动锁定」identity **未实现**（触发源缺失，[identity#79](https://github.com/ZhangColin/aieducenter-identity/issues/79)）——以 DB 置位模拟：列表/详情 locked=true（双轴叠加 status=1 不丢信息）→ 登录 **401「账号已锁定」** → unlock → 恢复。
- **强制下线链（语义校准）**：登录拿 token → userinfo 200 / refresh 200 → revoke 200 → **refresh 400 `invalid_grant`（SSO 会话已失效）** ✅。票的「token 失效」按 identity 既定设计落地为「refresh/会话失效」；**access token 15min 短命内继续可用是设计取舍**（准 SLO：短命自然收尾），非缺陷。
- **UI 冒烟（headless Chrome 全真后端，18/18）**：抽屉横幅四态合成（正常 / 正常·系统锁定 / 已封号 / 已封号·系统锁定）、操作按钮长横幅上、互斥切换（封号⇄解封按钮按态切换、解除系统锁定仅 locked 时现）、reason 弹窗必填（空时确认禁用）、写操作后回读+列表刷新。
- **验证设施（/tmp 不入仓）**：`/tmp/account-e2e.sh`（API 全链 bash，PASS/FAIL/KNOWN 三档）+ `/tmp/account-ui-smoke/smoke.mjs`（playwright-core + 系统 Chrome channel，免下载浏览器）。
- **环境陷阱**：① 短信发码限流 per phone+ip（429「发送过于频繁/次数过多」）——脚本带 65s 重试；② dev 固定码（local profile）：图形码 `qa58`、短信码 `246810`（QA/e2e 设计如此，不依赖真实收码）；③ Vite「504 Outdated Optimize Dep」= 残留旧 dev server 占 3001（kill 端口进程重启即修，非代码问题）；④ identity OIDC 全链：captcha → sms → login-code → `{redirectUrl}` 取 code → `/token` 换 access/refresh（demo client `rhznx-…`/`http://demo.localhost:3000/auth/callback`）。
- **范围外观察**：V15 已种 aiplatform 六叶菜单但前端无对应页面——动态路由转换报「View component not found」console.error 噪音，菜单优雅跳过不炸（本票不处理，aiplatform 前端建页时自愈）。
- typecheck + lint 全绿。

### 2026-08-14 平台账号管理前端 grilling（admin-web #50，消费 admin BFF admin#49；后端已就绪）

复用 payment 列表+抽屉范式，建「平台账号」目录 + 账号列表页 + 详情抽屉 + 4 写操作。后端 6 端点（`GET /accounts`、`GET /accounts/{userId}/management`、`POST .../disable|activate|unlock|sessions/revoke`）已合入 admin 本地 develop、测试齐全。

- **术语与文案**：glossary 已补 **Account（终端用户账号）** 与 **Operator 对举**、封号/解封、系统锁定、强制下线四条。菜单中文文案**前端 locales 定**（后端 V14 只下发 i18n_key）：`route.account` = **「平台账号」**、`route.account_list` = 「账号列表」——与「系统管理>用户管理」（Operator）拉开区分度（Q1）。
- **两条状态轴独立呈现**（Q2，identity javadoc 印证）：封号轴（status Integer 1=ACTIVE/0=DISABLED）与系统锁定轴（locked boolean）分开渲染——列表主「状态」列只渲染封号轴 tag，locked 作独立标记；抽屉分块各说各的。**无 `*Name` 字段**，前端按 code 映射文案（两值+布尔，整数枚举手写 options 范式）。
- **操作按钮 = 互斥切换显示，不灰**（Q3 用户修正「禁用」方案）：封号/解封**单按钮按状态切换 label+handler**（ACTIVE→「封号」error / DISABLED→「解封」）；「解除锁定」仅 locked=true 时 v-if 显示；「强制下线」恒显。全组 `hasAuth('admin:account:write')` 门控（read/write 两值已定、不拆）。
- **reason 交互**（Q7）：封号独立弹窗 reason 必填 ≤500（NTextarea + maxlength 计数）；解封/解锁/强制下线 `$dialog.warning` 纯二次确认——后端三端点的可选 reason body **不消费**（审计已有 X-User-Id/X-User-Name 出站透传）。写操作响应 `data:null`，成功后回读详情 + 刷新列表。
- **`hasPassword` 不展示**（Q8 用户拍板）：它是「是否设过密码」布尔标志（社交/纯验证码账号 false），非密文本身；类型里保留字段、UI 不渲染。
- **注册时间仅筛选项**：`createdFrom/createdTo` query 支持，但列表/详情响应**均无注册时间字段**（identity 不回）——不做时间列。
- **分页契约分歧 → REQ-18**（Q6 用户拍板平台统一路线）：account 响应 `page` 是 **0-based**（BFF 透传 identity 协议），与全平台「响应 1-based」相反。前端 account 专属 transform **+1 临时适配**；REQ-18 提 admin BFF 北向归一化 1-based、再层层向各服务提 issue 统一分页协议。后端改好后删适配。
- **落位/形态**（Q5）：`src/views/account/list/index.vue`（→ `account_list` / `/account/list`，与 V14 `view.account_list` 对齐，同构 `app_list`）；详情抽屉无路由、NDrawer **720**（对齐 payment）；筛选 6 字段（email/phone/userId/status/locked/注册时间区间）**平铺不折叠**；service `src/service/api/account.ts` + `src/typings/api/account.d.ts`（`Api.Account` 命名空间）；页面局部状态、**不建 store**。
- **commit = 2 个**：① service/types + REQ-18 文档；② 页面 + 抽屉 + i18n 三处 + gen-route 产物。
- **E2E**：测试终端账号（手机号 18001828301，用户提供）——封号→列表已封号→测试账号登录被拒→解封恢复；锁定→locked 标记→解锁；登录拿 token→强制下线→token 失效。identity 服务须起着（`localhost:10001`）。
- **UI 原型拍板（/prototype 三变体，headless 冒烟 20/20，2026-08-14）**：**A 的筛选 + B 的主体**。筛选 = A 形态（keyword 类输入 + status/locked 下拉 + 注册时间区间，平铺）；列表 = B（合成徽章单列——主状态 tag + 锁定小 tag 并排，双轴叠加不丢信息；行内「查看 + 操作下拉」，互斥/不可达操作**不出现**在下拉里）；详情抽屉 = B（状态横幅置顶——合成态大字 + 操作按钮长在横幅上，资料单列在下）；按钮/下拉文案**不带省略号**（「封号…」→「封号」）。原型全量保档 `prototype/account-ui` 分支（三变体 + 浮动切换条 + mock，仅作设计过程 primary source，勿合回）。

### 2026-08-12 支付管理前端 grilling（admin-web #41，消费 admin-bff #38）

消费 admin-bff 支付管理 BFF（[admin#38](https://github.com/ZhangColin/aieducenter-admin/issues/38) 契约锁定），实现「支付管理」一级目录 + 5 叶子页 + 仪表盘。后端 V13 菜单已种、经 `/menus/my` 下发；详情不种菜单。后端端点面 `/api/admin/payment/**`（4 列表 / 3 详情·生命周期 / 3 写 / 8 统计）。

- **节奏 = 全量一次建，不 tracer-bullet、不延后**（用户两次拍板 Q1/Q7，覆盖 tracer-bullet 范式）：后端与前端锁步、做到即就绪，按锁定契约全量建 5 页 + 仪表盘 + 全写操作；tier-2 统计同样全量建、无占位。**唯一保留**：payment 服务侧 wire 字段（金额单位、审核 reason 字段名）接真时核对——避免 5 页同改。
- **service / types 独立**（Q8）：新建 `src/service/api/payment.ts`（`index.ts` barrel 再导出）+ `src/typings/api/payment.d.ts` 的 `Api.Payment` 命名空间。payment 是独立限界上下文（后端 `com.aieducenter.admin.payment` 子包）、体量最大（18 端点），不塞进 `system-manage.ts` / `Api.SystemManage`。
- **`src/views/payment/` 落位**：`stats/order/refund/operation` 两段目录（→ `payment_*` 键）。**`payment_channel_log` 落 `src/views/payment/channel/log/`（三级）**——route_name 双下划线 = elegant-router 层级分隔符（`GetChildRouteKey` 递归拆），三级目录产出键 `payment_channel_log`；动态模式只取其 `views` 映射键 + `RouteKey` 类型项（`fetchIsRouteExist` 403-vs-404 + i18n），静态路由树不用、无害。建页后跑 `pnpm gen-route`。
- **详情 = NDrawer（非 Modal）**（Q5，覆盖 issue「720px Modal」默认）：右抽屉 `width=720`，内部复用 apps 的 `.desc-table` grid 放只读字段 + `NTabs`（基本信息 / 生命周期，默认基本信息、按需切）。生命周期 = `NTimeline` 合并 PaymentLog + OperationLog（按 createdAt 排序、机机 vs 行为者分色/分图标、success/fail 区分）。支付抽屉头部「通知重发」、退款抽屉头部「审核」。payment **无创建流**（支付/退款均非 admin 创建，spec out-of-scope）。
- **生命周期端点**：`/orders/{no}/lifecycle` 一个，支付/退款抽屉各传自己的 no 复用同一组件。
- **退款审核**（Q12）：独立「审核」弹窗（approve/reject radio + reason，reject 必填）→ `POST /refunds/{no}/audit`；不散两按钮。
- **通知重发**：`$dialog.warning` 确认 → `POST .../notifications/resend`，toast 成功；不改订单状态（仅补投递，术语已钉）。
- **列表 / 筛选**：镜像 manage/app 范式（`useNaivePaginatedTable` + `defaultTransform` + 0-based 请求/1-based 响应分页 + `TableHeaderOperation`）。筛选条 10+ 字段走 **NCollapse 折叠**（Q11，钉 keyword+status、其余「更多」），金额区间双 `NInputNumber`、时间 `NDatePicker` range、status 多选。
- **枚举来源 = 硬编码**（Q10）：~9 组领域枚举（paymentStatus / payMode / accessType / paymentChannel / refundStatus / auditType / logType / operationType / result）进常量，手写 `Option<number, I18nKey>[]`（整数枚举范式，不走 `transformRecordToOption`）。**`businessSystemName` 例外 = 数据驱动**，筛选用 `NInput`（日后或加字典）。
- **两日志页**（通道交互日志 PaymentLog / 订单操作记录 OperationLog）= 纯筛选只读列表，无详情抽屉、无写。
- **仪表盘 = 单页多区块**（Q2 同期做）：8 widget（tier-1 ×4 + tier-2 ×4）全 ECharts（照 `src/views/home/modules/*-chart.vue` + `src/hooks/common/echarts.ts` 的 `useEcharts`）；**widget 经 `usePaymentStats` store 消费、不直连端点**（Q9，见 [ADR-0002](docs/adr/0002-payment-stats-store-seam.md)，留跨服务聚合余地）。chart 选型按数据形态：overview=折线趋势、status-distribution=饼、gateway-health=表+成功率条、operations-audit=表、by-business-system/by-channel/operations-activity=条形、anomalies=列表。
- **金额展示**：`formatMoney`（`¥1,234.56`，千分位+2 位小数），列表/详情/仪表盘统一；假设整数分、接真核对。
- **i18n**：`route.payment` + 5 叶子键 + `page.payment.*` 三处同步（gen-route → `zh-cn.ts`/`en-us.ts` → `app.d.ts` `Schema.page.payment` 子树）。
- **延后项**：① **写按钮权限门控本次不接**（Q14，用户将统一处理一次；audit/resend 按钮先无门控渲染）；② **bank-query 按钮不渲染**（Q4，admin#46 条件性，做到时找 admin 确认）；③ payment wire 字段核对（金额单位、审核 reason 名）接真时做。
- **术语**：payment 子域术语已落 glossary（PaymentOrder/RefundOrder/PaymentLog/OperationLog/退款审核/通知重发/主动查行/生命周期）。

### 2026-08-12 T1 支付订单列表页 ✅（#43 / spec #42，tracer bullet + 地基）

落 payment 整套地基 + 支付订单列表页（复用 SystemManage 整套 CRUD 范式：`useNaivePaginatedTable` + `defaultTransform` + 0-based 分页）。

- **实现时核对修正的两处预设**（grilling 时未见真契约，本片接 admin#37/#38 契约后厘清）：
  - **枚举是字符串（Java enum 名）非整数**：payment 域枚举经 admin BFF 原值透传（`'PENDING'`/`'WECHAT'`/`'H5'`/`'ICBC'` …），与 SystemManage 的整数枚举不同。故 `src/constants/payment.ts` 用 `Record<枚举名联合, I18nKey>` + `transformRecordToOption`（string 键无 `Object.entries` 压 number 问题）。9 组闭合枚举（paymentStatus/payMode/accessType/paymentChannel/refundStatus/auditType/logType/operationType/operationTargetType）；`OperationLog.result` 是自由 token、非闭合，不建 options（T4 走文本输入）。
  - **金额单位 = 整数分（payment `Long amount`，BFF 透传不换算）**：`formatMoney(cents)` ÷100 → `¥1,234.56`（千分位 + 2 位小数），列表/详情/仪表盘统一；金额筛选 UI 用元（NInputNumber precision=2）、提交 `Math.round(yuan*100)` 转分。**唯一保留核对项**（spec 已言）：payment 服务侧 wire 字段接真时复核金额单位 / 审核 reason 名。
- **statuses 多选参数绑定**：BFF query record `statuses: List<String>`，axios qs 默认 indices 格式 `statuses[0]=..&statuses[1]=..` 经 curl 实测 Spring 能正确绑定（全量筛选集 HTTP 500 非 400，500 纯属 payment 不可达）。
- **`payment_channel` 中间路由键**：三级目录 `src/views/payment/channel/log/` 经 gen-route 产出 `payment_channel_log` 叶子键 + **自动中间键 `payment_channel`**（elegant-router 层级分隔符）。`route: Record<I18nRouteKey,string>` 要求所有键翻译——zh/en 均补 `payment_channel`（动态菜单不显示它，仅满足类型 + `fetchIsRouteExist`）。
- **`TableHeaderOperation` 加 `hideAdd` prop**（镜像既有 `hideDelete`）：payment 订单列表只读（订单非 admin 创建），`:hide-add + :hide-delete` 只留刷新 + 列设置。最小框架扩展、升级债可控。
- **NCollapse 筛选**：钉「支付订单号 + 状态(多选)」常驻，其余 8 字段（业务订单号/业务系统/支付方式/接入类型/支付通道/金额区间/创建时间区间/支付时间区间）收入默认折叠的「更多筛选」。时间 NDatePicker datetimerange → ISO 本地串 `YYYY-MM-DDTHH:mm:ss`（后端 LocalDateTime）。
- **详情入口钩子**：点行「详情」开右抽屉（`width=720` 占位本体），抽屉本体（只读全字段 + 生命周期 NTimeline + 通知重发）归 T2 / #44。
- **文件**：`src/typings/api/payment.d.ts`（`Api.Payment` 命名空间 + 9 枚举字面量联合 + PaymentOrderSummary/SearchParams/Filter）、`src/service/api/payment.ts`（订单列表端点 + barrel 导出，模块头记全端点面）、`src/constants/payment.ts`（9 枚举）、`src/utils/common.ts`（+`formatMoney`）、`src/views/payment/{order(全量),stats,refund,channel/log,operation}(1 全 + 4 stub)`、`src/components/advanced/table-header-operation.vue`（+`hideAdd`）、i18n 三处（zh/en/app.d.ts `Schema.page.payment`）+ route 6 键。
- **E2E（headless chromium + page.route mock 隔离验前端，20/20）**：登录→sidebar 露「支付管理」(V13 `/menus/my`)→`/payment/order` 渲染→NCollapse 折叠/展开→金额 `¥1,234.56`/`¥1.00`/`¥99,999.99`→状态/payMode 翻译→`*No` 按 string→初始请求 `page=0&size=10`（0-based）→搜索带 `paymentOrderNo`→翻第二页 `page=1`（0-based 页码，非 item offset）→状态多选 5 枚举→详情抽屉钩子开。**真实数据往返被后端端口错位阻塞**：admin BFF `payment.base-url` 默认 `http://localhost:8082`（down），payment 实跑 `18081`——属后端配置项（admin#38/T2 PaymentClient+config），非前端缺陷；前端 + BFF 参数绑定已全验证。typecheck + lint 干净。
- **延后**：T2 退款订单 + 详情抽屉本体 + 退款审核 / T3 通道日志 / T4 操作记录 / T5 通知重发 / T6+T7 统计仪表盘；写按钮权限门控（spec Q14 统一处理）。

### 2026-08-11 批量删除：manage 页保留、应用页隐藏（grilling 定稿）

- **背景**：四个列表页（user/role/menu/app）因共用 Soybean 原生 `TableHeaderOperation` 组件，默认都带「批量删除」按钮。后端**无任何批量删除端点**——user/role/menu 的批量删除是前端 `handleBatchDelete` for 循环**串行**调单删 `DELETE /{resource}/{id}` 模拟（非原子、部分失败留中间态），带 count/partial toast（自加 i18n key `batchDeleteSuccess/Partial`）。应用页本就无删除（后端 `/apps` 无 DELETE），按钮靠 `:disabled-delete="true"` 永久灰掉。
- **域澄清**：当前 UI 的「批量删除」是**幻象**——非领域意义上的原子批量操作，而是 N 次独立单删 HTTP 请求的 UI 包装（无事务、部分失败有中间态）。保留即接受这个语义。
- **决策**：① **user/role/menu 保留**批量删除现状（循环串行单删，非原子可接受——"既然已经能用就不删"，低频 RBAC 清理够用，**不提**后端批量端点 REQ）；② **应用页隐藏**批量删除按钮（应用无删除语义，灰按钮是 UI 噪音）；③ 实现 = 给 `TableHeaderOperation` 加 `hideDelete?: boolean` prop（默认 `false` 保持 Soybean 兼容、`v-if="!hideDelete"` 门控批量删除按钮），应用页 `:hide-delete="true"`——最小改动、升级债可控（升级只合一个 prop 的 diff）。`disabledDelete` prop 保留（Soybean 对齐、未来可用）。
- **文件**：`src/components/advanced/table-header-operation.vue`（+`hideDelete` prop + `v-if` 门控）、`src/views/app/list/index.vue`（`:disabled-delete="true"`→`:hide-delete="true"`）。验证：typecheck + lint 干净 + 浏览器点测（应用页按钮消失 / 用户页按钮+selection 列俱在，新 prop 两条路径均覆盖）。

### 2026-08-01 动态菜单 grilling（#11 下游实现：翻 `VITE_AUTH_ROUTE_MODE=dynamic`）

> 前置：#11 决策（前端转换器方向）已 CLOSED；REQ-8 已交付——`/auth/current.menus` 每节点带全量 Soybean 路由生成器字段（`component` 已是 `layout.base$view.x`/`view.x` 格式、`routeName` 与 elegant-router 生成名逐字一致）。本次 grill = 动态路由上线前的开放决策点。

- **① home + 菜单端点拆分 = REQ-13（用户拍板：拆分，演进自「/auth/current 补 home」）**：Soybean dynamic 模式 `getUserRoutes` 需返回 `{routes, home}`，而 `/auth/current` 不含 home；讨论中用户提出并确认更彻底的方案——**菜单从 `/auth/current` 拆出，职责按「身份 vs 导航」划界**：
  - **`GET /menus/my`（新端点）= 我的导航**：返回 `{home, menus}`——`menus` 按角色裁剪的可见菜单树（同现 `/auth/current.menus` 内容），`home: string | null` = sortOrder 最小角色的非空 home（全空 → null）。**权限：登录即可**（不能要 `admin:menu:read`，普通用户也要拉导航）。形状直接贴 Soybean `UserRoute`（`{routes, home}`），`fetchGetUserRoutes` 直通零封装；后端算 menus 时本已拿到角色，顺手推导 home 零额外成本。**只返回启用（status=1）菜单**（用户定：消费面过滤是服务端职责、属本 REQ 条款，实测现 `/auth/current.menus` 不过滤 status=0 须一并修；directory 禁用则子树不下发）。管理面 `/menus`（分页）、`/menus/tree` 不受影响——维护用途须见禁用项，保持全量。前端转换器信任契约、不再过滤 status。
  - **`/auth/current` = 身份与权限**：`{user, roleCodes, permissions}`，**移除 `menus` 字段**（breaking；前端是唯一消费者，同步改）。roleCodes/permissions 不拆（身份 claims，非资源）。
  - **动机**：① 消费 REQ-10 已交付的角色 `home` 字段（不消费=死字段）；② home 与 menus 同一消费场景（路由系统），内聚；③ 拆开消除「`fetchGetUserRoutes` 再调一次 `/auth/current`」的重复请求与语义牵强——auth store 调 `/auth/current`、route store 调 `/menus/my`，各取所需。
  - **前端兜底**：home 为 null / 指向本地不存在路由时，fallback = 排序后第一个可见叶子菜单（menuType=2）routeName——任何角色配置下不死。（否决「纯前端推导 home」：角色 home 白做；否决「写死 home」：未分配 home 菜单时 `/` 重定向 404。）
  - **代价**：后端删字段 + 集成测试调整；架构仓库 `docs/starters/admin.md` 契约快照需同步。
- **② `isStaticSuper` 判定去模式条件（翻模式的硬 blocker，实测确认）**：实测超管 `/auth/current` 返回 `permissions: []`（后端 bypass 语义），而 `isStaticSuper` 原判定带 `VITE_AUTH_ROUTE_MODE === 'static'` 条件——翻 dynamic 后恒 false → T2 接进 `hasAuth` 的超管放行失效、写按钮全灭。决策：判定改为 `roles.includes(VITE_STATIC_SUPER_ROLE)`（两种模式通用），名字保留（最小 diff；dynamic 下它专职按钮权限放行，加注释）。（否决「后端给超管下发全量 permissions」：违背 bypass 设计。）
- **③ 菜单显示名兜底 = i18nKey 有效才用，否则 `menuName`（用户拍板 b 并泛化）**：Soybean 渲染规则 `label = i18nKey ? $t(i18nKey) : title`——dynamic 接上后，运营改 `menuName` 若 i18nKey 仍在则显示不变；且弹窗自动派生 `i18nKey=route.{routeName}`，新菜单 locales 缺键时导航显示 `route.xxx` 原文（vue-i18n 缺键行为）。决策：转换器检查 i18nKey 有效性（zh/en 均缺键 → 置 null）——**「不管是没配，还是配了读不到，就用菜单名称」**（用户原话）。种子/规范配置菜单行为不变（走翻译），缺键新菜单显示中文名不显示原文。转换器是本方代码，零升级债。
- **④ 实现事实（grilling 告知项，无决策空间）**：`fetchGetConstantRoutes` 本地化（不发请求，返回本地内建 constant routes——login/403/404/500/iframe-page 是前端内建页，避免每次启动 404+toast）；`fetchIsRouteExist` 本地实现（查完整生成路由表，区分 403/404）；菜单变更生效时机 = 重新登录/刷新（Soybean 固有，会话内不热更）；static 代码全保留、env 翻回即回退；route store 与守卫零改动（转换器放 route store 共享模块，service 层三适配）。
- **✅ spec 已发布（2026-08-01，via `/to-spec`）**：[#20](https://github.com/ZhangColin/aieducenter-admin-web/issues/20)（`ready-for-agent`）= 动态菜单（dynamic 路由模式）前端实现。测试 seam = 手动 E2E（同 spec #1/#13）。**阻塞边 = [REQ-13](https://github.com/ZhangColin/aieducenter-admin/issues/20)（✅ 后端已交付实测，2026-08-02，见「需服务端支持」REQ-13 条目）**；不依赖后端的（`isStaticSuper` 修复、转换器、service 三适配）可在 static 模式下先合入、零行为变化，翻 env 是最后一步。已 grep 核实无任何代码消费 `/auth/current.menus`——后端删字段无切换协调风险。**✅ 已拆 3 ticket（2026-08-02，via `/to-tickets`，全部 `ready-for-agent`）**：[#21](https://github.com/ZhangColin/aieducenter-admin-web/issues/21) T1 dynamic 前置适配（frontier，static 零行为变化）｜[#22](https://github.com/ZhangColin/aieducenter-admin-web/issues/22) T2 动态路由闭环（翻 env，blocked by #21）｜[#23](https://github.com/ZhangColin/aieducenter-admin-web/issues/23) T3 非超管裁剪与配置行为全矩阵 + 菜单页 toast「更新成功，刷新页面后导航生效」（blocked by #22）。下一步 `/implement` 从 #21 起，清 context 逐个做。
  - **✅ #21 已交付（2026-08-02，commit `186c730`）**：isStaticSuper 去模式条件（auth store，两模式通用）；`fetchGetConstantRoutes`/`fetchIsRouteExist` 本地化不发请求（前者=本地生成路由表 meta.constant 部分，后者=查本地完整路由表）；转换器 `transformBackendMenuToMenuRoutes` + `getValidI18nKey`（经 `locales.isI18nKeyExist`，按注册语言迭代非硬编码）+ `getHomeRouteKeyByBackendMenus` 兜底链 全在 route `shared.ts`（route store/守卫 upstream 逐字未动）；类型 `CurrentUser` 去 menus + 新增 `Api.Route.MyNavigation`。验证：typecheck/lint/build 干净 + headless 浏览器 static 回归 16/16（登录/导航/三管理页写按钮/分配弹窗回显/刷新深链）+ 双轴 code-review（spec 零缺漏）。`fetchGetUserRoutes` 接 `/menus/my` 属 #22。
  - **✅ #22 已交付（2026-08-02，commit `f48e90e`）**：`fetchGetUserRoutes` 改打 `GET /menus/my`（service 层直通映射 `{home, menus}`→`UserRoute`；home 兜底链为空 → `?? VITE_ROUTE_HOME` 类型适配——与 ROOT_ROUTE 默认重定向同源，行为不变、决策 5 不违背，双轴 review 辨析后保留）；`.env` 翻 `VITE_AUTH_ROUTE_MODE=dynamic`（`.env.prod` 未覆盖随 `.env` 同生效；static 代码全保留、翻回即整体回退）。验证：dynamic 超管矩阵全绿（登录落 /home、`/`→/home、导航由 /menus/my 驱动且顺序图标随后端、三管理页写按钮齐全、URL 直达 + F5 恢复、改排序/图标 F5 反映——菜单名不反映 = i18nKey 有效走翻译属决策 6、禁用叶子 F5 消失→恢复）+ typecheck/lint/build 干净。剩 [#23](https://github.com/ZhangColin/aieducenter-admin-web/issues/23)（非超管裁剪与配置行为全矩阵 + 菜单页 toast）。**注意**：后端 CORS 只放行 3001——E2E 前确认 dev server 落 3001（残留旧 server 会抢占致 vite 顺延 3002、登录 403）。
  - **✅ #23 已交付（2026-08-02，commit `543ed31` + 复查调整 `2038b0c`）**：① 菜单页提交 toast 通用「更新成功/新增成功」→ 专属文案（edit=「更新成功，刷新页面后导航生效」`page.manage.menu.updateSuccess`、add/addChild=「新增成功，刷新页面后导航生效」`page.manage.menu.addSuccess`——首版单键同文案，双轴 review 指出 add 语义错位，**用户拍板拆双键**（`2038b0c`，headless 实测新增 toast 正确）；两键均手写 Schema 三处同步）；② 非超管全矩阵 E2E 绿（playwright-core headless chromium 驱动，脚本在 /tmp 不入仓）：curl 造角色（菜单子集 首页+系统管理>用户管理 + home=manage_user）+ 用户 → 登录落 /manage/user、导航只见分配菜单、/manage/role|menu 直达 403、/nonexistent 404、`/`→/manage/user；角色 home 置 null → 兜底落第一个可见叶子 /home；禁用叶子 manage_user → F5 导航消失 + 直达 403（空目录 manage 一并消失）；禁用 directory manage → 子树整体消失；i18nKey 缺键菜单导航显示 menuName；hideInMenu 导航不可见 URL 可达；sortOrder 0 升最前 + 换图标 F5 反映；toast zh/en 双验；env 翻 static 静态导航恢复 → 翻回 dynamic；测试数据全清（含 DB 清孤儿关联，见 REQ-14）。typecheck/lint 干净。
    - **⚠️ routeName 的 `_` = elegant-router 层级分隔符（E2E 踩坑后实证定案，2026-08-02；2026-08-03 澄清）**：① **静态侧（src/views 文件式生成）实证**：`src/views/e2e_test/index.vue` 经 `pnpm gen-route` 生成 `e2e`(layout.base, /e2e) → `e2e_test`(view, /e2e/test) **两级嵌套、自动补父级、正常工作**。② **动态侧定案（2026-08-03）：不做自动拆层级处理**——菜单维护成什么样就用什么样，不自动拆。在代码层面看似简化了，但离开代码层面反而让人费解。后缀仍为 elegant-router 原生分隔符含义（作用于静态侧文件式路由生成），动态侧不管。
    - **⚠️ 后端菜单无独立启停端点**：`PUT /menus/{id}/status` 不存在（500），status 经全量 `PUT /menus/{id}` 切换（service 层注释早有记载，curl 造数据时易忘）。

### 2026-08-01 列表空白真根因 + 框架可升级审计 + 菜单树形（re-verbatim 一轮）

- **列表空白真根因 = 复制时漏了 `class="sm:h-full"`**（非 HMR/后端/SW，此前曾误判）：Soybean 三个 manage 页 NDataTable 都成对带 `:flex-height="!appStore.isMobile"` + `class="sm:h-full"`；我们只抄了 flex-height。漏 sm:h-full → 表格没 100% 高度 → flex-height 算不出父高度 → 表体塌 0（实测 `.n-card__content` 高 0、`.n-data-table`≈81px 只剩表头），数据行在 DOM 却被裁、肉眼空（分页仍显示"共 X 条"、无空占位）。**修法：恢复 verbatim（flex-height + sm:h-full 都补上，三个页面）。** 详见 memory `flex-height-needs-sm-h-full`。
- **框架可升级性 = 强**（4-agent 对 `soybean-admin/example` 全量审计确认）：共享依赖**零版本漂移**（naive-ui 2.44.1 / vue 3.5.34 / vite 8.0.12 / @elegant-router 0.3.8 / pinia 3.0.4 / 全部 @sa/* workspace:* 与 Soybean 一致）；承重脚手架逐字节一致（`global-content`/`base-layout` md5 校验同；@sa/axios|hooks|utils|color|uno-preset pristine；@sa/materials 仅差手机端 sider `w-0` 样式）。**合并债核实（2026-08-01 纠正，此前基于 example 分支误判）**：升级 merge 的是 `soybean/main`。`filterRoutesByDev`（route `shared.ts`/`index.ts`）、`global-tab` 滚轮横向滚——这两处 main **本就有、与我方逐字一致**（`diff main` 零差异；example 是精简演示分支、删了这些，故拿 example 对比会误判为债。**勿动**——动了反而破坏与 main 的 verbatim、制造真冲突）。唯一真分歧 = `simple-git-hooks`（我方 `pre-commit: lint` / `pre-push: typecheck`；main 严格档 `commit-msg: git-commit-verify` + `pre-commit: typecheck && lint && fmt && git diff --exit-code`），属 package.json 配置、非 Soybean 源文件。**2026-08-01 用户定：保持宽松**（有意分歧——`pre-commit: lint` / `pre-push: typecheck`，commit 快、不强制 commit message 规范 / fmt；升级时 package.json 的 hooks 块手合几行即可，dependencies 本就要手合、hooks 非主要冲突源）。**升级步骤**：`git checkout -b upgrade/soybean-<tag>` → `git merge soybean/main <tag>` → 在已知冲突点重应用适配 → `pnpm install && pnpm gen-route` → `pnpm typecheck && pnpm lint && pnpm dev` 冒烟。Soybean 原文件尽量 verbatim、适配集中业务层（`src/service/api`、`src/typings`、`src/constants`、`src/store/modules/auth`、`defaultTransform`）——见 `soybean-reference-sources` memory。
- **菜单树形表格**（产品决策，有意与 Soybean v2.2.0 扁扁分页不同）：后端 `/menus/tree` **本就返回完整两级树**（叶子 parentId='60'，非"全 0"——**无需后端改**）；前端切 `fetchGetMenuTree` + `useNaiveTable`（去分页）+ NDataTable 树形 + **受控 `expanded-row-keys`**（computed 全父节点 key，默认全展开——`default-expand-all` 对异步加载数据不生效）+ 去 parentId 列。**后端不用提 issue**。
- **re-verbatim 一轮**（系统管理对齐 Soybean，typecheck+lint 干净）：✅ flex-height+sm:h-full / ✅ `getScrollX` 恢复（`table.ts`）+ 三页接 `scrollX`（去硬编码 `:scroll-x`）/ ✅ `on-change`→`on-update:value`（消弃用警告）/ ✅ 列设置 `column-setting-scroll` 滚动条 / ✅ 搜索栏 `NCollapse` 折叠（user+role）。✅ **i18n 已做**（详见下条「i18n re-verbatim 收尾」）。
- **菜单 flat vs tree 判定**：Soybean v2.2.0 example 的菜单页**也是扁平分页**（`useNaivePaginatedTable`+`remote`+parentId 列，无 tree/children）——我们改树形是新特性（用现成 `/menus/tree`），非对齐缺口、无需升 Soybean。

### 2026-08-01 i18n re-verbatim 收尾（系统管理全 $t，re-verbatim 最后一块）

- **范围**：系统管理 12 个组件（用户/角色/菜单 三列表 + 两搜索 + 菜单操作弹窗 + 用户/角色 操作抽屉 + 三个授权弹窗 + 重置密码弹窗）全走 `$t`；`constants/business.ts` 改 enum→i18n-key 模式。typecheck+lint 干净；2-agent review（语义 0 缺陷 + zh/en/Schema **130 键三方一致**）通过。
- **`page.manage.*` 双语 key（130 叶子键，zh+en）**：Soybean example 的 `page.manage.{common,role,user,menu}` **逐字搬入**（含未用的 `button/buttonCode/buttonDesc`，保留为升级对齐），外加**本项目专属键**（additive、升级安全）：`common.{enableSuccess,disableSuccess,batchDeleteSuccess/Partial}`（启停/批量 toast，`{count}/{success}/{fail}` 插值）、`role.{order,keyword,assignMenu,assignPermission,defaultHome,homePlaceholder,noMenuToAssign,superAdminCodeLocked,roleNameLengthRule,roleCodeRule,form.{order,keyword}}`、`user.{password,createdAt,keyword,resetPwd,assignRole,noRoleToAssign,newPassword,confirmPassword,userNameRule,pwdRule,form.{password,keyword,confirmPassword}}`、`menu.{routePathAuto,i18nKeyAuto}`、**新 `permission.{module.{user,role,menu,permission},noPermissionToAssign}`**（权限弹窗资源分组标签）。授权/重置成功 toast 统一复用 `common.updateSuccess`（Soybean 范式、少加键）。
- **⚠️ Schema 是手写类型（非 `typeof zhCN`）→ 加 i18n 键要改三处**：`src/typings/app.d.ts` 的 `App.I18n.Schema`（`page` 段 home 之后加 `manage` 子树）+ `zh-cn.ts` + `en-us.ts`。`I18nKey = GetI18nKey<Schema>` 严格派生 → 漏一处 typecheck 即红（zh/en 均按 `Schema` 校验，天然保证三方同构）。memory：`i18n-schema-handwritten-3-place-edit`。
- **整数枚举 vs Soybean 字符串**（既有后端分歧）：status/gender/menuType/iconType 后端整数（1/0、1/2），Soybean 字符串（'1'/'2'）。故 record 键用 `number`；**options 不用 `transformRecordToOption`**（它经 `Object.entries` 运行时把 number 键压成 string，破坏 NSelect 的 number v-model）——手写 `Option<number, I18nKey>[]`。search 的 NSelect **不用 `translateOptions`**（签名 `Option<string,...>` 拒 number）——改组件内 `computed(() => opts.map(o => ({...o, label: $t(o.label)})))` 渲染时翻译（语言切换可响应）。**不动** Soybean 的 `@/utils/common`。memory：`i18n-integer-enum-options`。
- **渲染范式（照搬 Soybean）**：性别/菜单类型列 = 内联 `tagMap: Record<number, ThemeColor>` + `$t(record[value])`（标签色不在 record 携带）；是/否单选 = `$t('common.yesOrNo.{yes,no}')`；NRadio/NSelect 选项 label = `$t(item.label)`。
- **⚠️ 一处保留的结构性分歧（待用户定）—— status 列用 NSwitch，Soybean 是只读 NTag+tagMap**：我方三列表 status 是内联启停开关（刻意 UX 增强、跨多轮已被接受），本轮**保留**只把 label 走 `$t`、未回退 NTag。要逐字对齐 Soybean（升级时此处必冲突）可回退——小改动。
- **次要文案向 verbatim 靠拢**：① NCard 标题 `XX管理` → Soybean `.title`（`XX列表`）；② 菜单弹窗部分提示型 placeholder（如 `如 manage_user…`）→ Soybean `form.*` 的 `请输入…`。非功能变化，回滚提示很容易。

### 2026-08-01 NSwitch 二次确认 + 清空权限/角色守卫修正

- **status 列加二次确认（防误操作）**：抽 `StatusSwitch` 子组件（`src/views/manage/components/status-switch.vue`，业务层、不污染 Soybean `common/`）。NaiveUI `NSwitch` 无前置拦截钩子（点即乐观切换），故用受控副本 `inner` 接管：点击→乐观切到目标态 + `NPopconfirm` 弹「禁用?」→确认才发请求（回滚乐观、父 `getData` 驱动同步）→取消/点外自动回滚。三列表 status 列接入。
- **清空权限/角色 = 前端过期守卫 bug（非后端 REQ）**：核实后端 `AssignPermissionsCommand`/`AssignRolesCommand` **均已去 `@NotEmpty`**（REQ-10 已修，服务层 clear-then-add，空集=清空；破窗号由后端守卫保留 SUPER_ADMIN）。但我方 `permission-auth-modal` + `role-auth-modal` 仍带过期空集守卫（`if(checks.length===0) return` + 按钮 disabled）→ 实际无法清空。已去两处守卫（对齐 `menu-auth-modal`，三者一致）。
- **email 搜索 = 无 gap（不提 REQ）**：`AdminUserQuery.keyword` 已 `blurry=username,nickname,email` 覆盖邮箱搜索，前后端一致用 keyword；Soybean 的独立邮箱搜索项仅 parity，功能已覆盖，不值得加键/字段。

- **路由模式 = static**（T1）：`VITE_AUTH_ROUTE_MODE=static`，登录→拉 `/auth/current`→按 roles 过滤本地静态路由→`home`。**不碰后端动态菜单**（菜单→ElegantRoute 转换 + icon + DIVIDER = 后续 ticket，决策见 #11）。理由：tracer bullet——`src/views` 现仅 `home`+`_builtin`，static 天然即"登录→home"，别把最难的菜单适配混进登录。
- **env 目标值**：`VITE_SERVICE_BASE_URL=http://localhost:8081/api/admin`（前缀放 baseURL，api 路径保持 `/auth/login`；Vite 反代剥 `/proxy-default`）、`VITE_SERVICE_SUCCESS_CODE=200`、`VITE_SERVICE_LOGOUT_CODES=401`、`VITE_AUTH_ROUTE_MODE=static`、`VITE_STATIC_SUPER_ROLE=SUPER_ADMIN`、`VITE_HTTP_PROXY=Y`、`VITE_SERVICE_EXPIRED_TOKEN_CODES=`（空，Sa-Token 无 refresh）。
- **UserInfo 映射**（路由硬依赖 userId+roles）：`/auth/current` 的 `{user,roleCodes,permissions,menus}` → Soybean auth store `{userId:String(user.id), userName:user.nickname, roles:roleCodes, buttons:permissions}`（`menus` static 模式暂不用、类型保留；`id` 用 String 防 Long 精度丢失）。
- **错误处理在 `onError`，不在 `onBackendFail`**（⚠️ 反直觉，详见 [ADR-0001](docs/adr/0001-error-handling-in-onerror.md)）：后端约定 HTTP 状态码即 `code`，业务错以 **HTTP 非 2xx** 返回 → 走 axios error 拦截器；Soybean 的 `onBackendFail`（仅 HTTP 2xx 触发）对我们是**死代码**。
- **登录接口的 401 = 账密错，不登出**：靠 endpoint 区分（`/auth/login` 的 401 落 toast；受保护接口的 401 才算会话过期）。**遗留**：会话过期自动登出尚未接（logoutCodes 在死代码 onBackendFail 里）——刷新可恢复，待 follow-up 挪进 onError。
- **登录失败不 `resetStore`**：原 `login()` 失败分支调 `resetStore` 会重置路由、冲掉 toast；改为只弹 toast。
- **header 退出走 `authStore.logout()`**（原直调 `resetStore`，不发后端 `/auth/logout`）。
- **删 refreshToken 整条死代码**（`fetchRefreshToken`/`handleExpiredRequest`）。
- **T2+ 安排 = example 移植路线（2026-07-31，`/grill-with-docs` 定稿）**：决定移植 Soybean `example` 分支的系统管理 UI，而非从零搭（用户拍板：T2 用户页打头炮；菜单页等 #11）。
  - **example 的价值 = UI 外壳 + CRUD hook 用法范式**，**不是**现成 CRUD——其 service 层仅 6 个 GET 查询、增删改全 `// request` 占位，且打的是 Soybean mock（`/systemManage/*` + Soybean DTO），对我们完全无用。**读写 API 全部前端自写**对接 `/api/admin`。
  - **基座已自带 CRUD 地基**（Soybean 精简 main 只删演示页、未删框架）：`src/hooks/common/table.ts`（`useNaivePaginatedTable`/`useTableOperate`/`defaultTransform`）、`form.ts`、`src/components/advanced/table-{header-operation,column-setting}.vue`、`@sa/hooks` `useTable`。移植**只搬页面外壳**。
  - **请求层适配 T1 已完成**（`code==="200"`、unwrap `data`、`onError` 读 `message`）；**唯一**新增契约适配点 = `defaultTransform`（分页 `records/current`→`items/page`、请求 0-based）+ 实体 DTO 字段映射（userName→username 等）+ status 字符串↔数字（Soybean `'1'/'2'` ↔ 我们 `1/0`，**且禁用值语义相反**：Soybean 2=禁用、我们 0=禁用）。
  - **菜单管理页完整移植 Soybean（2026-07-31 决策反转，覆盖上条）**：此前曾定「重写不移植、按 `MenuResponse` 重写」——**作废**。用户拍板 Soybean 系统管理（用户/角色/菜单）**完整移植**，一切功能以 Soybean 实现为准，后端缺啥补啥——菜单按 [REQ-8](https://github.com/ZhangColin/aieducenter-admin/issues/11) 扩成路由生成器模型（`component`/`routeName`/`i18nKey`/`keepAlive`/`hideInMenu`/`buttons` 等）。详见 `docs/backend-requirements/REQ-8-soybean-system-mgmt-full-alignment.md`。
  - **排期**：T2 = tracer bullet **用户管理页**（搬外壳 + 自写 CRUD + 改 `defaultTransform`，一页端到端验证整套适配范式）✅ → T3 = 角色管理页（复用范式 + 两个授权弹窗接 `menuIds`/`permissionCodes`）✅ → **菜单页 = 完整移植 Soybean**（2026-07-31 反转，不再 defer #11）：随 [REQ-8](https://github.com/ZhangColin/aieducenter-admin/issues/11) 后端扩字段交付后落地；当前 static 模式下可先搬 UI 外壳。
  - **前端实现 spec 已发布（2026-07-31，via `/to-spec`）**：[issue #13](https://github.com/ZhangColin/aieducenter-admin-web/issues/13)（`ready-for-agent`）= Soybean 系统管理完整移植（用户/角色/菜单）。分期：**Phase 1** = 用户分配角色（不卡后端、现可做）；**Phase 2**（blocked-by 后端 #11）= 菜单页 + 用户 gender/列表角色列/手机号搜索 + 角色 status/home；审计已撤（非 Soybean 需求，单独待办 #19）；按钮权限（REQ-9）存疑延后、未入 spec。测试 seam = 手动 E2E（同 spec #1）。下一步 `/to-tickets` 拆 tracer-bullet（Phase 2 各 ticket blocking edge 挂 #11）。**✅ 已拆（2026-07-31，via `/to-tickets`）**：[#14](https://github.com/ZhangColin/aieducenter-admin-web/issues/14) T1 用户分配角色（frontier，不阻塞）｜[#15](https://github.com/ZhangColin/aieducenter-admin-web/issues/15) T2 菜单页｜[#16](https://github.com/ZhangColin/aieducenter-admin-web/issues/16) T3 用户字段｜[#17](https://github.com/ZhangColin/aieducenter-admin-web/issues/17) T4 角色字段｜[#18](https://github.com/ZhangColin/aieducenter-admin-web/issues/18) T5 审计列——审计非 Soybean 需求，#18 已关、单独待办 #19；T2~T4 blocked-by 后端 `aieducenter-admin#11`（跨仓文字引用，用户通知后解锁）。父 spec = #13。下一步：`/implement` 从 #14 起，清 context 逐个做。
  - **后端阻塞不变**（[REQ-4]/[REQ-5]/[REQ-6]/[REQ-7]），仅基座从 Next.js 换 Soybean；UI 全做、读接通、被挡写操作给 toast + 跟 REQ。
  - **example 升格为长期 UI/CRUD 模式参考**（不只本次）：后续部门/岗位/财务页继续以其为模板。

- **T2 用户管理页 ✅（2026-07-31，tracer bullet）** — 首页端到端验证整套 Soybean 适配范式。搬 `example` 分支用户页外壳（`src/views/manage/user/`：index.tsx + user-search + user-operate-drawer + user-reset-pwd-modal），自写 CRUD 接 `/api/admin/users`（`src/service/api/system-manage.ts` 6 函数：list/create/update/delete/status/password），改 `defaultTransform` 适配后端分页。
  - **范式落地（T3/部门/岗位/财务复用）**：① `defaultTransform` 读 `PageResponse{items,total,page,size}`（旧 `records/current` 作废）、`total` 为 Long→string 故 `Number()` 兜底；② 请求 `page` **0-based**（`onPaginationParamsChange` 里 `params.page-1`），响应 `page` 1-based；③ `status` 后端运行时是**整数**（1=激活/0=禁用），**OpenAPI 标 string 实为误导**——按整数对接，`PUT /users/{id}/status?status=0|1` 实测接受整数；④ DTO 字段对齐（username/nickname/email/phone，无 gender）。
  - **类型**：新增 `Api.Common.PageResponse<T>`、`Api.SystemManage.{User,UserSearchParams,UserCreateCommand,UserUpdateCommand,ResetPasswordCommand}`（`src/typings/api/`）；`User = Api.Auth.AdminUser`（同构、单一来源）。**POST /users 返回新 id 字符串**（非 User 对象）。
  - **权限门控范式（重要）**：SUPER_ADMIN 后端 bypass、`/auth/current` 返回 `permissions: []` → 原 `useAuth().hasAuth(code)` 对超管恒 false（写按钮全隐）。已修 `src/hooks/business/auth.ts`：`hasAuth` 命中 `isStaticSuper` 直接放行。此后全页 `v-if="hasAuth('admin:*:write')"` 即正确（超管见全部、非超管按权限码）。**路由级仍按 `meta.roles`/static guard**，本页未设 `roles`（所有登录用户可见菜单），写操作靠按钮级 `hasAuth` 兜底。
  - **保护**：删除/启停对 `breakGlass`（内置 admin）禁用、启停对当前登录用户禁用（防自锁）。
  - **E2E（curl 直连后端全链路）**：list/search/分页/创建/编辑/启停(整数)/重置密码(重置后用新密码登录成功)/删除 全通过；**REQ-5 软删已修并验证**（删除后 GET 404、list total 0）。
  - **defer**：分配角色 = T4（被 REQ-4 回显 + REQ-7 写入阻塞，未做）。
  - 文件：`src/views/manage/user/**`、`src/service/api/system-manage.ts`、`src/typings/api/{common,system-manage}.d.ts`、`src/constants/business.ts`、改 `src/hooks/{common/table,business/auth}.ts`、路由 + zh/en i18n（`manage`/`manage_user`）。

> ⚠️ 下述 2026-07-28 决策为 **Next.js 时代**产物：栈无关的（对接范围 RBAC、dev 端口 3001、Dashboard 不动、权限并入角色）仍有效；栈相关（middleware 守卫 / cookie 镜像 / 反代收敛于 `next.config`）**已作废**。

- **对接范围 = RBAC 运营核心**（2026-07-28）。本次只打通后端已支持的 `auth/menus/roles/users/permissions`：路由守卫 + 退出按钮 + sidebar 读后端真 menus + 3 个管理页（用户/角色/菜单，权限并入角色）。Dashboard 不动、部门/岗位/财务留到下一批等服务端接口。理由：后端当前只支撑这五个域，且这正是架构文档「必修现状」的核心。
- **路由守卫 = Middleware + token 镜像 cookie**（2026-07-28）。前端登录成功后将 token 镜像写入 cookie（非 httpOnly，`admin_token`，与 localStorage 并存），logout 清两边；middleware（edge）读 cookie 判断未登录则 redirect `/`，matcher 扩展到页面路由。发请求仍走 `Authorization: Bearer` header，cookie 仅作守卫存在性判断。理由：SSR 前拦截、刷新无闪烁；token 本就在 localStorage，镜像 cookie 不新增 XSS 暴露面。
- **反代只留 middleware**（2026-07-28）。删 `next.config.mjs` 的 rewrites，`/api/*` 反代与页面守卫统一在 `middleware.ts`。理由：消除重复，middleware 同时承担反代 + 守卫两职。
- **dev 端口 = 3001**（2026-07-28）。保持 package.json 的 3001（后端 CORS 仅放行 3001），修正 CLAUDE.md 的 10002 笔误。理由：前后端零改动即可连通；10002 是文档笔误。
- **Dashboard 本次不动**（2026-07-28）。范围聚焦 RBAC 核心，dashboard 保留现有 mock，不碰。⚠️ 偏离架构「必修现状」之「dashboard 接真数据」，留待后端提供 dashboard 聚合接口后再做。
- **权限管理并入角色管理**（2026-07-28）。后端权限仅只读 GET /permissions（无 write）、权限是系统预定义码，不单独建权限页；权限码字典在「角色管理 → 分配权限」里展示勾选。理由：权限码本质是给角色分配用的，单独只读页价值低。故 RBAC 核心实际为 3 个独立页（用户/角色/菜单）+ 权限并入角色。
- **前端实现 spec 已发布**（2026-07-28，via `/to-spec`）：https://github.com/ZhangColin/aieducenter-admin-web/issues/1 （标签 `ready-for-agent`）= RBAC 运营核心对接（不阻塞部分）。测试 seam = 手动端到端验证（不引入测试框架）。待 agent 接手实现。
- **spec 已拆为 4 个 tracer-bullet ticket**（2026-07-28，via `/to-tickets`，全部 `ready-for-agent`，GitHub 原生 blocking 已连）：
  - [#2 T1] 受守卫登录闭环 + 退出 + header 真实用户（无 blocker = **frontier**）
  - [#3 T2] 用户管理页 + 首建 useCan ← blocked by #2
  - [#4 T3] 角色管理页（含分配权限/菜单）← blocked by #3 — **主体已实现 ✅（2026-07-30）**，分配权限/菜单被后端 [REQ-7](https://github.com/ZhangColin/aieducenter-admin/issues/9) 阻塞
  - [#5 T4] 用户分配角色（回显）← blocked by #3 + 后端 [REQ-4](https://github.com/ZhangColin/aieducenter-admin/issues/3) + [REQ-7](https://github.com/ZhangColin/aieducenter-admin/issues/9)
  - 用 `/implement` 逐个做，每个做完清 context。
  - ⚠️ **上述 #2–#5 为 Next.js 时代 ticket，其代码实现已在 Soybean greenfield 重写（commit `4300f99`）时整体丢弃**（仅文档由 `001664c` 保留）。Soybean 时代重追：T1 = #12 ✅；T2/T3 重定义见上「example 移植路线」；菜单页并入 #11。

---

- **REQ-1 已交付并实测验证 ✅（2026-07-29）** — 后端 issues #4/#5/#6 CLOSED：`type` 字段（`8c982ad`）+ CRUD 支持 type + path 不变量（`8ce8730`）+ 树排序/祖先链补全/裁剪（`00f1893`）+ **决策 B：DIVIDER 不分配给角色、按结构自动纳入**（`5ee29ea`）。前端 curl 实测 `/auth/current` 与 `/menus` 每节点均带 `type`。**对 T3 的影响**：分配菜单勾选树须过滤 `type=3`(DIVIDER) 节点（不可分配，由后端按邻居可见性自动纳入）。
- **T3 角色管理页 ✅（2026-07-31，Soybean）** — 搬 `example` 角色页外壳 + 自写 CRUD/分配对接 `/api/admin/roles`，复用 T2 整套范式（`defaultTransform`、0-based 分页、`useAuth().hasAuth` 按钮门控）。列表/搜索(name/code/keyword)/分页/新增/编辑/删除 + SUPER_ADMIN 删除禁用 & 编辑 code 禁用 + 两个分配弹窗。⚠️ 上面那条「2026-07-30 主体实现」是 **Next.js 时代**记录（`<HasPermission>`/旧 `menu-tree.ts`），其实现已在 Soybean greenfield（`4300f99`）丢弃；本条为 Soybean 重做。
  - **角色特化**：① 角色无 status 字段（区别用户）——表格无状态列/开关；② 两个分配弹窗放**编辑抽屉内**（仅 edit 态，对齐 example 外壳，表格只留 编辑/删除）；③ 菜单勾选树按决策 B 过滤 DIVIDER（`menu-tree.ts`），`checkStrategy="all"`（菜单 GROUP 是后端真实实体，进 menuIds 往返，**非** permission 的 UI-only 分组）；权限弹窗按资源段分组（两级树）+ `checkStrategy="child"`（只发权限 code）；④ `RoleResponse` 自带 `menuIds`/`permissionCodes` → 回显直接用列表项，无需 GET 详情；⑤ 分配命令后端 `@NotEmpty`——勾选为空时禁用确认按钮（双保险）。
  - **写按钮门控**：`hasAuth('admin:role:write')`（超管 `isStaticSuper` 放行），按钮级 `disabled`（对齐 T2，非 `v-if`）；路由不设 `roles`（所有登录用户可见，读权限靠后端 + 按钮 hasAuth 兜底）。
  - **保护**：`SUPER_ADMIN_ROLE_CODE` 常量（`src/constants/business.ts`）驱动删除/选择禁用 + 编辑 code 禁用；后端亦 `SUPER_ADMIN_CANNOT_DELETE` 兜底（实测 403）。
  - **E2E（curl 直连 + 浏览器点测 3001）全通过**：list/search(中文)/分页/创建(TSID string id)/编辑/删除、SUPER_ADMIN 保护、**分配菜单**（回显 menuIds 含 GROUP）、**分配权限**（回显 permissionCodes，REQ-7 已修写路径打通）、@NotEmpty 空集 400、无效权限码 404。
  - 文件：`src/views/manage/role/**`（index + role-search / role-operate-drawer / menu-auth-modal / permission-auth-modal / menu-tree）、`src/service/api/system-manage.ts`（roles+menus+permissions 8 函数）、`src/typings/api/system-manage.d.ts`（Role/RoleSearchParams/RoleCreate/Update/AssignMenus/AssignPermissions/Permission）、`src/constants/business.ts`（SUPER_ADMIN_ROLE_CODE）、路由 + zh/en i18n（`manage_role`）。详见 issue admin-web#4。
- **用户分配角色 ✅（2026-07-31，#14 / spec #13 Phase 1）** — 用户编辑抽屉加「分配角色」入口（`RoleAuthModal` = NSelect multiple 弹窗），镜像角色页 auth-modal 范式：用户角色是**独立端点** `PUT /users/{id}/roles`，与资料保存 `PUT /users/{id}` 分离（对齐角色页「资料一个抽屉、分配走弹窗」结构，避免两端点耦合提交 / partial-fail）。
  - **回显**：取 `GET /users/{id}` 详情的 `roles`（列表/`/auth/current` 不含、REQ-4 `@JsonInclude(NON_NULL)`）→ `fetchGetUserDetail`；选项取角色列表（角色无 status = 启用集）→ `fetchGetAllRoles`（暂以 `GET /roles` 大页兜底，REQ-10 `/roles/all` 落地后替换）。弹窗每次打开 lazy 拉两份数据。
  - **约束**：空集禁提交（`@NotEmpty` 双保险，确认按钮 disabled）；break-glass（内置 admin）用户 SUPER_ADMIN 锁定不可移除——选项 `disabled`（NaiveUI `closable: !option.disabled` → 已选 tag 不可关闭、下拉不可取消），`load()` 并强制补回；后端亦 403 兜底。
  - **错误防误清**：详情拉取失败（全局 onError 已弹 message）即关弹窗——全量替换语义下，避免回显缺失被误以空/残集提交清掉既有角色。
  - **E2E（curl 直连 + 浏览器点测 3001）全通过**：分配多角色 → 回读回显精确、空集禁用、break-glass SUPER_ADMIN 锁定（tag closable=false）、@NotEmpty 400、break-glass 后端 403。
  - 文件：`src/views/manage/user/modules/role-auth-modal.vue`（新）+ `user-operate-drawer.vue`（接线，edit-only 分配按钮）、`src/service/api/system-manage.ts`（+`fetchGetUserDetail`/`fetchAssignUserRoles`/`fetchGetAllRoles`）、`src/typings/api/{system-manage,auth}.d.ts`（`UserRole`/`AssignUserRolesCommand`/`AdminUser.roles?`）。详见 issue admin-web#14。
- **菜单管理页 ✅（2026-08-01，#15 / spec #13 Phase 2）** — 完整移植 Soybean `example` 菜单模块（表格 + 操作弹窗）+ 自写 CRUD 接 admin 后端 `/api/admin/menus`，复用 T2/T3 整套范式。菜单模型 = Soybean 路由生成器（REQ-8 / 后端 #13 落地后开工）。
  - **模型对齐（推翻旧 nav-tree）**：`menuType` 用 directory(1)/menu(2) **2 值**（DIVIDER(3) 废弃）；`menuType`/`iconType`/`status` 后端**整数**（`BaseEnumSerializer`），`sortOrder`（后端名，Soybean 叫 `order`），`id`/`parentId` 字符串（Long），root = `parentId:null`（非 0），`query:[{key,value}]`。`Api.SystemManage.Menu` 全字段 + `MenuCommand`/`MenuSearchParams`。
  - **表格**：分页扁平形态（与 Soybean example 同构——flat `NDataTable` + parentId 列 + 「新增子菜单」，**非** tree 模式；remote 分页与客户端树不兼容）。类型/图标(iconify↔local)/状态/隐藏/父级/排序列。状态**无独立启停端点**——NSwitch 经全量 `PUT /menus/{id}` 切换（整行重建 `MenuCommand`）；目录行(`menuType===1`)显「新增子菜单」。`admin:menu:write` 按钮门控。
  - **弹窗**：Soybean 全字段（component 拆 layout/page、routePath/i18nKey 由 routeName 自动派生、keepAlive/constant/href/hideInMenu/activeMenu/multiTab/fixedIndexInTab/query）。**path 不变量前端兜底**（后端透传无不变量，旧 ADMIN_014_3 已废）：menu 类型 routePath 必填（由 routeName 派生）、directory 类型禁填（清空）。page 选项**前端自派生**——弹窗打开拉 `/menus/tree` 取全量 menuType=2 routeName（REQ-8 决策，本仓无 Soybean `/getAllPages`，同角色页 homeOptions 派生法）。**丢弃 REQ-9 buttons**（按 spec #13 延后）。
  - **保护**：删除有子菜单后端 403 `MENU_HAS_CHILDREN`（前端无 break-glass 菜单保护，任何无子菜单可删）；DIVIDER 清理：角色页 `menu-tree.ts` 随 type 改 2 值已在 `3e749b8` 完成（type=3 废弃、无需过滤，无残留）。
  - **E2E（curl 8081 + 浏览器点测 3001）全通过**：list(分页)/tree/create(directory routePath=null + menu 带 query)/read/启停(全量 PUT 1→0)/delete(MENU_HAS_CHILDREN 403 守卫 → 删子后再删父 200)；UI 新增弹窗 routePath/i18nKey 自动派生 + 提交往返字段持久化校验。typecheck + lint 干净。
  - 文件：`src/views/manage/menu/**`（index + menu-operate-modal + shared）、`src/service/api/system-manage.ts`（+4 menu CRUD 函数）、`src/typings/api/system-manage.d.ts`（Menu/MenuType/MenuIconType/MenuQueryParam/MenuSearchParams/MenuCommand）、`src/constants/business.ts`（menuTypeOptions/Record、menuIconTypeOptions）、路由 + zh/en i18n（`manage_menu`）。详见 issue admin-web#15。
- **用户字段补齐 ✅（2026-08-01，#16 / spec #13 Phase 2，REQ-11）** — 用户管理页补齐 Soybean 字段：① 抽屉加「性别」`NRadioGroup`（1=男 / 2=女 / null=未填写；新增/编辑均提交）；② 列表新增「角色」列（`roles[].name` → `NTag`，空 → `-`）+「性别」列（`NTag`，null → `-`）；③ 搜索增加「性别」`NSelect` + 「手机号」`NInput`，命中后端 `AdminUserQuery.phone/gender`。后端 REQ-11（PR #17）已交付：`GET /users` 项含 `gender/genderName/roles[]`（roles 进**列表**，区别 REQ-4 仅详情）、`phone/gender` 入 query。
  - **gender 整数语义**：1=男 / 2=女 / null=未填写，**0 非法**（实测 PUT `gender=0` 被忽略）——与 Soybean `'1'/'2'` 同枚举值、仅整数。常量 `userGenderOptions`/`userGenderRecord`（`src/constants/business.ts`，整数版，别与 Soybean 字符串版混用）。
  - **角色列只读回显**：用列表项自带 `roles[]`（无需详情）；分配角色仍走 #14 的 `RoleAuthModal` 独立端点。Soybean `example` 列表无角色列——本列为本项目需求自加。
  - **E2E（curl 直连 + 浏览器点测 3001）全通过**：gender 创建(男)/编辑(男→女，回显正确)/搜索(phone 单选、gender=女 单选且排除 null)/列表 roles 回显(admin→超级管理员)；typecheck + lint 通过。
  - 文件：`src/constants/business.ts`（gender 常量）、`src/typings/api/{auth,system-manage}.d.ts`（`AdminUser.gender/genderName`、`UserSearchParams.phone/gender`、`UserCreate/Update.gender`）、`src/views/manage/user/{index,user-search,user-operate-drawer}`。
- **T4 角色字段补齐 ✅（2026-08-01，#17 / spec #13 Phase 2，REQ-10）** — 角色管理页补齐 Soybean 字段：① 列表「状态」`NSwitch` 列 + 搜索「状态」`NSelect` 筛选，提交 `PUT /roles/{id}/status`（复用 T2 用户页整范式——Soybean `example` 状态列是只读 NTag + 写路径全 stub，故按本项目已验证的用户开关范式做、非照搬 example）；② 分配菜单弹窗顶部加「默认首页」route name `NSelect`，选项从已加载菜单树 `menuType=2`(menu/叶子) 节点的 `routeName` 派生（Soybean `getAllPages` 在本仓无后端端点——route name 是 `@elegant-router` 构建期产物，REQ-8 决策「前端自派生」，直接复用弹窗已拉的菜单树），经 `PUT /roles/{id}` UpdateRoleCommand 提交（home 属角色字段、**非**分配菜单端点）。后端 REQ-10（PR #16）已交付：`GET /roles` 项含 `status/home`、`AdminRoleQuery.status`、`PUT /roles/{id}/status`、去 3 处 `@NotEmpty`。
  - **SUPER_ADMIN 锁定**：角色 status 开关对超管行 `disabled`（后端 `AdminRole.disable()` 守卫，实测禁用 403「超级管理员角色不能禁用」），与 T3 的删除/code 保护一致。
  - **顺带**：去分配菜单弹窗的「空集禁提交」（REQ-10 已去 `AssignMenusCommand @NotEmpty`，空集=清空，旧禁用已成 stale）。注：分配权限 / 用户分配角色两弹窗的空集禁用未动（非 #17 范围，留作 REQ-10 后续跟进）。
  - **修 home 清空 bug（code-review 发现）**：后端 `update()` 全量替换（`setHome(command.home())`），抽屉 `fetchUpdateRole` 原不传 home → 编辑资料即清空默认首页。修：抽屉回传 `localRole.home`（弹窗内改 home 已同步进 localRole）。curl 复现（省略 home → 清空）+ 修复后点测（编辑描述、home 保留）验证。
  - **E2E（curl 直连 + 浏览器点测 3001）全通过**：status 启→禁→启（持久化）、status 筛选（禁用=仅该行）、SUPER_ADMIN 开关 disabled、home 下拉（4 个 route name 选项）选择→持久化 `home=manage_role`、编辑资料不清空 home；typecheck + lint 通过。
  - 文件：`src/views/manage/role/{index,modules/role-search,modules/menu-auth-modal,modules/role-operate-drawer}`、`src/service/api/system-manage.ts`（+`fetchUpdateRoleStatus`）、`src/typings/api/system-manage.d.ts`（Role +status/home、RoleSearchParams +status、RoleCreate/Update +home）。详见 issue admin-web#17。
- **主线安排：REQ-6 已提 + 并行做 T3（2026-07-29）** — REQ-1 解锁 sidebar 真数据 + 菜单管理页（SPEC #1 原 out-of-scope），但实测发现种子数据与前端错位 → REQ-6 已提后端（issue #8，见下），前端并行做 T3 角色管理页；REQ-6 回来后另立 spec 做 sidebar + 菜单管理页。**种子结构决策：加一层 GROUP**——一级「控制台」MENU + 「系统管理」GROUP 收纳 RBAC 叶子，双面板有真实两级内容可验证渲染（否决：保持扁平 → 二级面板永空无法验证；否决：一次提完整导航规划 → 超出 RBAC 范围）。

## 待决策（前端内部）

_（grilling 收尾——核心决策已定，剩余为实现细节，见下「实现约定」）_

## 需服务端支持（前端需求清单，待后端实现）

> 对接中凡需后端新增/修改的，由前端以需求形式提给后端，厘清职责：**前端定义需求 → 后端实现 → 前端对接**。

- **[REQ-1] `MenuResponse` 补 `type` 字段 → ✅ 后端已回复契约，前端已确认（2026-07-29）** — 前端 sidebar 双面板需区分 GROUP/MENU/DIVIDER，枚举领域层已有、仅 Response 未暴露。**后端回复（issue #1）并扩展契约**：① `type` 与深度正交（GROUP≠一级、MENU≠二级；深度由树推、type 决定组件。前端 issue 原措辞为简化，后端表述更准且与 sidebar mock 一致）；② DIVIDER 用 fake-row（`parentId`+`sortOrder` 定位、无 path、无子、name 不渲染）；③ **后端兜底排序（按 `sortOrder` 升序，修现状 HashMap 不排序）+ 裁剪（空 GROUP、悬空 DIVIDER 裁掉、祖先 GROUP 链补全）→ 前端选 A：naive 渲染、不自己排/裁**；④ 顺带修「叶子被分配但父 GROUP 未分配时静默丢弃」bug。**序列化**：type 整数 code（`BaseEnumSerializer`），`/menus` 与 `/auth/current` 每节点都带。**前端侧影响**：菜单管理页把 DIVIDER 当一类节点 CRUD。issue：https://github.com/ZhangColin/aieducenter-admin/issues/1 。**优先级：高（阻塞 sidebar 真数据对接）**。
- **[REQ-2] 后端 RBAC 必修 bug —— ✅ 已核实通过（2026-07-28）** — 经读码核实，架构文档列的两个致命 bug 均已修：① loginType 三处（登录写入 / `StpInterface` / 拦截器）统一为默认 `"login"`，`@RequirePermission` 正常按权限码拦截；② 超管 bypass 经 `AuthorizationBypassResolver` SPI 插在「登录后、授权前」，超管也必须登录（无后门）。内置 admin(id=1) 删/禁/夺权均受保护（保留 ID 方案，非 system 列）。**结论：前端可放心依赖权限校验生效，无需后端再改。** 遗留仅 `/auth/captcha` 占位（见 REQ-3）。
- **[REQ-3] `/auth/captcha` 验证码 → ✅ 后端决策 won't fix，已移除占位（issue #2 CLOSED，2026-07-29）** — 后端判断内部员工后台无 botnet 撞库场景，图形验证码防不住内部威胁、收益≈0；未来防自动化走「失败 N 次锁定 + IP 限流」，届时另开 issue。已从放行名单移除占位路径（原为 404 误导性占位）。前端本就不调，**零影响**。issue：https://github.com/ZhangColin/aieducenter-admin/issues/2 。
- **[REQ-4] 用户接口补 `roleIds` → ✅ 已提 issue（2026-07-28）** — 前端「分配角色」弹窗需回显用户当前角色，但 `AdminUserResponse`（列表与 `GET /users/{id}`）无 `roleIds`/`roleCodes`。**已提交**：https://github.com/ZhangColin/aieducenter-admin/issues/3 （标签 `enhancement`）。需求：`GET /users/{id}` 返回 `roleIds`（或 `roles`）。**优先级：中（阻塞分配角色回显，不阻塞其他用户管理功能）**。**✅ 已实现并 CLOSED（issue #3，2026-07-31 核实）**：`AdminUserResponse.roles`（`@JsonInclude(NON_NULL)`，详情 `GET /users/{id}` 填充 `{id,name,code}`，列表/`/auth/current` 不含），被 `AdminUserRolesEchoIntegrationTest` 逐字段钉住。前端待接「分配角色」UI。
- **[REQ-6] 种子菜单数据对齐前端路由/图标/结构 → ✅ 已提后端 issue #8（2026-07-29）** — REQ-1 交付实测发现种子菜单与前端错位：路径 `/admin/*` vs 前端路由 `/dashboard/*`、图标 Lucide 名 vs Material Symbols、扁平结构 vs 双面板、含已决策不建页的「权限管理」。需求：两级结构（一级「控制台」MENU→`/dashboard` + 「系统管理」GROUP 收纳用户/角色/菜单三叶子）、移除权限管理菜单、**icon 契约 = Material Symbols 名**（前端原样渲染不映射）、角色菜单分配迁移不悬空。名称/图标可微调，前端强约束：path 前缀 `/dashboard/*`、icon Material Symbols 名、存在一层 GROUP。issue：https://github.com/ZhangColin/aieducenter-admin/issues/8 ；需求详情见 `docs/backend-requirements/REQ-6-seed-menu-align-frontend-routes.md`。**优先级：高（阻塞 sidebar 真数据 + 菜单管理页 spec）。**
- **[REQ-7] 角色分配权限/菜单、用户分配角色全部 400 → 🐞 已提后端 issue #9（2026-07-30，T3 E2E 发现）** — `PUT /roles/{id}/permissions`、`/roles/{id}/menus`、`/users/{id}/roles` 均返回 `400 Invalid request`。读码定位两 bug：① 三张关联表实体（`AdminRoleMenu`/`AdminRolePermission`/`AdminUserRole`）`@GeneratedValue(IDENTITY)` 与 V1 DDL `id BIGINT PRIMARY KEY`（TSID 应用层生成、无自增）冲突 → INSERT 无 id 来源；② `sys_admin_role_permissions.permission_name` DDL NOT NULL，但服务层 `addPermission(code, null)` 传 null。对照：聚合根 `@Id` 无 GeneratedValue（框架 TSID），关联实体应一致。**影响：RBAC 分配写路径全灭**——阻塞 T3 分配权限/菜单、T4 分配角色。**✅ 已修复（2026-07-30，commit `8d09ec7`，issue CLOSED）**：关联实体 id 策略对齐 TSID、assignPermissions 回填 permission_name、AdminRole 只读 JoinColumn 修重新分配路径。**T3 分配菜单/权限 E2E 已验证打通**（curl + 浏览器点测 200 + 回显）；T4 用户分配角色 ✅ 已交付（#14）。issue：https://github.com/ZhangColin/aieducenter-admin/issues/9 ；详情 + 复现见 `docs/backend-requirements/REQ-7-assign-relation-entity-id-strategy-400.md`。
- **[REQ-5] 用户删除软删未生效（查询不过滤 deleted）→ 🐞 已提后端 issue #7（2026-07-29，T2 E2E 发现）** — `DELETE /users/{id}` 返回 `200 Success` 但用户**仍存在**于 `GET /users` 与 `GET /users/{id}`。读码核实：`AdminUserManagementAppService.delete` 调 `adminUserRepository.delete(entity)` → 框架走 `entity.markAsDeleted()`（逻辑删，`updatedAt` 确有变化），但 `sys_admin_users` 仓储查询**未过滤 `deleted` 标志**（缺 `@SQLRestriction`/`@Where(deleted=false)` 或框架软删查询未启用）→ 已删记录仍被 `findAll`/`findById` 返回。curl 直连后端复现（绕过前端/反代）：DELETE 200 后 GET 仍 200 返回该用户。**影响：前端删除流（请求/toast/刷新）正确，但后端不真删 → 用户永驻列表。** **优先级：高（用户管理核心写操作失效）。** **前端侧无 workaround**（后端返回 200 即视为成功是正确语义）。issue：https://github.com/ZhangColin/aieducenter-admin/issues/7 ；需求详情 + 复现脚本（口令已占位）见 `docs/backend-requirements/REQ-5-user-delete-softdelete-not-effective.md`。**状态（2026-07-29）：后端 OPEN，等待处理。** **✅ 已修复并验证（2026-07-31，T2 E2E）**——后端已修复软删查询过滤；前端 curl 全链路复测：DELETE 返回 200 后，`GET /users/{id}` → `404 管理员不存在`、`GET /users?username=...` → `total "0"`（用户确从列表消失）。用户删除流端到端打通。 注：本地 E2E 创建的测试号 `testops1` 已被多次「软删」（`deleted` 已置位），后端修此 bug 后将自动从列表消失。**补充（2026-07-30，T3 E2E）：Role 聚合同样中招**——`DELETE /roles/{id}` 返回 200 但 `GET /roles` 仍返回该角色（已在 issue #7 评论补证据，建议按聚合统一排查；Menu 未实测）。
- **[REQ-8] 后端对齐 Soybean 系统管理完整功能（用户/角色/菜单）→ ✅ 已提后端 issue #11（2026-07-31）** — 用户拍板 Soybean `example` 系统管理（用户/角色/菜单）**完整移植**：功能一切以 Soybean 为准，后端只保留通用结构（`ApiResponse`/`PageResponse` 外壳、路径风格、Long→string、整数枚举），其余字段/接口缺啥补啥。拆为 REQ-8~11（REQ-12 已撤，见末）：① **REQ-8 菜单扩成路由生成器**（`component`/`routeName`/`i18nKey`/`keepAlive`/`hideInMenu`/`buttons`/`status` + 分页扁平列表端点；**type 用 Soybean directory/menu 2 值——DIVIDER 随 nav-tree 旧方案废弃、REQ-1 被覆盖；icon 用 Soybean iconify+iconType——REQ-6 Material Symbols 作废**，二者均按 Soybean 既定、非开放项）；② **REQ-9 按钮权限模型**（per-menu `buttons` DB 管理 + 角色→按钮分配，按 Soybean 实现；注解扫描保留作后端守卫码来源，二者并存）；③ **REQ-10 角色增强**（status 启停 / home 默认首页 / 去 3 处 `@NotEmpty` 允许清空 / `GET /roles/all` 轻量字典）；④ **REQ-11 用户增强**（gender / 列表内 userRoles 回显 / phone 搜索）；⑤ ~~REQ-12 操作人审计~~ **已撤**——非 Soybean UI 需求（example 三列表均不渲染审计字段，已核实），审计单独待办 admin-web[#19](https://github.com/ZhangColin/aieducenter-admin-web/issues/19)（等系统管理功能做完后前后端共审）、审计列 ticket #18 已关、前端不动 `CommonRecord`。**同时反转旧决策「菜单页重写不移植」→ 完整移植**。issue：https://github.com/ZhangColin/aieducenter-admin/issues/11 ；详情见 `docs/backend-requirements/REQ-8-soybean-system-mgmt-full-alignment.md`。**优先级：高（阻塞 Soybean 系统管理完整功能落地）**。**前端侧安排（2026-07-31，已纠正 scope）**：**仅按钮权限（REQ-9 per-menu buttons）延后**——用户存疑（「可能跟我想得不太一样」），等后端 #11 落地先重新确认模型再做。**其余系统管理功能按「能做的就做」推进**：现在能做的 = 用户分配角色（REQ-4 后端已 CLOSED，不卡后端）；依赖 #11 的（菜单页 REQ-8、用户 gender/列表角色列/手机号搜索 REQ-11、角色 status/home REQ-10）等后端完成、用户通知后再做。**✅ 后端已交付（2026-08-01 核实，后端 PR #13/REQ-8 菜单 + #16/REQ-10 角色 + #17/REQ-11 用户 + #15 菜单分页软删测试）**：curl 实测 `GET /menus`(分页)节点已是完整 Soybean 路由生成器字段、`GET /menus/tree` 同字段树、`GET /roles/all`=`[{id,name,code}]`、`GET /roles` 项含 `status/home`、`GET /users` 项含 `gender/genderName/roles[]`、`AdminUserQuery` 加 `phone/gender`、`AdminRoleQuery` 加 `status`。**→ 后端对前端 #15(菜单页)/#16(用户字段)/#17(角色字段) 三 ticket 充分，可开做。** **「不出记录」已查清 = 陈旧后端构建**（curl 当前后端 items 正常、fresh dev 浏览器两表均出行），非字段/分页契约缺陷——重启后端+前端即恢复。**⚠️ 菜单字段改名（REQ-8 副作用）已修**：后端 `MenuResponse` 旧 `{name,path,type}` → 新 `{menuName,routePath,routeName,component,menuType,iconType,...}`（DIVIDER/type=3 废弃，仅 directory(1)/menu(2)）。前端跟进（2026-08-01）：`Api.Auth.BackendMenu` 类型对齐 Soybean 字段、`menu-auth-modal` `label-field="name"→"menuName"`、`menu-tree.ts` 去掉 DIVIDER 过滤（无第 3 值）、`fetchGetAllRoles` 由 `/roles` 大页兜底迁移到 `/roles/all`（+`RoleOption` 类型）。实测菜单树标签恢复（`首页/系统管理`）、用户分配角色下拉正常。**#15（菜单管理页）✅ 已交付**；**#17（角色 status/home）✅ 已交付**。**#16（gender 列/搜索/抽屉）✅ 已做**。
- **[REQ-13] 新增「我的导航」端点 `GET /menus/my` + `/auth/current` 移除 menus → ✅ 已交付并实测（2026-08-02，后端 issue [#20](https://github.com/ZhangColin/aieducenter-admin/issues/20) CLOSED，拆票链 #21→#22→#23）** — 动态菜单 spec（admin-web#20）的阻塞边，按「身份 vs 导航」划界：① `GET /menus/my` 返 `{home, menus}`（登录即可、按角色裁剪、**只下发启用菜单**——directory 禁用整棵子树不下发、超管全量启用；home = 按 `(sortOrder, id)` 取第一个非空白角色 home）；② `/auth/current` 收敛 `{user, roleCodes, permissions}` 移除 menus；③ **范围外交付**：禁用角色在 roleCodes/permissions/菜单聚合中视为不存在（后端 #21，真实访问回收 200→403）。前端 curl 实测（2026-08-02）：`/auth/current` keys=[user,roleCodes,permissions]；`/menus/my` home='home'、菜单树 component 为 Soybean 格式；禁用 manage_menu 后 `/menus/my` 不下发、恢复后回来。需求详情 `docs/backend-requirements/REQ-13-my-menus-endpoint.md`。前端对接 = admin-web #21/#22/#23。
- **[REQ-14] 角色删除「使用中」检查未过滤已软删用户 → 🐞 已提后端 issue [#24](https://github.com/ZhangColin/aieducenter-admin/issues/24)，后端处理中（2026-08-03 更新）** — 用户软删后其 `sys_admin_user_roles` 关联记录残留，`AdminRoleRepository.isUsedByAnyAdmin` 只按 `roleId` 计数、未 join 用户过滤 `deleted=false` → 角色永不可删。**后端方向：尽量放弃软删除，即使保留软删也由后端侧彻底处理（如级联清关联或在查询侧过滤），前端不 workaround。** 需求详情 + 复现脚本见 `docs/backend-requirements/REQ-14-role-delete-in-use-ignores-softdeleted-users.md`。
- **[REQ-18] account BFF 分页响应 `page` 0-based → 平台分页协议统一 → ✅ 已落地（2026-09-16 联调核实）** — account 列表响应 `page` 沿用 identity 0-based 回显（`AccountBffIntegrationTest` 钉死 `page()=0`），与 admin 北向既有域（system-manage/payment：请求 0-based / **响应 1-based**）相反——同壳不同义。**用户拍板路线**：前端↔admin BFF 约定一种，BFF account 归一化；再层层向各服务提 issue 统一平台分页协议。**最终落地形态比拍板更彻底**：全链 1-based（请求+响应）——admin#73「分页全链 1-based 收口」+ identity#78（迁移框架 Pagination），全链无 ±1（admin ADR-0012）。前端 #52 联调删去临时 ±1 适配（请求 `page` 回 1-based 直传），实测 page=1/2 回显与翻页正确、page=0 clamp 到 1。需求详情 `docs/backend-requirements/REQ-18-account-bff-page-zero-based-unify.md`。
- **[REQ-19] account 列表 createdFrom/createdTo 契约内 date-time 透传 502 → 🐞 已提后端 issue [#74](https://github.com/ZhangColin/aieducenter-admin/issues/74)（2026-09-16，#52 E2E 联调发现）** — `GET /api/admin/accounts` 带注册时间区间 → BFF 502「Third-party service error」（其余五字段筛选全部正常）。契约内格式（带秒/不带秒 date-time）均 502 稳定复现，契约外格式正常 400——北向绑定没问题，炸在 BFF→identity 透传或 identity 侧解析。payment 域同形时间筛选正常，问题独见于 account 链路。**影响**：「注册时间区间」筛选不可用（六字段筛选缺一角），不阻塞主链路。需求详情 + 复现见 `docs/backend-requirements/REQ-19-account-created-range-filter-502.md`。
- **[identity] 登录失败累计自动锁定：触发源缺失 → 🐞 已提 identity issue [#79](https://github.com/ZhangColin/aieducenter-identity/issues/79)（2026-09-16，#52 E2E 联调发现）** — 系统锁定轴（`Account.locked`）设计语义「登录失败累计自动触发」，但 identity 只有 `lock()` 原语、无任何登录失败路径调用它（无失败计数）；管理面只有解锁（#69）——**没有入口能把账号置 locked=true**（DB 直改除外）。管理后台「锁定标记/解锁」功能空转，防爆破基线缺失。#52 联调以 DB 置位模拟触发源，验证下游链路全通（列表/详情 locked 标记、锁定态登录 401「账号已锁定」、unlock 恢复）——只差触发源本身。

---

## 实现约定（开发规范，非决策）

> 下列为对接开发的技术约定，按后端契约对齐。

### Soybean 视角（2026-07-31 起，现行）

- **token**：`localStg`（前缀 `SOY_`）存 `token`；纯 SPA，路由守卫在 `router.beforeEach`（`src/router/guard/route.ts`）读 `localStg.get('token')` 判登录——**无 cookie 镜像、无 middleware**（Next.js 时代那套作废）。发请求走 `Authorization: Bearer <token>` header。
- **超管判定**：`roleCodes.includes('SUPER_ADMIN')`；static 模式下 `isStaticSuper`（`VITE_STATIC_SUPER_ROLE=SUPER_ADMIN`）→ 全静态路由可见。按钮级权限用 `useAuth().hasAuth(code)` + `v-if`（**Soybean v2 无 `v-auth` 指令**，旧博客会误导）。
- **分页 / 枚举**：请求 `page` 0-based（发 `current-1`）、响应 `PageResponse{items,total,page,size}`；`status` 整数（1=激活/0=禁用）。
- **错误提示**：后端 `message`（中文）做 toast；`code !== 200` 即失败——但错误走 `onError`（见上「本仓库决策」+ ADR-0001）。

> ⚠️ 下述子节（鉴权/token cookie 镜像、`useCan`/`<HasPermission>`、Next.js 类型与页面对接）为 **Next.js 时代**约定，**作废**，保留仅作历史。

### 鉴权 / token（Next.js，作废）
- token 镜像 cookie：登录成功 `document.cookie = 'admin_token=<token>; path=/'`，logout 清两边；middleware 读此 cookie 守卫。发请求仍走 `Authorization: Bearer <token>` header（cookie 仅作守卫存在性判断）。
- 超管判定：`roleCodes.includes('SUPER_ADMIN')` → `useCan` 恒 true。

### 权限控制（不变式 #2）
- 新增 `useCan(code: string)` hook + `<HasPermission code>` 组件，基于 `currentUser.permissions`（string[]）；超管放行。
- 不在 UI 硬编码角色判断。

### 类型修正
- `CurrentUserResponse.menus`: `any[]` → `MenuResponse[]`（对齐 store）。
- store `id` 保持 `string`（`String(loginId)`），避免 Long 精度丢失。

### 分页 / 枚举
- 请求分页 `page` 从 0 开始（第一页传 0）；响应 `page` 从 1 开始——展示用响应值，发请求 `请求页 = 展示页 - 1`。
- `status` 是整数（1=激活/0=禁用），非字符串；改状态 `?status=1|0`。

### 页面对接（RBAC 核心 4 页）
- **用户管理**（`/users`）：列表(PageResponse) + 增删改 + 启停状态 + 分配角色 + 重置密码。
- **角色管理**（`/roles`）：列表 + 增删改 + 分配菜单 + 分配权限。
- **菜单管理**（`/menus`）：树形 + 增删改（分层渲染依赖 [REQ-1] `type` 字段）。
- **权限管理 → 并入角色管理**（2026-07-28）：不单独建权限页。权限码字典（GET /permissions）在「角色管理 → 分配权限」里展示并勾选。

### 退出 / header
- header 读 `currentUser`（nickname/avatar），不再硬编码「超级管理员」。
- 退出按钮：`auth-store.logout()` + `POST /auth/logout` + 清 cookie + 跳 `/`。

### 错误提示
- 用后端返回 `message`（中文文案）做 toast；`code !== 200` 即失败。
