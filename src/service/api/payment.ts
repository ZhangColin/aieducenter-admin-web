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
 * 其余端点随退款/日志/写操作/仪表盘各 ticket 增补。
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
