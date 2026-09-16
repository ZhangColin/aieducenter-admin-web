/**
 * AI 平台领域常量（aiplatform，#56/#57）——订单域。
 *
 * `status` 是 Integer code（1..5），响应带 `statusName` 中文名（ADR-0009 直读）——
 * 列表/详情/下拉标签文案直接用响应 `statusName` 原值（aiplatform 链路有 *Name，与 account 域
 * 无 *Name、需 record 映射不同，故本域无 statusRecord）；
 * 本文件只服务**筛选下拉选项与标签配色**（按钮门控用 `status` code：未支付=1|2 可报价/取消；3 已支付可重试归档）。
 * 整数枚举范式：手写 options、不走 transformRecordToOption（number 键运行时被压 string，破坏 NSelect）。
 */

/** 订单状态标签色（语义：待报价信息 / 已报价主色 / 已支付成功 / 终态灰 / 取消红）。 */
export const orderStatusTagColor: Record<Api.Aiplatform.OrderStatus, NaiveUI.ThemeColor> = {
  1: 'info',
  2: 'primary',
  3: 'success',
  4: 'default',
  5: 'error'
};

/** 状态筛选下拉（多选；手写 number options，组件内渲染时翻译）。 */
export const orderStatusOptions: CommonType.Option<Api.Aiplatform.OrderStatus, App.I18n.I18nKey>[] = [
  { value: 1, label: 'page.aiplatform.order.statusEnum.pendingQuote' },
  { value: 2, label: 'page.aiplatform.order.statusEnum.quoted' },
  { value: 3, label: 'page.aiplatform.order.statusEnum.paid' },
  { value: 4, label: 'page.aiplatform.order.statusEnum.archived' },
  { value: 5, label: 'page.aiplatform.order.statusEnum.cancelled' }
];
