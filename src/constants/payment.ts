/**
 * 支付管理领域枚举常量（payment 能力域，经 admin BFF 原值透传）。
 *
 * payment 枚举线上序列化分两类（#54 对齐 admin ADR-0009/0011，契约源：payment domain enums +
 * admin 仓 *ContractTest）：
 * - **BaseEnum（Integer code）**：PaymentStatus / PayMode / AccessType / PaymentChannel /
 *   RefundStatus / AuditType / OperationType / OperationLogTargetType。**响应侧** code 为 JSON
 *   **number**（如 `status: 2`，Integer→number），故本文件 record 键 = **code 字符串字面量**，
 *   消费时经 `String(code)` 归一查表（见 displayEnumName / enumTagColor——JS 对象 number key
 *   运行时本就等价 string key，这里集中归一保证类型诚实）。`transformRecordToOption` 产物
 *   `Option<code, I18nKey>`，**仅用于筛选下拉选项的 value/label**（请求侧 code 字符串提交，
 *   后端绑 Integer；展示走后端 `*Name`，见下）。
 * - **纯 String token（非 enum）**：LogType（PaymentLog.logType）——线上即 token（`"PAYMENT_REQUEST"`），
 *   record 键 = token 字面量，option value = token。
 *
 * ⚠️ 展示范式（平台统一）：枚举列/详情展示走后端序列化的 `*Name`（statusName / payModeName …，
 * admin BFF 已透传），前端只显示、不做 code→文案映射。**本文件 record 不参与展示**，
 * 仅服务筛选下拉选项 label + 标签配色（i18n record 兜底，见 displayEnumName）。
 *
 * 注：`OperationLog.result` / lifecycle 的 `outcome` 是自由稳定 token、非闭合集合，不在此建
 * options——result 筛选走文本输入，outcome 原值展示 + operationResultTagType 启发式着色。
 */
import { transformRecordToOption } from '@/utils/common';
import { $t } from '@/locales';

// ============ 支付订单 ============

/** 支付订单状态 code→i18n（payment PaymentStatus：1=待支付 2=已支付 3=支付失败 4=已取消 5=已过期） */
export const paymentStatusRecord: Record<Api.Payment.PaymentStatus, App.I18n.I18nKey> = {
  '1': 'page.payment.enum.paymentStatus.pending',
  '2': 'page.payment.enum.paymentStatus.paid',
  '3': 'page.payment.enum.paymentStatus.failed',
  '4': 'page.payment.enum.paymentStatus.cancelled',
  '5': 'page.payment.enum.paymentStatus.expired'
};
export const paymentStatusOptions = transformRecordToOption(paymentStatusRecord);

/** 支付订单状态标签配色（code→ThemeColor；运营关注状态着色） */
export const paymentStatusTagColor: Record<Api.Payment.PaymentStatus, NaiveUI.ThemeColor> = {
  '1': 'warning', // 待支付
  '2': 'success', // 已支付
  '3': 'error', // 支付失败
  '4': 'default', // 已取消
  '5': 'default' // 已过期
};

/** 支付方式 code→i18n（payment PayMode：9=微信 10=支付宝 13=云闪付） */
export const payModeRecord: Record<Api.Payment.PayMode, App.I18n.I18nKey> = {
  '9': 'page.payment.enum.payMode.wechat',
  '10': 'page.payment.enum.payMode.alipay',
  '13': 'page.payment.enum.payMode.unionpay'
};
export const payModeOptions = transformRecordToOption(payModeRecord);

/** 接入类型 code→i18n（payment AccessType：5=APP 7=微信公众号 8=支付宝生活号 9=小程序） */
export const accessTypeRecord: Record<Api.Payment.AccessType, App.I18n.I18nKey> = {
  '5': 'page.payment.enum.accessType.app',
  '7': 'page.payment.enum.accessType.wechatOa',
  '8': 'page.payment.enum.accessType.alipayLife',
  '9': 'page.payment.enum.accessType.miniProgram'
};
export const accessTypeOptions = transformRecordToOption(accessTypeRecord);

/** 支付通道 code→i18n（payment PaymentChannel：1=工商银行） */
export const paymentChannelRecord: Record<Api.Payment.PaymentChannel, App.I18n.I18nKey> = {
  '1': 'page.payment.enum.paymentChannel.icbc'
};
export const paymentChannelOptions = transformRecordToOption(paymentChannelRecord);

// ============ 退款订单 ============

/** 退款订单状态 code→i18n（payment RefundStatus：1=待审核 2=已拒绝 3=已批准 4=退款中 5=退款成功 6=退款失败） */
export const refundStatusRecord: Record<Api.Payment.RefundStatus, App.I18n.I18nKey> = {
  '1': 'page.payment.enum.refundStatus.pending',
  '2': 'page.payment.enum.refundStatus.rejected',
  '3': 'page.payment.enum.refundStatus.approved',
  '4': 'page.payment.enum.refundStatus.refunding',
  '5': 'page.payment.enum.refundStatus.success',
  '6': 'page.payment.enum.refundStatus.failed'
};
export const refundStatusOptions = transformRecordToOption(refundStatusRecord);

/** 退款订单状态标签配色（code→ThemeColor） */
export const refundStatusTagColor: Record<Api.Payment.RefundStatus, NaiveUI.ThemeColor> = {
  '1': 'warning', // 待审核
  '2': 'error', // 已拒绝
  '3': 'default', // 已批准
  '4': 'info', // 退款中
  '5': 'success', // 退款成功
  '6': 'error' // 退款失败
};

