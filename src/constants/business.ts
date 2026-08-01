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

/**
 * 用户性别（admin 后端整数语义：1=男 / 2=女；null=未填写，0 非法）。
 *
 * 与 Soybean 默认的字符串性别（'1'/'2'，见 Api.SystemManage.UserGender）枚举值一致，
 * 仅本项目后端为整数——按整数对接，勿混用。
 */
export const userGenderOptions: CommonType.Option<number>[] = [
  { label: '男', value: 1 },
  { label: '女', value: 2 }
];

/** gender → { label, tagType }，用于 NTag / NRadioGroup 渲染 */
export const userGenderRecord: Record<number, { label: string; tagType: NaiveUI.ThemeColor }> = {
  1: { label: '男', tagType: 'primary' },
  2: { label: '女', tagType: 'error' }
};

/**
 * 超管角色编码（后端 `AdminRole.isSuperAdmin()` 即按此 code 判定）。
 * 角色行无服务端 `breakGlass` 标志（区别于用户），故按 code 兜底：该角色不可删、编辑时 code 不可改。
 */
export const SUPER_ADMIN_ROLE_CODE = 'SUPER_ADMIN';

/**
 * 菜单类型（Soybean「路由生成器」模型，REQ-8：1=目录 directory / 2=菜单 menu；整数）。
 * 旧 nav-tree 的 MENU/GROUP/DIVIDER(3) 三值已废弃。
 */
export const menuTypeOptions: CommonType.Option<number>[] = [
  { label: '目录', value: 1 },
  { label: '菜单', value: 2 }
];

/** menuType → { label, tagType }，用于 NTag / NRadioGroup 渲染 */
export const menuTypeRecord: Record<number, { label: string; tagType: NaiveUI.ThemeColor }> = {
  1: { label: '目录', tagType: 'default' },
  2: { label: '菜单', tagType: 'primary' }
};

/**
 * 菜单图标类型（REQ-8：1=iconify / 2=本地 svg；整数，废弃 REQ-6 Material Symbols）。
 */
export const menuIconTypeOptions: CommonType.Option<number>[] = [
  { label: 'iconify', value: 1 },
  { label: '本地', value: 2 }
];

