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
| **统一响应 (`ApiResponse<T>`)** | 后端所有接口返回 `{ code, message, data, requestId, errors }`；`code` = HTTP 状态码本身（200/400/401/403…），**非**业务码 |
| **分页 (`PageResponse<T>`)** | `{ items, total, page, size }`；响应 `page` 是 1-based，**请求** `page` 是 0-based（Spring Pageable 约定） |
| **权限三件套** | `AdminUser` / `AdminRole` / `AdminMenu` + 关联表；前端拿到 `roleCodes[]` / `permissions[]` / `menus[]` 做指令级控制 |
| **permissions / roleCodes** | 登录时 `/auth/current` 拉取的权限码数组（如 `admin:user:read`）与角色编码数组（如 `SUPER_ADMIN`）；超管靠后端 bypass 放行 |
| **财务上下文** | admin 内的只读限界上下文（非独立域）；从各能力域只读取数做收入确认/冲销——**后端尚未实现** |

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

### Soybean 重写后（2026-07-31，T1 登录闭环 ✅ #12 / commit `73f1643`）

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
  - **菜单管理页重写、不移植**：Soybean 菜单是"路由生成器"（`component` 字符串 + routeName/keepAlive/query 等 RouteMeta），我们后端是 GROUP/MENU/DIVIDER 纯菜单树，模型不同。参考其弹窗布局按 `MenuResponse` 重写。
  - **排期**：T2 = tracer bullet **用户管理页**（搬外壳 + 自写 CRUD + 改 `defaultTransform`，一页端到端验证整套适配范式）→ T3 = 角色管理页（复用范式 + 两个授权弹窗接 `menuIds`/`permissionCodes`）→ **菜单页 defer 到 #11（D2 动态菜单）**：当前 static 模式下菜单 CRUD 对 sidebar 无可见效果，属动态菜单那条线。
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
- **T3 角色管理页主体实现 ✅（2026-07-30）** — 列表/搜索/分页/新增/编辑/删除 + sidebar 入口 + `<HasPermission code="admin:role:write">` + SUPER_ADMIN 删除禁用 & 编辑 code 禁用 + MenuResponse TS 类型修正（补 `type`/路径 nullable/Long→string）。分配菜单勾选树按决策 B 过滤 DIVIDER、父子级联 + 半选态（`menu-tree.ts`）。E2E 手测：列表/搜索/新增/编辑/删除/SUPER_ADMIN 保护全通过；**分配权限、分配菜单被后端 REQ-7 阻塞**（三张关联表 INSERT 400），UI 已实现且错误 toast 正常，待后端修复回归。详见 issue admin-web#4。
- **主线安排：REQ-6 已提 + 并行做 T3（2026-07-29）** — REQ-1 解锁 sidebar 真数据 + 菜单管理页（SPEC #1 原 out-of-scope），但实测发现种子数据与前端错位 → REQ-6 已提后端（issue #8，见下），前端并行做 T3 角色管理页；REQ-6 回来后另立 spec 做 sidebar + 菜单管理页。**种子结构决策：加一层 GROUP**——一级「控制台」MENU + 「系统管理」GROUP 收纳 RBAC 叶子，双面板有真实两级内容可验证渲染（否决：保持扁平 → 二级面板永空无法验证；否决：一次提完整导航规划 → 超出 RBAC 范围）。

## 待决策（前端内部）

_（grilling 收尾——核心决策已定，剩余为实现细节，见下「实现约定」）_

## 需服务端支持（前端需求清单，待后端实现）

> 对接中凡需后端新增/修改的，由前端以需求形式提给后端，厘清职责：**前端定义需求 → 后端实现 → 前端对接**。