/** 退款审核类型 code→i18n（payment AuditType：1=免审 2=人工审核） */
export const auditTypeRecord: Record<Api.Payment.AuditType, App.I18n.I18nKey> = {
  '1': 'page.payment.enum.auditType.auto',
  '2': 'page.payment.enum.auditType.manual'
};
export const auditTypeOptions = transformRecordToOption(auditTypeRecord);

// ============ 日志 ============

/** 通道交互日志类型 token→i18n（payment PaymentLog.logType；纯 String token，非闭合） */
export const logTypeRecord: Record<Api.Payment.LogType, App.I18n.I18nKey> = {
  PAYMENT_REQUEST: 'page.payment.enum.logType.paymentRequest',
  PAYMENT_QUERY: 'page.payment.enum.logType.paymentQuery',
  PAYMENT_CANCEL: 'page.payment.enum.logType.paymentCancel',
  REFUND_REQUEST: 'page.payment.enum.logType.refundRequest',
  REFUND_QUERY: 'page.payment.enum.logType.refundQuery',
  PAYMENT_CALLBACK: 'page.payment.enum.logType.paymentCallback'
};
export const logTypeOptions = transformRecordToOption(logTypeRecord);

/** 订单操作类型 code→i18n（payment OperationType：1=审核通过 2=审核拒绝 3=通知重发） */
export const operationTypeRecord: Record<Api.Payment.OperationType, App.I18n.I18nKey> = {
  '1': 'page.payment.enum.operationType.auditApprove',
  '2': 'page.payment.enum.operationType.auditReject',
  '3': 'page.payment.enum.operationType.notifyResend'
};
export const operationTypeOptions = transformRecordToOption(operationTypeRecord);

/** 订单操作记录目标类型 code→i18n（payment OperationLogTargetType：1=支付订单 2=退款订单） */
export const operationTargetTypeRecord: Record<Api.Payment.OperationTargetType, App.I18n.I18nKey> = {
  '1': 'page.payment.enum.operationTargetType.payment',
  '2': 'page.payment.enum.operationTargetType.refund'
};
export const operationTargetTypeOptions = transformRecordToOption(operationTargetTypeRecord);

// ============ stats 聚合维度 ============
//
// （#54 对齐后本段无常量）stats 端点维度（by-channel / operations-activity）与列表/详情同范式：
// Integer code + 后端 `*Name` 中文名（channelName / operationName）直读展示——旧 NAME-token
// record（payModeNameRecord 等，按 WECHAT/AUDIT_APPROVE 键）已随契约作废删除。

/**
 * 枚举展示（平台统一范式）：后端 `*Name` 优先 → 既有 i18n record 兜底 → code → '-'。
 *
 * 列表/详情/仪表盘所有枚举列共用。
 * - **statusName 优先**：后端序列化的中文 label 是统一来源（同 SystemManage 范式）。
 * - **i18n record 兜底**：`*Name` 缺失（枚举本身为 null 等）时以本文件 record 翻译——与筛选下拉
 *   选项同源；record 也未命中则原值回退（非闭合 code 不报错）。
 * - 纯 token 枚举（LogType）无 `*Name`，直接走 record（token 键）。
 *
 * @param name 后端序列化的中文名（statusName / payModeName …），可空
 * @param code 枚举 code（响应侧 JSON **number**，经 String() 归一查表）/ token 字符串，可空
 * @param record code/token → i18n key 的映射（同文件 record），可选
 */
export function displayEnumName<K extends string>(
  name: string | null | undefined,
  code: K | number | null | undefined,
  record?: Record<K, App.I18n.I18nKey>
): string {
  if (name) return name;
  if (code === null || code === undefined || code === '') return '-';
  const key = String(code) as K;
  if (record && record[key]) return $t(record[key]);
  return key;
}

/**
 * 枚举 code（响应侧 JSON number）→ 标签配色。
 *
 * 配色 record 键 = code 字符串字面量（与筛选 options 同源，见 paymentStatusTagColor 等）；
 * number code 经 `String()` 归一后查表（JS 对象 number key 运行时等价 string key，这里集中
 * 归一保证类型诚实），未知 code 回退 default（不报错）。列表/详情/仪表盘枚举 tag 共用。
 *
 * @param colorMap code 字符串 → ThemeColor 的映射（同文件 *TagColor）
 * @param code 枚举 code（number 或字符串字面量），可空
 */
export function enumTagColor<K extends string>(
  colorMap: Partial<Record<K, NaiveUI.ThemeColor>>,
  code: number | K | null | undefined
): NaiveUI.ThemeColor {
  if (code === null || code === undefined || code === '') return 'default';
  return colorMap[String(code) as K] ?? 'default';
}

/**
 * `OperationLog.result` 标签配色（自由稳定 token，非闭合集合：SUCCESS / DELIVERY_FAILED / SKIPPED /
 * APPROVE / REJECT …）。按已知 token 启发式着色，未知 token → default，不报错。
 *
 * 列表（操作记录页 result 列）与详情抽屉生命周期 outcome tag 共用，避免两处分叉（SUCCESS/FAIL/SKIPPED
 * 与 FAIL/ERROR/REJECT/SUCCESS/APPROVE/OK/DONE 两套规则收敛为一）。
 */
export function operationResultTagType(result: string | null | undefined): NaiveUI.ThemeColor {
  if (!result) return 'default';
  const r = result.toUpperCase();
  if (r.includes('FAIL') || r.includes('ERROR') || r.includes('REJECT')) return 'error';
  if (r.includes('SUCCESS') || r.includes('APPROVE') || r === 'OK' || r === 'DONE') return 'success';
  if (r === 'SKIPPED') return 'warning';
  return 'default';
}
