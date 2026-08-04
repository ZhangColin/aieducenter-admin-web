# App Detail Modal — Spec

## Problem Statement

应用管理详情页当前作为独立路由页面 (`/app/list/:id`)，通过 `tabStore.replaceTab` 导航进入，用户需要在列表和详情之间切换 Tab。对于查看和编辑应用详情这种轻量操作，全页面跳转过于重量，打断了用户在列表页的工作流。

## Solution

将应用详情从独立路由页面改为弹窗（Modal），在列表页内原地打开。用户点击"详情"→ 弹出 720px 宽弹窗 → 查看/编辑/复制 → 关闭弹窗回到列表，全程不离开列表页。

## User Stories

1. 作为管理员，我想在列表页点击"详情"按钮后原地看到应用详情弹窗，而不是跳转到新页面，这样我可以在查看多个应用时保持列表上下文
2. 作为管理员，我想在详情弹窗中看到应用的基本信息（编码/状态/时间）以表格形式展示，与可编辑字段（名称/描述）视觉区分
3. 作为管理员，我想在弹窗中编辑应用名称和描述并保存，保存成功后列表自动刷新
4. 作为管理员，我想在弹窗中启用/停用应用，操作后列表和弹窗内状态同步更新
5. 作为管理员，我想一键复制 API Key 和 Client ID 到剪贴板，复制成功后有视觉反馈
6. 作为管理员，我想一眼分辨 API Secret 是否已生成（已生成显示脱敏标记，未生成显示警告标记）
7. 作为管理员，我想在弹窗中生成/重置 API Key
8. 作为管理员，我想在弹窗中配置/更新 SSO Client（回调地址、授权范围、授权类型）
9. 作为管理员，我创建应用成功后希望能立即看到详情弹窗（含 API Key），无需手动点击"详情"
10. 作为管理员，我想通过关闭按钮、点击遮罩层或 ESC 键关闭详情弹窗

## Implementation Decisions

### 组件拆分

- **新组件 `AppDetailModal`**：独立文件，负责详情弹窗的所有展示和交互逻辑。Props: `visible` (v-model, boolean) + `appId` (string)。Emits: `saved`（基本信息/启停/API Key/Sso 变更后通知列表刷新）。
- **`AppCreateModal` 改造**：创建成功后 emit `created(id: string)` 而非 `tabStore.replaceTab`。
- **`AppList` 改造**：新增 `detailModalVisible` + `selectedAppId` 状态；监听 `AppCreateModal` 的 `created` 事件自动打开详情弹窗；移除 `tabStore` 的 `app_detail` 导航调用。

### 弹窗规格

- 宽度：720px，`preset="card"`
- 标题：动态 `应用名称 + 状态标签`（加载中显示"应用详情"）
- 关闭方式：右上角 X / 点击遮罩 / ESC

### 弹窗内容布局

- **头部**：弹窗 title 即应用名称 + 状态标签，无额外返回箭头
- **基本信息区**：label-value 表格（只读：appCode / status / createdAt / updatedAt）+ NForm（可编辑：name / description），保存按钮在卡片 header-extra
- **API Key 区**：label-value 表格（apiKey 带复制按钮 / apiSecret 带脱敏标签），生成/重置按钮在卡片 header-extra
- **SSO Client 区**：已配置时 label-value 表格（clientId 带复制按钮 / status）+ NDivider + 编辑表单

### 移除项

- 路由 `app_detail`：删除 `src/views/app/detail/index.vue`，运行 `pnpm gen-route` 自动清理路由定义、导入映射和类型
- i18n `route.app_detail`：从 zh-cn.ts、en-us.ts、app.d.ts Schema 中移除
- 弹窗标题复用已有 key `page.manage.app.detail`（值："详情"）

### 数据流

```
AppList
  ├─ AppCreateModal
  │     emit: created(id) ──→ list opens AppDetailModal(selectedAppId = id)
  │
  └─ AppDetailModal (v-model:visible, :appId)
        emit: saved ──→ list refreshes getData()
```

### API 契约

无新增 API。详情弹窗复用现有 `fetchGetAppDetail` / `fetchUpdateApp` / `fetchEnableApp` / `fetchDisableApp` / `fetchGenerateApiKey` / `fetchSaveSsoClient`。

## Testing Decisions

- 测试接缝：`AppDetailModal` 的 props/emits 接口
- 测试策略：验证弹窗打开/关闭、数据加载、保存/启停后列表刷新、创建→自动打开详情流程
- 参考：项目中已有的 `app-create-modal.vue` 使用 `defineModel` + `watch(visible)` 模式，新弹窗沿用

## Out of Scope

- 详情弹窗的 URL 持久化（不通过路由参数访问详情）
- 详情弹窗内的多 Tab 切换（#30 已改为单 Tab，弹窗场景无需）
- 移动端弹窗全屏行为（`preset="card"` 自动处理）

## Further Notes

- `app_detail` 路由的所有引用（routes.ts / imports.ts / transform.ts / elegant-router.d.ts）由 `pnpm gen-route` 自动清理，无需手动编辑
- `route.app_detail` 的 i18n 键需手动从三处删除（zh-cn / en-us / app.d.ts Schema）
