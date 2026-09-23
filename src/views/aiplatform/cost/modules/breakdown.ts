/**
 * 成本分解行归一（#61，#64 扩币种桶）——byModel/byAgentKind 契约行 → 图表行（{label, tokens}），
 * 总览页与项目下钻抽屉两消费方共四个图表共用单点（口径标签合成收编一处，防两份漂移——
 * T4 review ① 权限码收编同型先例；payment/stats modules/types.ts 先例）。
 * #64 增 `costBucketEntries`（币种桶提取排序）——cost-buckets chips 与项目成本表列两消费方共用
 * （T8 review ① 收编同型：过滤+排序逐字两份 → 单点防漂移）。
 */

/** 归一分解行（label 按口径合成；tokens 五档）。 */
export interface BreakdownRow {
  label: string;
  tokens: Api.Aiplatform.TokenUsage;
}

/** byModel 口径行（label 拼 provider/model——单价表匹配键双段）。 */
export function modelUsageRows(byModel: Api.Aiplatform.ModelUsage[]): BreakdownRow[] {
  return byModel.map(m => ({ label: `${m.provider}/${m.model}`, tokens: m.tokens }));
}

/** byAgentKind 口径行（label 直读 agentKindName；null 辅助标记落「—」桶）。 */
export function agentKindUsageRows(byAgentKind: Api.Aiplatform.AgentKindUsage[]): BreakdownRow[] {
  return byAgentKind.map(a => ({ label: a.agentKindName ?? '—', tokens: a.tokens }));
}

/**
 * 币种桶提取（chips / 表列共用）——服务端 Map 无序，端侧按金额降序稳定化（并列按币种码字典序）；
 * 滤除非数脏值（「形状不符走空态」口径文档化，T8 review ② 容忍归一）。
 */
export function costBucketEntries(cost?: Record<string, number> | null): [string, number][] {
  return Object.entries(cost ?? {})
    .filter(([, amount]) => Number.isFinite(amount))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
