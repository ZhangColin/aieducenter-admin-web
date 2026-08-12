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
 * 本片（T1 / #43）只落支付订单列表；其余端点随退款/详情/生命周期/写操作/仪表盘各 ticket 增补。
 */

/** 支付订单分页列表（GET /payments） */
export function fetchGetPaymentOrderList(params: Api.Payment.PaymentOrderSearchParams) {
  return request<Api.Common.PageResponse<Api.Payment.PaymentOrderSummary>>({
    url: '/payment/payments',
    method: 'get',
    params
  });
}
