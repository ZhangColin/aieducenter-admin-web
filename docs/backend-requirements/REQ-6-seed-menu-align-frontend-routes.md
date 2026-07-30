# REQ-6 — 种子菜单数据对齐前端路由 / 图标 / 双面板结构

> 来源：admin-web 验证 REQ-1 交付时实测发现（2026-07-29）。
> 前置：REQ-1（菜单 type 字段）已交付 ✅，sidebar 真数据对接已解锁。
> 状态：**已提后端**（issue 见文末）。

## 背景

REQ-1 交付后，前端 sidebar 可以从硬编码切换为读 `/auth/current` 的 menus 树渲染。但 curl 实测（2026-07-29）发现**种子菜单数据与前端实际形态错位**，直接对接会导致点击 404、图标渲染不出、双面板无内容。

## 现状（种子数据实测）

4 个扁平一级节点，全部 `type=1`(MENU)、`parentId=null`：

| name | path | icon |
|------|------|------|
| 用户管理 | `/admin/users` | `User` |
| 角色管理 | `/admin/roles` | `Shield` |
| 菜单管理 | `/admin/menus` | `Menu` |
| 权限管理 | `/admin/permissions` | `Key` |

## 错位清单

1. **路径前缀**：前端实际路由是 `/dashboard/*`（Next.js App Router：`/dashboard`、`/dashboard/users`、`/dashboard/roles`、`/dashboard/menus`），种子是 `/admin/*` → 渲染出来点击全部 404。
2. **图标命名**：前端图标体系是 Material Symbols（`<span class="material-symbols-outlined">`），种子是 Lucide 风格名（`User`/`Shield`/`Menu`/`Key`）→ 渲染不出图标。
3. **结构扁平**：前端 sidebar 是双面板交互（一级图标栏 + 二级菜单面板，按树深度分层渲染），种子全部一级 → 二级面板永远没有内容，分层渲染无法验证。
4. **权限管理菜单**：前端已决策**不建独立权限页**（权限码并入角色管理页分配，2026-07-28 决策）→ `/admin/permissions` 无对应页面，点击 404。

## 需求（种子数据调整）

调整为两级结构（`type` 语义遵守 REQ-1 契约：GROUP 的 `path` 为 null）：

| 深度 | type | name | path | icon | sortOrder |
|------|------|------|------|------|-----------|
| 一级 | MENU | 控制台 | `/dashboard` | `dashboard` | 10 |
| 一级 | GROUP | 系统管理 | `null` | `settings` | 20 |
| 二级 | MENU | 用户管理 | `/dashboard/users` | `group` | 10 |
| 二级 | MENU | 角色管理 | `/dashboard/roles` | `shield` | 20 |
| 二级 | MENU | 菜单管理 | `/dashboard/menus` | `menu` | 30 |

- **移除**「权限管理」种子菜单（原 id=40）。
- **图标契约**：`icon` 字段存 **Material Symbols 名**（小写 snake_case），前端原样渲染、不做映射。icon 是展示层关注点，后端只当字符串存储。
- **角色菜单分配迁移**：调整后确保 SUPER_ADMIN 及已有角色的菜单分配仍完整（`/auth/current` 能拿到全部新种子菜单），不出现「菜单 id 变了、旧分配悬空」导致超管 sidebar 空掉。
- **不要求** DIVIDER 种子——菜单管理页建成后由前端自行 CRUD 添加。

> 菜单名称 / 图标选值可按后端审美微调，前端只强约束：**path 前缀 = `/dashboard/*`、icon = Material Symbols 名、存在一层 GROUP**。

## 验收标准

- [ ] `GET /menus` 与 `GET /auth/current` 返回上述两级结构（GROUP 节点 `type=2`、`path=null`）
- [ ] 前端 sidebar 按树渲染后，点击每个 MENU 进入对应 `/dashboard/*` 路由，无 404
- [ ] 图标在前端 Material Symbols 体系下正常渲染
- [ ] SUPER_ADMIN 的 `/auth/current` menus 包含全部新种子菜单（分配迁移无悬空）

## 影响与优先级

- **优先级：高**——阻塞前端「sidebar 真数据 + 菜单管理页」spec（REQ-1 解锁的后续任务）。
- 属种子数据 / 迁移层改动，无 API 契约变化，不影响已在用的接口形状。
