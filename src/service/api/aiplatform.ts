/**
 * AI 平台管理 API（#56/#57/#58）——admin BFF `/api/admin/aiplatform/**`（前端只调 admin 后端，不直连 provider）。
 *
 * 订单域（T1 tracer bullet，6 端点）。契约正本 = admin :8081 `/v3/api-docs`：
 * - 分页全链 1-based（ADR-0012）：`page` 直传零 ±1。
 * - `status` 多选：逗号分隔单值（`status=1,5`——BFF 拼串透传 provider 签名协议，
 *   `status=1&status=2` 重复键会被 provider 签名丢弃，故不能交给 axios 默认数组序列化）。
 * - 写操作身份不进 body——经 admin 出站 `X-User-Id`/`X-User-Name` 自动注入，provider 落操作者列。
 * - 三写成功回执 `OrderWriteAck`（前端不回读此体，自行回详情 + 刷列表）。
 * - 源码包 = tar.gz 二进制流（**无 ApiResponse 信封**）：`responseType: 'blob'`，
 *   失败信封（content-type json）由 @sa/axios 自动 blob→json 走 onError 统一 toast。
 *
 * 项目域（T2，6 读端点）。与订单域有意不同：status **三档单选单值直传**（全部/进行中/已归档，
 * 无逗号拼接）；四 tab 数据各自独立端点、抽屉内按 tab 懒加载；对话史/PRD/版本无分页（全量数组）。
 *
 * 项目交付物文件区（T3，3 端点）：文件树只列文件（目录由前端按路径段合成）、内容点读、
 * 文件包 tar.gz 二进制流（同订单源码包——无信封 `responseType: 'blob'`）。文件区挂项目不挂订单：
 * 未下单项目可浏览、归档项目照读。
 *
 * 沙箱域（T4，6 端点）：期望态/实态两列如实分示（漂移=期望运行而实态无容器，actual=3 即捞漂移清单）；
 * 四写均无 body、响应＝动作后的观测详情（WorkspaceDetail）——区别于订单 OrderWriteAck，
 * 响应即新事实，前端直接回填抽屉免二次回读 + 刷列表。实态/卷大小逐行现场探查（docker 子进程）。
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

/** GET /aiplatform/projects——项目清单（四维检索：status 三档单选/创建时间区间/externalId/projectId 精确）。 */
export function fetchGetAiplatformProjectList(params: Api.Aiplatform.ProjectSearchParams) {
  return request<Api.Common.PageResponse<Api.Aiplatform.ProjectSummary>>({
    url: '/aiplatform/projects',
    method: 'get',
    params
  });
}

/** GET /aiplatform/projects/{id}——项目详情（订单引用双档 active/latest + 成本指针 + 工作区引用）。 */
export function fetchGetAiplatformProject(id: string) {
  return request<Api.Aiplatform.ProjectDetail>({ url: `/aiplatform/projects/${id}`, method: 'get' });
}

/** GET /aiplatform/projects/{id}/conversation——对话史（全量同序 id 升序=对话序；REQ-20 载荷跳过只渲染 text/kind/answered/at）。 */
export function fetchGetAiplatformProjectConversation(id: string) {
  return request<Api.Aiplatform.ConversationEntry[]>({ url: `/aiplatform/projects/${id}/conversation`, method: 'get' });
}

/** GET /aiplatform/projects/{id}/prd——PRD 全文（工作区直读；未产出 404 PRJ_015 走 onError 透传 toast）。 */
export function fetchGetAiplatformProjectPrd(id: string) {
  return request<Api.Aiplatform.PrdContent>({ url: `/aiplatform/projects/${id}/prd`, method: 'get' });
}

/** GET /aiplatform/projects/{id}/versions——版本列表（git log 新→旧；零版本=空列表非错误）。 */
export function fetchGetAiplatformProjectVersions(id: string) {
  return request<Api.Aiplatform.VersionSummary[]>({ url: `/aiplatform/projects/${id}/versions`, method: 'get' });
}

