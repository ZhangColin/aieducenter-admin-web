/**
 * 启用/禁用状态（admin 后端整数语义：1=激活 / 0=禁用）
 *
 * ⚠️ 与 Soybean 默认的字符串状态（'1'=启用 / '2'=禁用，见 Api.Common.EnableStatus）语义不同——
 * 本项目后端 status 为整数，勿混用。
 */
export const enableStatusOptions: CommonType.Option<number>[] = [
  { label: '启用', value: 1 },
  { label: '禁用', value: 0 }
];

/** status → { label, tagType }，用于 NTag / NSwitch 渲染 */
export const enableStatusRecord: Record<number, { label: string; tagType: NaiveUI.ThemeColor }> = {
  1: { label: '启用', tagType: 'success' },
  0: { label: '禁用', tagType: 'warning' }
};
