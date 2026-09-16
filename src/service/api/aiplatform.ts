/**
 * AI 平台管理 API（#56/#57）——admin BFF `/api/admin/aiplatform/**`（前端只调 admin 后端，不直连 provider）。
 *
 * 订单域（T1 tracer bullet，6 端点）。契约正本 = admin :8081 `/v3/api-docs`：
 * - 分页全链 1-based（ADR-0012）：`page` 直传零 ±1。
 * - `status` 多选：逗号分隔单值（`status=1,5`——BFF 拼串透传 provider 签名协议，
 *   `status=1&status=2` 重复键会被 provider 签名丢弃，故不能交给 axios 默认数组序列化）。
 * - 写操作身份不进 body——经 admin 出站 `X-User-Id`/`X-User-Name` 自动注入，provider 落操作者列。
 * - 三写成功回执 `OrderWriteAck`（前端不回读此体，自行回详情 + 刷列表）。
 * - 源码包 = tar.gz 二进制流（**无 ApiResponse 信封**）：`responseType: 'blob'`，
 *   失败信封（content-type json）由 @sa/axios 自动 blob→json 走 onError 统一 toast。
 */
import { request } from '../request';

/** GET /aiplatform/orders——订单清单（四维检索：status 多选/创建时间区间/externalId/orderId 精确）。 */
export function fetchGetAiplatformOrderList(params: Api.Aiplatform.OrderSearchParams) {
  const serialized: Record<string, unknown> = { ...params };
  if (params.status?.length) {
    serialized.status = params.status.join(',');
  } else {
    delete serialized.status;
  }
  return request<Api.Common.PageResponse<Api.Aiplatform.OrderSummary>>({
    url: '/aiplatform/orders',
    method: 'get',
    params: serialized
  });
}

/** GET /aiplatform/orders/{id}——订单详情（价目史 append-only 全量新→旧 + PRD 快照）。 */
export function fetchGetAiplatformOrder(id: string) {
  return request<Api.Aiplatform.OrderDetail>({ url: `/aiplatform/orders/${id}`, method: 'get' });
}

/** POST /aiplatform/orders/{id}/quote——提交报价（已报价态重复提交＝改价）。 */
export function fetchQuoteAiplatformOrder(id: string, data: Api.Aiplatform.QuoteOrderCommand) {
  return request<Api.Aiplatform.OrderWriteAck>({ url: `/aiplatform/orders/${id}/quote`, method: 'post', data });
}

/** POST /aiplatform/orders/{id}/cancel——运营取消（限未支付态，reason 必填）。 */
export function fetchCancelAiplatformOrder(id: string, data: Api.Aiplatform.CancelOrderCommand) {
  return request<Api.Aiplatform.OrderWriteAck>({ url: `/aiplatform/orders/${id}/cancel`, method: 'post', data });
}

/** POST /aiplatform/orders/{id}/retry-archive——重试归档（已支付未归档卡单补归档）。 */
export function fetchRetryArchiveAiplatformOrder(id: string) {
  return request<Api.Aiplatform.OrderWriteAck>({ url: `/aiplatform/orders/${id}/retry-archive`, method: 'post' });
}

/** GET /aiplatform/orders/{id}/source-package——源码包 tar.gz 二进制流（无信封，成功返回 Blob）。 */
export function fetchDownloadOrderSourcePackage(id: string) {
  return request<Blob, 'blob'>({ url: `/aiplatform/orders/${id}/source-package`, method: 'get', responseType: 'blob' });
}