/** GET /aiplatform/projects/{id}/versions/{ref}——版本详情（锚定收尾卡 closing，可空兜底）。 */
export function fetchGetAiplatformProjectVersionDetail(id: string, ref: string) {
  return request<Api.Aiplatform.VersionDetail>({ url: `/aiplatform/projects/${id}/versions/${ref}`, method: 'get' });
}

/** GET /aiplatform/projects/{id}/files——文件树（[{path,size}] 只列文件，目录由前端按路径段合成；归档项目照读）。 */
export function fetchGetAiplatformProjectFiles(id: string) {
  return request<Api.Aiplatform.ProjectFiles>({ url: `/aiplatform/projects/${id}/files`, method: 'get' });
}

/** GET /aiplatform/projects/{id}/files/content?path=——文本文件内容（path 为文件树条目原样回传；机密/超 1MiB/非文本拒读由 provider 全裁决，HTTP 非 2xx）。 */
export function fetchGetAiplatformProjectFileContent(id: string, path: string) {
  return request<Api.Aiplatform.FileContent>({
    url: `/aiplatform/projects/${id}/files/content`,
    method: 'get',
    params: { path }
  });
}

/** GET /aiplatform/projects/{id}/files/package——文件包 tar.gz 二进制流（无信封，成功返回 Blob；sealed=-archive/未封存=-source 文件名由 provider 经 Content-Disposition 透传）。 */
export function fetchDownloadProjectFilesPackage(id: string) {
  return request<Blob, 'blob'>({ url: `/aiplatform/projects/${id}/files/package`, method: 'get', responseType: 'blob' });
}

/** GET /aiplatform/workspaces——沙箱清单（desired/actual 单选可组合；分页 1-based，size 上界 100——实态逐行探查，观测页不必贪大）。 */
export function fetchGetAiplatformWorkspaceList(params: Api.Aiplatform.WorkspaceSearchParams) {
  return request<Api.Common.PageResponse<Api.Aiplatform.WorkspaceSummary>>({
    url: '/aiplatform/workspaces',
    method: 'get',
    params
  });
}

/** GET /aiplatform/workspaces/{id}——沙箱详情（清单行超集：网络名/置备失败原因/封存包寻址键/审计列/中间件资源）。 */
export function fetchGetAiplatformWorkspace(id: string) {
  return request<Api.Aiplatform.WorkspaceDetail>({ url: `/aiplatform/workspaces/${id}`, method: 'get' });
}

/* 四写（均无 body；响应＝动作后的观测详情——前端回填抽屉 + 刷列表，不二次回读）。 */

/** POST /aiplatform/workspaces/{id}/wake——唤醒（等就绪；封存态走深度唤醒，漂移行幂等重建）。 */
export function fetchWakeAiplatformWorkspace(id: string) {
  return request<Api.Aiplatform.WorkspaceDetail>({ url: `/aiplatform/workspaces/${id}/wake`, method: 'post' });
}

/** POST /aiplatform/workspaces/{id}/hibernate——强制休眠（立即删容器保卷；已休眠幂等成功）。 */
export function fetchHibernateAiplatformWorkspace(id: string) {
  return request<Api.Aiplatform.WorkspaceDetail>({ url: `/aiplatform/workspaces/${id}/hibernate`, method: 'post' });
}

/** POST /aiplatform/workspaces/{id}/rebuild——强制重建（rm＋幂等重建，卷保留数据不动）。 */
export function fetchRebuildAiplatformWorkspace(id: string) {
  return request<Api.Aiplatform.WorkspaceDetail>({ url: `/aiplatform/workspaces/${id}/rebuild`, method: 'post' });
}

/** POST /aiplatform/workspaces/{id}/seal——封存（产物同自动封存：打包落存储＋删卷）。 */
export function fetchSealAiplatformWorkspace(id: string) {
  return request<Api.Aiplatform.WorkspaceDetail>({ url: `/aiplatform/workspaces/${id}/seal`, method: 'post' });
}
