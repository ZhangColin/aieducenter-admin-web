# Soybean Admin v2.2 → admin 后端 接线笔记（迁移参考）

> 框架已选定 Soybean（v2.2.0, Vue3 + Naive UI + Vite8 + Pinia3 + UnoCSS）。本文是接线要点，来源：deep-dive 源码核实 + PanisAdmin（SpringBoot3+Sa-Token）参考实现。

## 契约契合（大多零成本 / 配置级）

- **鉴权头**：`getAuthorization()` → `` `Bearer ${token}` ``，与 Sa-Token（token-prefix: Bearer / token-style: uuid）**完美匹配**。
- **成功码**：env `VITE_SERVICE_SUCCESS_CODE=200`（默认 `"0000"`）。一行。
- **登出/刷新码**：`VITE_SERVICE_LOGOUT_CODES=401`；刷新码（`EXPIRED_TOKEN_CODES`）留空（Sa-Token 无 refresh）。
- **响应解包**：`transform()` 返 `response.data.data`，契合 ApiResponse `{code,message,data,requestId,errors}`。
- ⚠️ **字段名**：Soybean 用 `msg`，后端用 `message` → 类型定义 + 2-3 处改（`showErrorMsg`/`onBackendFail`）。
- **Token 存储**：localStorage（`localStg`，带 `VITE_STORAGE_PREFIX`）。纯 SPA，路由守卫在 `router.beforeEach`，**无需 cookie 镜像**。

## 登录 / 用户信息 adapter

- **登录体**：Soybean 发 `{userName,password}` → 改 `{username,password,rememberMe}`。
- **LoginToken**：Soybean 期望 `{token,refreshToken}`；后端 `TokenInfo{token,loginId,expireTime}` 无 refresh → 删 refreshToken 处理。
- **UserInfo**：`fetchGetUserInfo` 指向 `/auth/current`，转 `{user,roleCodes,menus,permissions}` → `{userId:user.id, userName:user.nickname, roles:roleCodes, buttons:permissions}`（menus 交路由 store，不在此）。
- **登出**：auth store 无 `fetchLogout` → 加 `POST /auth/logout`。
- **分页**：`current`(1-based) ↔ 后端 page(0-based) → 发 `current-1`；`records`↔`items`；每表 `transform`。

## RBAC

- `roles` ← `roleCodes`，`buttons` ← `permissions`（**直映射**）。
- **按钮级**：`useAuth().hasAuth(code)` + `v-if`（**v2 无 `v-auth` 指令**，用 v-if；旧博客会误导）。
- **路由级**：`meta.roles`；**动态模式无前端超管旁路** → 后端预过滤（契合 SUPER_ADMIN 服务端 bypass，**免自加**）。

## 后端动态菜单（最难的部分）

- 动态模式要 `/route/getUserRoutes` 返回 **ElegantConstRoute 树**：`{name, path, component<string>, meta:{title,icon,order,roles?}, children}`，`component` 经 @elegant-router 生成的 `imports.ts` 解析为真实组件。
- 我们 `/menus` 是 `{id,name,path,icon,parentId,sortOrder,type(1GROUP/2MENU/3DIVIDER),children}` → 需**前端转换器**或**后端重塑**（见 D2）。
- **DIVIDER(type3)** 无原生对应 → 自定义渲染。
- **icon**：Soybean 用 iconify（`material-symbols:xxx` 前缀）；与 REQ-6 纯名要对齐。
- **参考**：PanisAdmin（SpringBoot3 + Sa-Token + MySQL）已打通此路径 = blueprint。

## 坑 / 清理

- `.env` 有 **Apifox mock token**（`apifoxToken`）→ 部署前删。
- 版本新（TS6 / vue-router5 / Vite8）→ AI 易引旧 API，**必须先读源码**。
- **v2.0（2025-12）重构**：`useTable` 签名、布局组件名、`transformBackendResponse` 弃用 → 2025 前的博客会误导。

## 文档

- https://docs.soybeanjs.cn/zh/（本环境曾被网络策略挡，AI 改用 GitHub raw 读源码；内联英文注释极好）。
