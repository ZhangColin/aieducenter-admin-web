import dayjs from 'dayjs';
import { $t } from '@/locales';

/**
 * Format a backend datetime string for display.
 *
 * 后端返回无时区后缀的 ISO 串（Java `LocalDateTime` 序列化，墙上时钟北京时间，
 * 如 `2026-08-03T23:52:54.587222`）。按北京时间原样处理——**不做时区转换**，
 * dayjs 直接 format（dayjs 能正确解析 6 位微秒）。
 *
 * `null` / 空串 / 非法日期 → 返回 `'-'`（沿用现有占位约定）。
 *
 * @param value datetime 字符串，可空
 * @param fmt dayjs format token，默认 `YYYY-MM-DD HH:mm:ss`
 */
export function formatDateTime(value?: string | null, fmt: string = 'YYYY-MM-DD HH:mm:ss') {
  if (!value) return '-';
  const d = dayjs(value);
  if (!d.isValid()) return '-';
  return d.format(fmt);
}

/**
 * Format a money amount (integer cents) for display as `¥1,234.56`.
 *
 * payment 域金额单位为**整数分**（`Long`，admin BFF 原值透传），故统一 ÷100 展示：
 * 千分位 + 2 位小数 + `¥` 前缀。列表 / 详情 / 仪表盘共用，保证金额展示一致。
 *
 * `null` / 空串 / 非数 → 返回 `'-'`（沿用占位约定）。
 *
 * （spec「假设整数分、接真核对」——payment 服务侧 #9–#18 联调时核对单位。）
 *
 * @param cents 整数分（number 或字符串），可空
 */
export function formatMoney(cents?: number | string | null): string {
  if (cents === null || cents === undefined || cents === '') return '-';
  const n = Number(cents);
  if (Number.isNaN(n)) return '-';
  return `¥${(n / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Transform record to option
 *
 * @example
 *   ```ts
 *   const record = {
 *     key1: 'label1',
 *     key2: 'label2'
 *   };
 *   const options = transformRecordToOption(record);
 *   // [
 *   //   { value: 'key1', label: 'label1' },
 *   //   { value: 'key2', label: 'label2' }
 *   // ]
 *   ```;
 *
 * @param record
 */
export function transformRecordToOption<T extends Record<string, string>>(record: T) {
  return Object.entries(record).map(([value, label]) => ({
    value,
    label
  })) as CommonType.Option<keyof T, T[keyof T]>[];
}

/**
 * Translate options
 *
 * @param options
 */
export function translateOptions(options: CommonType.Option<string, App.I18n.I18nKey>[]) {
  return options.map(option => ({
    ...option,
    label: $t(option.label)
  }));
}

/**
 * Toggle html class
 *
 * @param className
 */
export function toggleHtmlClass(className: string) {
  function add() {
    document.documentElement.classList.add(className);
  }

  function remove() {
    document.documentElement.classList.remove(className);
  }

  return {
    add,
    remove
  };
}
