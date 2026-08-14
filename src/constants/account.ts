/**
 * 平台账号领域常量（Account，#50）。
 *
 * 与 payment 域不同：account 链路**无 `*Name` 字段**（identity 不回，DTO 注释明示展示文案
 * 由前端按 code 映射）——本文件 record 同时服务**展示与筛选**（displayEnumName 的 Name
 * 兜底链自然退化到 record）。
 * `status` 是 Integer code（1/0）——整数枚举范式：手写 options、不走 transformRecordToOption
 * （number 键经 Object.entries 运行时被压成 string，破坏 NSelect 的 number v-model）。
 */

/** 账号状态（封号轴）code→i18n：1=正常 / 0=已封号。 */
export const accountStatusRecord: Record<Api.Account.AccountStatus, App.I18n.I18nKey> = {
  1: 'page.account.statusEnum.active',
  0: 'page.account.statusEnum.disabled'
};

/** 账号状态标签色。 */
export const accountStatusTagColor: Record<Api.Account.AccountStatus, NaiveUI.ThemeColor> = {
  1: 'success',
  0: 'error'
};

/** 状态筛选下拉（手写 number options，组件内渲染时翻译）。 */
export const accountStatusOptions: CommonType.Option<Api.Account.AccountStatus, App.I18n.I18nKey>[] = [
  { value: 1, label: 'page.account.statusEnum.active' },
  { value: 0, label: 'page.account.statusEnum.disabled' }
];

/** 锁定筛选下拉（query 是 Boolean；NSelect value 不吃 boolean，用 1/0 承载，提交时转 boolean）。 */
export const accountLockedOptions: CommonType.Option<number, App.I18n.I18nKey>[] = [
  { value: 1, label: 'page.account.statusEnum.locked' },
  { value: 0, label: 'page.account.statusEnum.unlocked' }
];
