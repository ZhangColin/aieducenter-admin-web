/**
 * 支付管理领域枚举常量（payment 能力域，经 admin BFF 原值透传）。
 *
 * 与 SystemManage 的整数枚举不同：payment 枚举为 **Java enum 名字符串**（`'PENDING'` / `'WECHAT'` …），
 * admin BFF 不转整数 code。故：
 * - record 键类型用 payment 的**枚举名字面量联合**（string），非 number；
 * - options 直接用 `transformRecordToOption`（string 键无 `Object.entries` 把 number 压 string 的问题），
 *   产物 `Option<string, I18nKey>[]`，value 即枚举名、label 为 i18n key。
 * - NSelect 渲染处用 computed 翻译（语言切换可响应）；表格列渲染 `$t(record[value])` + 内联 tagMap 配色。
 *
 * 9 组闭合枚举（refund/log 详情页 T2–T5 复用，本文件一次落地）：
 * paymentStatus / payMode / accessType / paymentChannel / refundStatus / auditType /
 * logType / operationType / operationTargetType。
 *
 * 注：`OperationLog.result`（操作结果）是自由稳定 token、非闭合集合，不在此建 options——其筛选走文本输入（T4）。
 */
import { transformRecordToOption } from '@/utils/common';

// ============ 支付订单 ============

/** 支付订单状态（payment PaymentStatus） */
export const paymentStatusRecord: Record<Api.Payment.PaymentStatus, App.I18n.I18nKey> = {
  PENDING: 'page.payment.enum.paymentStatus.pending',
  PAID: 'page.payment.enum.paymentStatus.paid',
  FAILED: 'page.payment.enum.paymentStatus.failed',
  CANCELLED: 'page.payment.enum.paymentStatus.cancelled',
  EXPIRED: 'page.payment.enum.paymentStatus.expired'
};
export const paymentStatusOptions = transformRecordToOption(paymentStatusRecord);

/** 支付方式（payment PayMode） */
export const payModeRecord: Record<Api.Payment.PayMode, App.I18n.I18nKey> = {
  WECHAT: 'page.payment.enum.payMode.wechat',
  ALIPAY: 'page.payment.enum.payMode.alipay',
  UNIONPAY: 'page.payment.enum.payMode.unionpay'
};
export const payModeOptions = transformRecordToOption(payModeRecord);

/** 接入类型（payment AccessType） */
export const accessTypeRecord: Record<Api.Payment.AccessType, App.I18n.I18nKey> = {
  H5: 'page.payment.enum.accessType.h5',
  APP: 'page.payment.enum.accessType.app',
  WECHAT_OA: 'page.payment.enum.accessType.wechatOa',
  ALIPAY_LIFE: 'page.payment.enum.accessType.alipayLife',
  MINI_PROGRAM: 'page.payment.enum.accessType.miniProgram'
};
export const accessTypeOptions = transformRecordToOption(accessTypeRecord);

/** 支付通道（payment PaymentChannel） */
export const paymentChannelRecord: Record<Api.Payment.PaymentChannel, App.I18n.I18nKey> = {
  ICBC: 'page.payment.enum.paymentChannel.icbc'
};
export const paymentChannelOptions = transformRecordToOption(paymentChannelRecord);

// ============ 退款订单 ============

/** 退款订单状态（payment RefundStatus） */
export const refundStatusRecord: Record<Api.Payment.RefundStatus, App.I18n.I18nKey> = {
  PENDING: 'page.payment.enum.refundStatus.pending',
  REJECTED: 'page.payment.enum.refundStatus.rejected',
  APPROVED: 'page.payment.enum.refundStatus.approved',
  REFUNDING: 'page.payment.enum.refundStatus.refunding',
  SUCCESS: 'page.payment.enum.refundStatus.success',
  FAILED: 'page.payment.enum.refundStatus.failed'
};
export const refundStatusOptions = transformRecordToOption(refundStatusRecord);

/** 退款审核类型（payment AuditType）：MANUAL=人工审核 / AUTO=免审 */
export const auditTypeRecord: Record<Api.Payment.AuditType, App.I18n.I18nKey> = {
  MANUAL: 'page.payment.enum.auditType.manual',
  AUTO: 'page.payment.enum.auditType.auto'
};
export const auditTypeOptions = transformRecordToOption(auditTypeRecord);

// ============ 日志 ============

/** 通道交互日志类型（payment PaymentLog.logType；String，取值稳定） */
export const logTypeRecord: Record<Api.Payment.LogType, App.I18n.I18nKey> = {
  PAYMENT_REQUEST: 'page.payment.enum.logType.paymentRequest',
  PAYMENT_QUERY: 'page.payment.enum.logType.paymentQuery',
  PAYMENT_CANCEL: 'page.payment.enum.logType.paymentCancel',
  REFUND_REQUEST: 'page.payment.enum.logType.refundRequest',
  REFUND_QUERY: 'page.payment.enum.logType.refundQuery',
  PAYMENT_CALLBACK: 'page.payment.enum.logType.paymentCallback'
};
export const logTypeOptions = transformRecordToOption(logTypeRecord);

/** 订单操作类型（payment OperationType） */
export const operationTypeRecord: Record<Api.Payment.OperationType, App.I18n.I18nKey> = {
  AUDIT_APPROVE: 'page.payment.enum.operationType.auditApprove',
  AUDIT_REJECT: 'page.payment.enum.operationType.auditReject',
  NOTIFY_RESEND: 'page.payment.enum.operationType.notifyResend'
};
export const operationTypeOptions = transformRecordToOption(operationTypeRecord);

/** 订单操作记录目标类型（payment OperationLogTargetType） */
export const operationTargetTypeRecord: Record<Api.Payment.OperationTargetType, App.I18n.I18nKey> = {
  PAYMENT: 'page.payment.enum.operationTargetType.payment',
  REFUND: 'page.payment.enum.operationTargetType.refund'
};
export const operationTargetTypeOptions = transformRecordToOption(operationTargetTypeRecord);
