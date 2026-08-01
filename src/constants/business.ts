/**
 * 业务枚举（启用状态 / 性别 / 菜单类型 / 图标类型）。
 *
 * 与 Soybean 对齐：record 映射 value → i18n key，渲染处用 `$t(record[value])`，
 * 标签色（tagType）由渲染处内联 `tagMap` 给出（不在 record 里携带，同 Soybean 范式）。
 *
 * ⚠️ 与 Soybean 的差异：本项目后端这些枚举为**整数**（status 1/0、gender 1/2、menuType 1/2、iconType 1/2），
 * 而 Soybean 为字符串（'1'/'2'）。故：
 * - record 键类型用 `number`；
 * - options **不**用 `transformRecordToOption`（它在运行时经 `Object.entries` 把 number 键压成 string，
 *   会破坏 NSelect 的 `number` v-model 绑定）——改为手写，显式保留 `number` value。
 *   label 仍为 i18n key，渲染处（NSelect 用 computed、NRadio 用 `$t(item.label)`）翻译。
 */

export const enableStatusRecord: Record<number, App.I18n.I18nKey> = {
  1: 'page.manage.common.status.enable',
  0: 'page.manage.common.status.disable'
};

export const enableStatusOptions: CommonType.Option<number, App.I18n.I18nKey>[] = [
  { value: 1, label: enableStatusRecord[1] },
  { value: 0, label: enableStatusRecord[0] }
];

/**
 * 用户性别（admin 后端整数语义：1=男 / 2=女；null=未填写，0 非法）。
 */
export const userGenderRecord: Record<number, App.I18n.I18nKey> = {
  1: 'page.manage.user.gender.male',
  2: 'page.manage.user.gender.female'
};

export const userGenderOptions: CommonType.Option<number, App.I18n.I18nKey>[] = [
  { value: 1, label: userGenderRecord[1] },
  { value: 2, label: userGenderRecord[2] }
];

/**
 * 超管角色编码（后端 `AdminRole.isSuperAdmin()` 即按此 code 判定）。
 * 角色行无服务端 `breakGlass` 标志（区别于用户），故按 code 兜底：该角色不可删、编辑时 code 不可改。
 */
export const SUPER_ADMIN_ROLE_CODE = 'SUPER_ADMIN';

/**
 * 菜单类型（Soybean「路由生成器」模型，REQ-8：1=目录 directory / 2=菜单 menu；整数）。
 * 旧 nav-tree 的 MENU/GROUP/DIVIDER(3) 三值已废弃。
 */
export const menuTypeRecord: Record<number, App.I18n.I18nKey> = {
  1: 'page.manage.menu.type.directory',
  2: 'page.manage.menu.type.menu'
};

export const menuTypeOptions: CommonType.Option<number, App.I18n.I18nKey>[] = [
  { value: 1, label: menuTypeRecord[1] },
  { value: 2, label: menuTypeRecord[2] }
];

/**
 * 菜单图标类型（REQ-8：1=iconify / 2=本地 svg；整数，废弃 REQ-6 Material Symbols）。
 */
export const menuIconTypeRecord: Record<number, App.I18n.I18nKey> = {
  1: 'page.manage.menu.iconType.iconify',
  2: 'page.manage.menu.iconType.local'
};

export const menuIconTypeOptions: CommonType.Option<number, App.I18n.I18nKey>[] = [
  { value: 1, label: menuIconTypeRecord[1] },
  { value: 2, label: menuIconTypeRecord[2] }
];
