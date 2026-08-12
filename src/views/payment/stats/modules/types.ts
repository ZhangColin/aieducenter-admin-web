/**
 * 仪表盘 KPI tile 描述（label 为 i18n key，组件内 $t 翻译以响应语言切换；value 惰性取值以响应 store 数据更新）。
 * overview / operations-audit 两 widget 共用，避免重复的内联类型。
 */
export interface StatKpi {
  key: string;
  label: App.I18n.I18nKey;
  value: () => string;
}
