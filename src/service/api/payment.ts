import { request } from '../request';

/**
 * 支付管理（admin 后端 `/api/admin/payment/**`，BFF 透传 payment 能力域）。
 *
 * 独立 API 模块（不并入 system-manage）：payment 是独立限界上下文、体量最大。
 * 分页约定同 SystemManage：请求 `page` **0-based**、响应 `PageResponse{ items, total, page(1-based), size }`。
 *
 * 端点面（北向 `/api/admin/payment`，权限码 `admin:payment:read` / `:refund:audit` / `:notification:resend` / `:bank:query`）：
 * - 读·列表：`/payments` / `/refunds` / `/payment-logs` / `/operation-logs`
 * - 读·详情/生命周期：`/payments/{no}` / `/refunds/{no}` / `/orders/{no}/lifecycle`
 * - 写·运营：`POST /refunds/{no}/audit`、`POST /payments/{no}/notifications/resend`、`POST /refunds/{no}/notifications/resend`
 * - 统计：tier-1（overview / status-distribution / gateway-health / operations-audit）+ tier-2（by-business-system / by-channel / anomalies / operations-activity）
 *
 * 已落端点：
 * - T1 / #43：支付订单列表 `GET /payments`。
 * - T2 / #44：支付订单详情 `GET /payments/{no}`、订单生命周期 `GET /orders/{no}/lifecycle`、
 *   通知重发 `POST /payments/{no}/notifications/resend`。
 * - T3 / #45：退款订单列表 `GET /refunds`。
 * - T4 / #48：退款订单详情 `GET /refunds/{no}`、退款审核 `POST /refunds/{no}/audit`、
 *   退款通知重发 `POST /refunds/{no}/notifications/resend`。
 * - T5 / #46：通道交互日志列表 `GET /payment-logs`、订单操作记录列表 `GET /operation-logs`。
 * 其余端点随仪表盘各 ticket 增补。
 */

/** 支付订单分页列表（GET /payments） */
export function fetchGetPaymentOrderList(params: Api.Payment.PaymentOrderSearchParams) {
  return request<Api.Common.PageResponse<Api.Payment.PaymentOrderSummary>>({
    url: '/payment/payments',
    method: 'get',
    params
  });
}

/** 支付订单详情（GET /payments/{paymentOrderNo}） */
export function fetchGetPaymentOrderDetail(paymentOrderNo: string) {
  return request<Api.Payment.PaymentOrderDetail>({
    url: `/payment/payments/${paymentOrderNo}`,
    method: 'get'
  });
}

/** 退款订单分页列表（GET /refunds） */
export function fetchGetRefundOrderList(params: Api.Payment.RefundOrderSearchParams) {
  return request<Api.Common.PageResponse<Api.Payment.RefundOrderSummary>>({
    url: '/payment/refunds',
    method: 'get',
    params
  });
}

/** 退款订单详情（GET /refunds/{refundOrderNo}） */
export function fetchGetRefundOrderDetail(refundOrderNo: string) {
  return request<Api.Payment.RefundOrderDetail>({
    url: `/payment/refunds/${refundOrderNo}`,
    method: 'get'
  });
}

/**
 * 审核退款（POST /refunds/{refundOrderNo}/audit）。
 *
 * 前端只发**决策意图**（agreed + remark）；审核人身份（auditorId/auditorName）由 admin 服务端从
 * RequestContext 注入、前端不可伪造。reject 时前端强制 remark 必填（issue #48）；后端校验 agreed 非空、
 * remark ≤512。成功返回最新详情（状态已推进），调用方据此刷新。
 * 权限码 `admin:payment:refund:audit`（本次写按钮不接门控，按 spec follow-up 统一处理——同 T2 通知重发）。
 */
export function fetchAuditRefund(refundOrderNo: string, data: Api.Payment.RefundAuditRequest) {
  return request<Api.Payment.RefundOrderDetail>({
    url: `/payment/refunds/${refundOrderNo}/audit`,
    method: 'post',
    data
  });
}

/**
 * 重发退款结果通知（POST /refunds/{refundOrderNo}/notifications/resend）。
 * 补发漏投到业务系统、**不改订单状态**（payment ADR-0001）；操作者身份由服务端从 RequestContext 注入。
 * 两个重发端点（payment / refund）共用权限码 `admin:payment:notification:resend`
 * （本次写按钮不接门控，按 spec follow-up 统一处理——同 T2 通知重发）。
 */
export function fetchResendRefundNotification(refundOrderNo: string) {
  return request<Api.Payment.RefundOrderDetail>({
    url: `/payment/refunds/${refundOrderNo}/notifications/resend`,
    method: 'post'
  });
}

