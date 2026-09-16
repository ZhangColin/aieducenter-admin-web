/**
 * 平台账号管理 API（#50）——admin BFF `/api/admin/accounts/**`（前端只调 admin 后端，不直连 identity）。
 *
 * 权限：读 `admin:account:read`（列表/详情）、写 `admin:account:write`（四操作，已定不拆）。
 * 分页：全链 1-based（REQ-18 已落地，identity #78 起；#52 联调删去临时 +1 适配）。
 * 写操作响应均为 `data: null` 的成功 ack（不回读），前端成功后自行回读详情/刷新列表。
 * 操作者身份不进 body——经 X-User-Id/X-User-Name 出站 header 自动透传给 identity 审计。
 */
import { request } from '../request';

/** GET /accounts——分页搜索。 */
export function fetchGetAccountList(params: Api.Account.AccountSearchParams) {
  return request<Api.Common.PageResponse<Api.Account.AccountSummary>>({ url: '/accounts', method: 'get', params });
}

/** GET /accounts/{userId}/management——管理详情（字段与列表行同构）。 */
export function fetchGetAccountManagementDetail(userId: string) {
  return request<Api.Account.AccountManagementDetail>({ url: `/accounts/${userId}/management`, method: 'get' });
}

/** POST /accounts/{userId}/disable——封号（reason 必填 ≤500）；identity 自动踢全部会话。 */
export function fetchDisableAccount(userId: string, data: Api.Account.DisableAccountCommand) {
  return request<null>({ url: `/accounts/${userId}/disable`, method: 'post', data });
}

/** POST /accounts/{userId}/activate——解封；不改会话（封号时已清，用户须重新登录）。 */
export function fetchActivateAccount(userId: string) {
  return request<null>({ url: `/accounts/${userId}/activate`, method: 'post' });
}

/** POST /accounts/{userId}/unlock——解除系统锁定；只清 locked，不改状态、不动会话。 */
export function fetchUnlockAccount(userId: string) {
  return request<null>({ url: `/accounts/${userId}/unlock`, method: 'post' });
}

/** POST /accounts/{userId}/sessions/revoke——强制下线；只踢人，无会话撤 0 个仍成功。 */
export function fetchRevokeAccountSessions(userId: string) {
  return request<null>({ url: `/accounts/${userId}/sessions/revoke`, method: 'post' });
}
