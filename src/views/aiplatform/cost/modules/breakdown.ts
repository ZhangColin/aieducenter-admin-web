/**
 * 成本分解行归一（#61）——byModel/byAgentKind 契约行 → 图表行（{label, tokens}），
 * 总览页与项目下钻抽屉两消费方共四个图表共用单点（口径标签合成收编一处，防两份漂移——
 * T4 review ① 权限码收编同型先例；payment/stats modules/types.ts 先例）。
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