/** 通道交互日志分页列表（GET /payment-logs）。纯只读——与银行/通道网关的机机交互留痕。 */
export function fetchGetPaymentLogList(params: Api.Payment.PaymentLogSearchParams) {
  return request<Api.Common.PageResponse<Api.Payment.PaymentLogSummary>>({
    url: '/payment/payment-logs',
    method: 'get',
    params
  });
}

/** 订单操作记录分页列表（GET /operation-logs）。纯只读——行为者对订单的操作留痕（合规追溯）。 */
export function fetchGetOperationLogList(params: Api.Payment.OperationLogSearchParams) {
  return request<Api.Common.PageResponse<Api.Payment.OperationLogSummary>>({
    url: '/payment/operation-logs',
    method: 'get',
    params
  });
}

/**
 * 订单生命周期（GET /orders/{orderNo}/lifecycle）。
 * payment 已在上游合并 PaymentLog + OperationLog 按 createdAt 排序返回；admin BFF 原值透传。
 * 支付/退款抽屉各传自己的 no 复用同一端点。
 */
export function fetchGetOrderLifecycle(orderNo: string) {
  return request<Api.Payment.OrderLifecycle>({
    url: `/payment/orders/${orderNo}/lifecycle`,
    method: 'get'
  });
}

/**
 * 重发支付结果通知（POST /payments/{paymentOrderNo}/notifications/resend）。
 * 补发漏投到业务系统、**不改订单状态**（payment ADR-0001）；操作者身份由服务端从 RequestContext 注入。
 * 权限码 `admin:payment:notification:resend`（本次写按钮不接门控，按 spec follow-up 统一处理）。
 */
export function fetchResendPaymentNotification(paymentOrderNo: string) {
  return request<Api.Payment.PaymentOrderDetail>({
    url: `/payment/payments/${paymentOrderNo}/notifications/resend`,
    method: 'post'
  });
}

// ============ 统计（仪表盘 tier-1，GET /stats/**）============
//
// 4 个 tier-1 端点，经 usePaymentStats store 消费（ADR-0002 seam——widget 不直连端点）。
// ⚠️ overview / gateway-health / operations-audit 带 payment 必填的 from/to 时间窗，admin BFF 现阶段
// 未转发 → 400（docs/backend-requirements/REQ-17）；status-distribution 无时间窗、正常。

/** 支付总览（GET /stats/payments/overview）——笔数·金额·成功率·净额 + 趋势 */
export function fetchGetPaymentOverview() {
  return request<Api.Payment.PaymentOverview>({
    url: '/payment/stats/payments/overview',
    method: 'get'
  });
}

/** 订单状态分布（GET /stats/orders/status-distribution）——支付/退款各状态在途 + 退款待审核积压 */
export function fetchGetOrderStatusDistribution() {
  return request<Api.Payment.OrderStatusDistribution>({
    url: '/payment/stats/orders/status-distribution',
    method: 'get'
  });
}

/** 通道健康（GET /stats/gateway/health）——各银行接口调用次数·成功率·平均耗时·返回码分布 */
export function fetchGetGatewayHealth() {
  return request<Api.Payment.GatewayHealth>({
    url: '/payment/stats/gateway/health',
    method: 'get'
  });
}

/** 审核统计（GET /stats/operations/audit）——审核笔数·通过率·平均时长 + 按审核人聚合 */
export function fetchGetOperationsAudit() {
  return request<Api.Payment.OperationsAudit>({
    url: '/payment/stats/operations/audit',
    method: 'get'
  });
}

// ============ 统计（仪表盘 tier-2，GET /stats/**）============
//
// 4 个 tier-2 端点，经 usePaymentStats store 消费（ADR-0002 seam——widget 不直连端点）。
// 与 tier-1 不同：这 4 个端点**无时间窗**（不带 from/to），不受 REQ-17 影响，应正常出数。

/** 按业务系统细分（GET /stats/by-business-system）——各业务系统支付/退款笔数·金额·成功率·退款率 */
export function fetchGetBusinessSystemStats() {
  return request<Api.Payment.BusinessSystemStats>({
    url: '/payment/stats/by-business-system',
    method: 'get'
  });
}

/** 按通道细分（GET /stats/by-channel）——按 payMode / accessType 聚合的支付笔数·金额·成功率 */
export function fetchGetChannelStats() {
  return request<Api.Payment.ChannelStats>({
    url: '/payment/stats/by-channel',
    method: 'get'
  });
}

/** 异常监控（GET /stats/anomalies）——长时滞留 PENDING/REFUNDING 订单 + 近期失败计数 */
export function fetchGetAnomalies() {
  return request<Api.Payment.PaymentAnomalies>({
    url: '/payment/stats/anomalies',
    method: 'get'
  });
}

/** 操作员活动（GET /stats/operations/activity）——各操作员操作类型·笔数 + 通知重发次数 */
export function fetchGetOperationsActivity() {
  return request<Api.Payment.OperationsActivity>({
    url: '/payment/stats/operations/activity',
    method: 'get'
  });
}
