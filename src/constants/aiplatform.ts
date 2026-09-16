/**
 * AI 平台领域常量（aiplatform，#56/#57/#58）——订单域 + 项目域。
 *
 * `status` 是 Integer code，响应带 `statusName` 中文名（ADR-0009 直读）——
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

/** 项目状态标签色（语义：进行中主色 / 已归档终态灰）。 */
export const projectStatusTagColor: Record<Api.Aiplatform.ProjectStatus, NaiveUI.ThemeColor> = {
  1: 'primary',
  3: 'default'
};

/**
 * 项目状态筛选三档单选（全部='all' 占位缺省不传参；与订单多选有意不同——provider 项目清单只收单值）。
 * 整数枚举手写 options 先例；「全部」用 'all' 哨兵字符串（NRadio value 不收 null）。
 */
export const projectStatusRadioOptions: { value: 'all' | Api.Aiplatform.ProjectStatus; label: App.I18n.I18nKey }[] = [
  { value: 'all', label: 'page.aiplatform.project.statusEnum.all' },
  { value: 1, label: 'page.aiplatform.project.statusEnum.inProgress' },
  { value: 3, label: 'page.aiplatform.project.statusEnum.archived' }
];

/** 对话史 kind 标签色（语义：用户主色 / 智能体成功 / 问答卡 warning / 作答 info / 收尾卡红 / 平台引导灰）。 */
export const conversationKindTagColor: Record<Api.Aiplatform.ConversationEntryKind, NaiveUI.ThemeColor> = {
  1: 'primary',
  2: 'success',
  3: 'warning',
  4: 'info',
  5: 'error',
  6: 'default'
};
