import type { App } from 'vue';
import { createI18n } from 'vue-i18n';
import { localStg } from '@/utils/storage';
import messages from './locale';

const i18n = createI18n({
  locale: localStg.get('lang') || 'zh-CN',
  fallbackLocale: 'en',
  messages,
  legacy: false
});

/**
 * Setup plugin i18n
 *
 * @param app
 */
export function setupI18n(app: App) {
  app.use(i18n);
}

export const $t = i18n.global.t as App.I18n.$T;

export function setLocale(locale: App.I18n.LangType) {
  i18n.global.locale.value = locale;

  document?.querySelector('html')?.setAttribute('lang', locale);
}

export function getLocale(): App.I18n.LangType {
  return i18n.global.locale.value as App.I18n.LangType;
}

/**
 * Whether the i18n key has a translation in at least one supported locale (zh-CN / en-US)
 *
 * 动态菜单 i18nKey 有效性校验（#21 / spec #20 决策 6）：「不管是没配，还是配了读不到，就用菜单名称」——
 * 所有已注册语言均缺键才判无效，菜单 label 回退 menuName。
 */
export function isI18nKeyExist(key: string): boolean {
  const locales = Object.keys(messages) as App.I18n.LangType[];

  return locales.some(locale => i18n.global.te(key, locale));
}
