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
- **✅ spec 已发布（2026-08-01，via `/to-spec`）**：[#20](https://github.com/ZhangColin/aieducenter-admin-web/issues/20)（`ready-for-agent`）= 动态菜单（dynamic 路由模式）前端实现。测试 seam = 手动 E2E（同 spec #1/#13）。**阻塞边 = [REQ-13](https://github.com/ZhangColin/aieducenter-admin/issues/20)（已提后端仓库，`enhancement`；详情 `docs/backend-requirements/REQ-13-my-menus-endpoint.md`）**；不依赖后端的（`isStaticSuper` 修复、转换器、service 三适配）可在 static 模式下先合入、零行为变化，翻 env 是最后一步。已 grep 核实无任何代码消费 `/auth/current.menus`——后端删字段无切换协调风险。

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
- **[REQ-7] 角色分配权限/菜单、用户分配角色全部 400 → 🐞 已提后端 issue #9（2026-07-30，T3 E2E 发现）** — `PUT /roles/{id}/permissions`、`/roles/{id}/menus`、`/users/{id}/roles` 均返回 `400 Invalid request`。读码定位两 bug：① 三张关联表实体（`AdminRoleMenu`/`AdminRolePermission`/`AdminUserRole`）`@GeneratedValue(IDENTITY)` 与 V1 DDL `id BIGINT PRIMARY KEY`（TSID 应用层生成、无自增）冲突 → INSERT 无 id 来源；② `sys_admin_role_permissions.permission_name` DDL NOT NULL，但服务层 `addPermission(code, null)` 传 null。对照：聚合根 `@Id` 无 GeneratedValue（框架 TSID），关联实体应一致。**影响：RBAC 分配写路径全灭**——阻塞 T3 分配权限/菜单、T4 分配角色。**✅ 已修复（2026-07-30，commit `8d09ec7`，issue CLOSED）**：关联实体 id 策略对齐 TSID、assignPermissions 回填 permission_name、AdminRole 只读 JoinColumn 修重新分配路径。**T3 分配菜单/权限 E2E 已验证打通**（curl + 浏览器点测 200 + 回显）；T4 用户分配角色仍待做。issue：https://github.com/ZhangColin/aieducenter-admin/issues/9 ；详情 + 复现见 `docs/backend-requirements/REQ-7-assign-relation-entity-id-strategy-400.md`。
- **[REQ-5] 用户删除软删未生效（查询不过滤 deleted）→ 🐞 已提后端 issue #7（2026-07-29，T2 E2E 发现）** — `DELETE /users/{id}` 返回 `200 Success` 但用户**仍存在**于 `GET /users` 与 `GET /users/{id}`。读码核实：`AdminUserManagementAppService.delete` 调 `adminUserRepository.delete(entity)` → 框架走 `entity.markAsDeleted()`（逻辑删，`updatedAt` 确有变化），但 `sys_admin_users` 仓储查询**未过滤 `deleted` 标志**（缺 `@SQLRestriction`/`@Where(deleted=false)` 或框架软删查询未启用）→ 已删记录仍被 `findAll`/`findById` 返回。curl 直连后端复现（绕过前端/反代）：DELETE 200 后 GET 仍 200 返回该用户。**影响：前端删除流（请求/toast/刷新）正确，但后端不真删 → 用户永驻列表。** **优先级：高（用户管理核心写操作失效）。** **前端侧无 workaround**（后端返回 200 即视为成功是正确语义）。issue：https://github.com/ZhangColin/aieducenter-admin/issues/7 ；需求详情 + 复现脚本（口令已占位）见 `docs/backend-requirements/REQ-5-user-delete-softdelete-not-effective.md`。**状态（2026-07-29）：后端 OPEN，等待处理。** **✅ 已修复并验证（2026-07-31，T2 E2E）**——后端已修复软删查询过滤；前端 curl 全链路复测：DELETE 返回 200 后，`GET /users/{id}` → `404 管理员不存在`、`GET /users?username=...` → `total "0"`（用户确从列表消失）。用户删除流端到端打通。 注：本地 E2E 创建的测试号 `testops1` 已被多次「软删」（`deleted` 已置位），后端修此 bug 后将自动从列表消失。**补充（2026-07-30，T3 E2E）：Role 聚合同样中招**——`DELETE /roles/{id}` 返回 200 但 `GET /roles` 仍返回该角色（已在 issue #7 评论补证据，建议按聚合统一排查；Menu 未实测）。
- **[REQ-8] 后端对齐 Soybean 系统管理完整功能（用户/角色/菜单）→ ✅ 已提后端 issue #11（2026-07-31）** — 用户拍板 Soybean `example` 系统管理（用户/角色/菜单）**完整移植**：功能一切以 Soybean 为准，后端只保留通用结构（`ApiResponse`/`PageResponse` 外壳、路径风格、Long→string、整数枚举），其余字段/接口缺啥补啥。拆为 REQ-8~11（REQ-12 已撤，见末）：① **REQ-8 菜单扩成路由生成器**（`component`/`routeName`/`i18nKey`/`keepAlive`/`hideInMenu`/`buttons`/`status` + 分页扁平列表端点；**type 用 Soybean directory/menu 2 值——DIVIDER 随 nav-tree 旧方案废弃、REQ-1 被覆盖；icon 用 Soybean iconify+iconType——REQ-6 Material Symbols 作废**，二者均按 Soybean 既定、非开放项）；② **REQ-9 按钮权限模型**（per-menu `buttons` DB 管理 + 角色→按钮分配，按 Soybean 实现；注解扫描保留作后端守卫码来源，二者并存）；③ **REQ-10 角色增强**（status 启停 / home 默认首页 / 去 3 处 `@NotEmpty` 允许清空 / `GET /roles/all` 轻量字典）；④ **REQ-11 用户增强**（gender / 列表内 userRoles 回显 / phone 搜索）；⑤ ~~REQ-12 操作人审计~~ **已撤**——非 Soybean UI 需求（example 三列表均不渲染审计字段，已核实），审计单独待办 admin-web[#19](https://github.com/ZhangColin/aieducenter-admin-web/issues/19)（等系统管理功能做完后前后端共审）、审计列 ticket #18 已关、前端不动 `CommonRecord`。**同时反转旧决策「菜单页重写不移植」→ 完整移植**。issue：https://github.com/ZhangColin/aieducenter-admin/issues/11 ；详情见 `docs/backend-requirements/REQ-8-soybean-system-mgmt-full-alignment.md`。**优先级：高（阻塞 Soybean 系统管理完整功能落地）**。**前端侧安排（2026-07-31，已纠正 scope）**：**仅按钮权限（REQ-9 per-menu buttons）延后**——用户存疑（「可能跟我想得不太一样」），等后端 #11 落地先重新确认模型再做。**其余系统管理功能按「能做的就做」推进**：现在能做的 = 用户分配角色（REQ-4 后端已 CLOSED，不卡后端）；依赖 #11 的（菜单页 REQ-8、用户 gender/列表角色列/手机号搜索 REQ-11、角色 status/home REQ-10）等后端完成、用户通知后再做。**✅ 后端已交付（2026-08-01 核实，后端 PR #13/REQ-8 菜单 + #16/REQ-10 角色 + #17/REQ-11 用户 + #15 菜单分页软删测试）**：curl 实测 `GET /menus`(分页)节点已是完整 Soybean 路由生成器字段、`GET /menus/tree` 同字段树、`GET /roles/all`=`[{id,name,code}]`、`GET /roles` 项含 `status/home`、`GET /users` 项含 `gender/genderName/roles[]`、`AdminUserQuery` 加 `phone/gender`、`AdminRoleQuery` 加 `status`。**→ 后端对前端 #15(菜单页)/#16(用户字段)/#17(角色字段) 三 ticket 充分，可开做。** **「不出记录」已查清 = 陈旧后端构建**（curl 当前后端 items 正常、fresh dev 浏览器两表均出行），非字段/分页契约缺陷——重启后端+前端即恢复。**⚠️ 菜单字段改名（REQ-8 副作用）已修**：后端 `MenuResponse` 旧 `{name,path,type}` → 新 `{menuName,routePath,routeName,component,menuType,iconType,...}`（DIVIDER/type=3 废弃，仅 directory(1)/menu(2)）。前端跟进（2026-08-01）：`Api.Auth.BackendMenu` 类型对齐 Soybean 字段、`menu-auth-modal` `label-field="name"→"menuName"`、`menu-tree.ts` 去掉 DIVIDER 过滤（无第 3 值）、`fetchGetAllRoles` 由 `/roles` 大页兜底迁移到 `/roles/all`（+`RoleOption` 类型）。实测菜单树标签恢复（`首页/系统管理`）、用户分配角色下拉正常。**仍待做（随 #15/#17）**：菜单管理页本体（`fetchGetMenuList` 打 `GET /menus` 分页 + 整页）；#17 的 UI（角色 status 开关/home 选择器）。**#16（gender 列/搜索/抽屉）✅ 已做**。

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