- **[REQ-1] `MenuResponse` 补 `type` 字段 → ✅ 后端已回复契约，前端已确认（2026-07-29）** — 前端 sidebar 双面板需区分 GROUP/MENU/DIVIDER，枚举领域层已有、仅 Response 未暴露。**后端回复（issue #1）并扩展契约**：① `type` 与深度正交（GROUP≠一级、MENU≠二级；深度由树推、type 决定组件。前端 issue 原措辞为简化，后端表述更准且与 sidebar mock 一致）；② DIVIDER 用 fake-row（`parentId`+`sortOrder` 定位、无 path、无子、name 不渲染）；③ **后端兜底排序（按 `sortOrder` 升序，修现状 HashMap 不排序）+ 裁剪（空 GROUP、悬空 DIVIDER 裁掉、祖先 GROUP 链补全）→ 前端选 A：naive 渲染、不自己排/裁**；④ 顺带修「叶子被分配但父 GROUP 未分配时静默丢弃」bug。**序列化**：type 整数 code（`BaseEnumSerializer`），`/menus` 与 `/auth/current` 每节点都带。**前端侧影响**：菜单管理页把 DIVIDER 当一类节点 CRUD。issue：https://github.com/ZhangColin/aieducenter-admin/issues/1 。**优先级：高（阻塞 sidebar 真数据对接）**。
- **[REQ-2] 后端 RBAC 必修 bug —— ✅ 已核实通过（2026-07-28）** — 经读码核实，架构文档列的两个致命 bug 均已修：① loginType 三处（登录写入 / `StpInterface` / 拦截器）统一为默认 `"login"`，`@RequirePermission` 正常按权限码拦截；② 超管 bypass 经 `AuthorizationBypassResolver` SPI 插在「登录后、授权前」，超管也必须登录（无后门）。内置 admin(id=1) 删/禁/夺权均受保护（保留 ID 方案，非 system 列）。**结论：前端可放心依赖权限校验生效，无需后端再改。** 遗留仅 `/auth/captcha` 占位（见 REQ-3）。
- **[REQ-3] `/auth/captcha` 验证码 → ✅ 后端决策 won't fix，已移除占位（issue #2 CLOSED，2026-07-29）** — 后端判断内部员工后台无 botnet 撞库场景，图形验证码防不住内部威胁、收益≈0；未来防自动化走「失败 N 次锁定 + IP 限流」，届时另开 issue。已从放行名单移除占位路径（原为 404 误导性占位）。前端本就不调，**零影响**。issue：https://github.com/ZhangColin/aieducenter-admin/issues/2 。
- **[REQ-4] 用户接口补 `roleIds` → ✅ 已提 issue（2026-07-28）** — 前端「分配角色」弹窗需回显用户当前角色，但 `AdminUserResponse`（列表与 `GET /users/{id}`）无 `roleIds`/`roleCodes`。**已提交**：https://github.com/ZhangColin/aieducenter-admin/issues/3 （标签 `enhancement`）。需求：`GET /users/{id}` 返回 `roleIds`（或 `roles`）。**优先级：中（阻塞分配角色回显，不阻塞其他用户管理功能）**。**状态（2026-07-29）：后端尚未回复（OPEN，等待中）。**
- **[REQ-6] 种子菜单数据对齐前端路由/图标/结构 → ✅ 已提后端 issue #8（2026-07-29）** — REQ-1 交付实测发现种子菜单与前端错位：路径 `/admin/*` vs 前端路由 `/dashboard/*`、图标 Lucide 名 vs Material Symbols、扁平结构 vs 双面板、含已决策不建页的「权限管理」。需求：两级结构（一级「控制台」MENU→`/dashboard` + 「系统管理」GROUP 收纳用户/角色/菜单三叶子）、移除权限管理菜单、**icon 契约 = Material Symbols 名**（前端原样渲染不映射）、角色菜单分配迁移不悬空。名称/图标可微调，前端强约束：path 前缀 `/dashboard/*`、icon Material Symbols 名、存在一层 GROUP。issue：https://github.com/ZhangColin/aieducenter-admin/issues/8 ；需求详情见 `docs/backend-requirements/REQ-6-seed-menu-align-frontend-routes.md`。**优先级：高（阻塞 sidebar 真数据 + 菜单管理页 spec）。**
- **[REQ-7] 角色分配权限/菜单、用户分配角色全部 400 → 🐞 已提后端 issue #9（2026-07-30，T3 E2E 发现）** — `PUT /roles/{id}/permissions`、`/roles/{id}/menus`、`/users/{id}/roles` 均返回 `400 Invalid request`。读码定位两 bug：① 三张关联表实体（`AdminRoleMenu`/`AdminRolePermission`/`AdminUserRole`）`@GeneratedValue(IDENTITY)` 与 V1 DDL `id BIGINT PRIMARY KEY`（TSID 应用层生成、无自增）冲突 → INSERT 无 id 来源；② `sys_admin_role_permissions.permission_name` DDL NOT NULL，但服务层 `addPermission(code, null)` 传 null。对照：聚合根 `@Id` 无 GeneratedValue（框架 TSID），关联实体应一致。**影响：RBAC 分配写路径全灭**——阻塞 T3 分配权限/菜单、T4 分配角色。前端 UI 已实现（错误 toast 正常），待后端修复回归。issue：https://github.com/ZhangColin/aieducenter-admin/issues/9 ；详情 + 复现见 `docs/backend-requirements/REQ-7-assign-relation-entity-id-strategy-400.md`。**优先级：高。**
- **[REQ-5] 用户删除软删未生效（查询不过滤 deleted）→ 🐞 已提后端 issue #7（2026-07-29，T2 E2E 发现）** — `DELETE /users/{id}` 返回 `200 Success` 但用户**仍存在**于 `GET /users` 与 `GET /users/{id}`。读码核实：`AdminUserManagementAppService.delete` 调 `adminUserRepository.delete(entity)` → 框架走 `entity.markAsDeleted()`（逻辑删，`updatedAt` 确有变化），但 `sys_admin_users` 仓储查询**未过滤 `deleted` 标志**（缺 `@SQLRestriction`/`@Where(deleted=false)` 或框架软删查询未启用）→ 已删记录仍被 `findAll`/`findById` 返回。curl 直连后端复现（绕过前端/反代）：DELETE 200 后 GET 仍 200 返回该用户。**影响：前端删除流（请求/toast/刷新）正确，但后端不真删 → 用户永驻列表。** **优先级：高（用户管理核心写操作失效）。** **前端侧无 workaround**（后端返回 200 即视为成功是正确语义）。issue：https://github.com/ZhangColin/aieducenter-admin/issues/7 ；需求详情 + 复现脚本（口令已占位）见 `docs/backend-requirements/REQ-5-user-delete-softdelete-not-effective.md`。**状态（2026-07-29）：后端 OPEN，等待处理。** **✅ 已修复并验证（2026-07-31，T2 E2E）**——后端已修复软删查询过滤；前端 curl 全链路复测：DELETE 返回 200 后，`GET /users/{id}` → `404 管理员不存在`、`GET /users?username=...` → `total "0"`（用户确从列表消失）。用户删除流端到端打通。 注：本地 E2E 创建的测试号 `testops1` 已被多次「软删」（`deleted` 已置位），后端修此 bug 后将自动从列表消失。**补充（2026-07-30，T3 E2E）：Role 聚合同样中招**——`DELETE /roles/{id}` 返回 200 但 `GET /roles` 仍返回该角色（已在 issue #7 评论补证据，建议按聚合统一排查；Menu 未实测）。

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
