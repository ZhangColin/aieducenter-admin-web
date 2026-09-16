/**
 * 单价表域 E2E mock fixtures（#62）——字段形状派生自 admin :8081 `/v3/api-docs`：
 * - `AiplatformUnitPriceEntryResponse`（列表行 = 改价回执 closed/opened 行 = 停用回执，同 schema）：
 *   id/provider/model/tokenKind·tokenKindName/unitPrice/currency/effectiveFrom/effectiveTo/
 *   operatorId/operatorName
 * - `AiplatformPriceEntryRepriceCommand`（unitPrice JSON **number**——区别于响应 string，REQ-20 #75）
 *
 * 契约要点（api-docs + :8081 实测，2026-09-17）：unitPrice 为 BigDecimal → JSON **string** 明文小数
 * （如 "0.000000014"，微小价位非科学计数法形）；tokenKind Integer code 1=输入 2=输出 3=缓存读
 * 4=缓存写 5=推理 + tokenKindName 随行；effectiveFrom/effectiveTo ISO-8601 Instant UTC 带 Z
 * （e2e 机本地时区渲染由页侧 formatDateTime 折算，断言侧同法计算）；effectiveTo null 即当前行；
 * 清单含历史行全量、排序服务端定死生效起点倒序（fixtures 预排）；operator 两列 = 该行最近管理
 * 动作留痕（种子行 null）。无「开行」端点——种子脚本通道不暴露。
 *
 * 覆盖矩阵：deepseek（现 6 行 + 已关史行 1——陈运营改价痕）/ anthropic（现 3——provider 过滤靶）/
 * qwen（现 2，CNY——停用靶）。改价/停写变异由 harness 就地改行 + unshift 新行（刷新后清单如实呈现）。
 */

/** 改价回执新开行 id（harness applyReprice 固定产出；E2E 刷新断言锚点）。 */
export const OPENED_ROW_ID = '357701099900000099';

/** 停用即时生效时刻（harness applyDeactivate 固定产出；本地时区折算后断言）。 */
export const DEACTIVATED_AT = '2026-09-17T08:00:00Z';

/** 列表行（12 条 = 两页 @size10；预排生效起点倒序——首行为已关史行（最新起点））。 */
export const PRICE_ENTRY_ROWS = [
  {
    id: '357701031200000101',
    provider: 'deepseek',
    model: 'deepseek-v4-flash',
    tokenKind: 1,
    tokenKindName: '输入',
    unitPrice: '0.00000050',
    currency: 'USD',
    effectiveFrom: '2026-06-01T16:00:00Z',
    effectiveTo: '2026-09-01T16:00:00Z',
    operatorId: '3',
    operatorName: '陈运营'
  },
  {
    id: '357701022055576431',
    provider: 'deepseek',
    model: 'deepseek-v4-flash',
    tokenKind: 1,
    tokenKindName: '输入',
    unitPrice: '0.00000044',
    currency: 'USD',
    effectiveFrom: '2026-01-01T16:00:00Z',
    effectiveTo: null,
    operatorId: null,
    operatorName: null
  },
  {
    id: '357701022659621666',
    provider: 'deepseek',
    model: 'deepseek-v4-flash',
    tokenKind: 2,
    tokenKindName: '输出',
    unitPrice: '0.00000132',
    currency: 'USD',
    effectiveFrom: '2026-01-01T16:00:00Z',
    effectiveTo: null,
    operatorId: null,
    operatorName: null
  },
  {
    id: '357701022362578014',
    provider: 'deepseek',
    model: 'deepseek-v4-flash',
    tokenKind: 3,
    tokenKindName: '缓存读',
    unitPrice: '0.000000014',
    currency: 'USD',
    effectiveFrom: '2026-01-01T16:00:00Z',
    effectiveTo: null,
    operatorId: null,
    operatorName: null
  },
  {
    id: '357701021408671199',
    provider: 'deepseek',
    model: 'deepseek-v4-pro',
    tokenKind: 3,
    tokenKindName: '缓存读',
    unitPrice: '0.000000044',
    currency: 'USD',
    effectiveFrom: '2026-01-01T16:00:00Z',
    effectiveTo: null,
    operatorId: null,
    operatorName: null
  },
  {
    id: '357701021726783651',
    provider: 'deepseek',
    model: 'deepseek-v4-pro',
    tokenKind: 2,
    tokenKindName: '输出',
    unitPrice: '0.00000396',
    currency: 'USD',
    effectiveFrom: '2026-01-01T16:00:00Z',
    effectiveTo: null,
    operatorId: null,
    operatorName: null
  },
  {
    id: '357701021099000321',
    provider: 'deepseek',
    model: 'deepseek-v4-pro',
    tokenKind: 1,
    tokenKindName: '输入',
    unitPrice: '0.0000011',
    currency: 'USD',
    effectiveFrom: '2026-01-01T16:00:00Z',
    effectiveTo: null,
    operatorId: null,
    operatorName: null
  },
  {
    id: '357701020855000210',
    provider: 'anthropic',
    model: 'claude-sonnet-5',
    tokenKind: 1,
    tokenKindName: '输入',
    unitPrice: '0.00000275',
    currency: 'USD',
    effectiveFrom: '2026-01-01T16:00:00Z',
    effectiveTo: null,
    operatorId: null,
    operatorName: null
  },
  {
    id: '357701020611000108',
    provider: 'anthropic',
    model: 'claude-sonnet-5',
    tokenKind: 2,
    tokenKindName: '输出',
    unitPrice: '0.000011',
    currency: 'USD',
    effectiveFrom: '2026-01-01T16:00:00Z',
    effectiveTo: null,
    operatorId: null,
    operatorName: null
  },
  {
    id: '357701020377000017',
    provider: 'anthropic',
    model: 'claude-sonnet-5',
    tokenKind: 3,
    tokenKindName: '缓存读',
    unitPrice: '0.00000030',
    currency: 'USD',
    effectiveFrom: '2026-01-01T16:00:00Z',
    effectiveTo: null,
    operatorId: null,
    operatorName: null
  },
  {
    id: '357701019922000066',
    provider: 'qwen',
    model: 'qwen4-max',
    tokenKind: 1,
    tokenKindName: '输入',
    unitPrice: '0.000004',
    currency: 'CNY',
    effectiveFrom: '2026-01-01T16:00:00Z',
    effectiveTo: null,
    operatorId: null,
    operatorName: null
  },
  {
    id: '357701019688000015',
    provider: 'qwen',
    model: 'qwen4-max',
    tokenKind: 2,
    tokenKindName: '输出',
    unitPrice: '0.000012',
    currency: 'CNY',
    effectiveFrom: '2026-01-01T16:00:00Z',
    effectiveTo: null,
    operatorId: null,
    operatorName: null
  }
];
