/**
 * 成本域 E2E mock fixtures（#61）——字段形状派生自 admin :8081 `/v3/api-docs`：
 * - `AiplatformCostOverviewResponse`（from/to 回显 + total 五档 + cost{} + byModel + byAgentKind）
 * - `AiplatformUnpricedUsageResponse`（items 元素 `UnpricedTier`：provider/model/tokenKind·
 *   tokenKindName/tokens）
 * - `AiplatformProjectCostResponse`（清单行：projectId/total 五档/cost{}/allUnpriced）
 * - `AiplatformProjectCostDetailResponse`（下钻：+ unpriced 档位清单【无 tokens——bySubject 口径】
 *   + byModel + byAgentKind）
 *
 * 契约要点（api-docs 实测，2026-09-16）：五档 token 为 **primitive long → JSON 数字**（区别于
 * 金额 Long-string 口径）；`cost{}` 按币种分桶为 swagger 空对象（REQ-20 #75 暂缓渲染——fixtures
 * 带 `{}` 空对象钉死「不因 cost{} 报错」）；byAgentKind 的 agentKindName 可为 null（辅助标记——
 * 前端落「—」桶）；项目清单排序服务端定死成本降序（fixtures 行序即服务端序）；时间窗 from/to
 * 必填（ISO-8601 Instant UTC 带 Z，半开 [from,to)）。
 *
 * 与订单/项目/沙箱域 fixtures 交叉一致：projectId 复用 project-fixtures 同批 TSID
 * （教研备课知识库/校园社团招新小程序/口算天天练……），跨域排查叙事连贯。
 */

/** 五档 distinct 数值（千分位断言锚点：1,234,567 / 987,654 / 456,789 / 123,456 / 234,567）。 */
export const OVERVIEW = {
  from: '2026-08-18T00:00:00Z',
  to: '2026-09-17T00:00:00Z',
  total: { input: 1234567, output: 987654, cacheRead: 456789, cacheWrite: 123456, reasoning: 234567 },
  cost: {},
  byModel: [
    {
      provider: 'anthropic',
      model: 'claude-sonnet-5',
      tokens: { input: 800000, output: 600000, cacheRead: 300000, cacheWrite: 80000, reasoning: 200000 }
    },
    {
      provider: 'openai',
      model: 'gpt-5-mini',
      tokens: { input: 300000, output: 250000, cacheRead: 100000, cacheWrite: 30000, reasoning: 20000 }
    },
    {
      provider: 'deepseek',
      model: 'deepseek-v4',
      tokens: { input: 134567, output: 137654, cacheRead: 56789, cacheWrite: 13456, reasoning: 14567 }
    }
  ],
  byAgentKind: [
    { agentKind: 'naming', agentKindName: '命名', tokens: { input: 500000, output: 400000, cacheRead: 200000, cacheWrite: 60000, reasoning: 100000 } },
    { agentKind: 'classify', agentKindName: '分类', tokens: { input: 400000, output: 300000, cacheRead: 150000, cacheWrite: 40000, reasoning: 80000 } },
    // 辅助标记：agentKindName 为 null → 前端落「—」桶（aiplatform#186 口径）
    { agentKind: 'internal-review', agentKindName: null, tokens: { input: 334567, output: 287654, cacheRead: 106789, cacheWrite: 23456, reasoning: 54567 } }
  ]
};

/** 未配价事件时点（窗口含该时点才出警示——用量驱动，窄窗避开即收起）。 */
export const UNPRICED_EVENT_AT = '2026-09-10T00:00:00Z';

/** 全局 unpriced 档位清单（tokens 只计无价分量；tokenKind 1=输入 2=输出 3=缓存读 4=缓存写 5=推理）。 */
export const UNPRICED_ROWS = [
  { provider: 'anthropic', model: 'claude-opus-5', tokenKind: 2, tokenKindName: '输出', tokens: 88000 },
  { provider: 'deepseek', model: 'deepseek-v4', tokenKind: 5, tokenKindName: '推理', tokens: 12000 }
];

/** 项目成本清单（12 行 = 两页 @size10；行序即服务端成本降序——全未配价排后）。 */
export const PROJECT_COST_ROWS = [
  {
    projectId: '7392120209100200009',
    total: { input: 600000, output: 500000, cacheRead: 250000, cacheWrite: 70000, reasoning: 150000 },
    cost: {},
    allUnpriced: false
  },
  {
    projectId: '7392120209100500010',
    total: { input: 400000, output: 320000, cacheRead: 140000, cacheWrite: 40000, reasoning: 90000 },
    cost: {},
    allUnpriced: false
  },
  {
    projectId: '7392120209101200012',
    total: { input: 150000, output: 120000, cacheRead: 40000, cacheWrite: 9000, reasoning: 20000 },
    cost: {},
    allUnpriced: false
  },
  {
    projectId: '7392120209100800011',
    total: { input: 50000, output: 30000, cacheRead: 12000, cacheWrite: 3000, reasoning: 6000 },
    cost: {},
    allUnpriced: false
  },
  { projectId: '7392120209092800008', total: { input: 20000, output: 15000, cacheRead: 5000, cacheWrite: 1000, reasoning: 2000 }, cost: {}, allUnpriced: false },
  { projectId: '7392120209092500007', total: { input: 18000, output: 14000, cacheRead: 4000, cacheWrite: 900, reasoning: 1800 }, cost: {}, allUnpriced: false },
  { projectId: '7392120209092000006', total: { input: 12000, output: 9000, cacheRead: 3000, cacheWrite: 700, reasoning: 1200 }, cost: {}, allUnpriced: false },
  { projectId: '7392120209091500005', total: { input: 9000, output: 6000, cacheRead: 2000, cacheWrite: 500, reasoning: 900 }, cost: {}, allUnpriced: false },
  { projectId: '7392120209091000004', total: { input: 6000, output: 4000, cacheRead: 1500, cacheWrite: 300, reasoning: 600 }, cost: {}, allUnpriced: false },
  { projectId: '7392120209090500003', total: { input: 4000, output: 2500, cacheRead: 800, cacheWrite: 200, reasoning: 400 }, cost: {}, allUnpriced: false },
  { projectId: '7392120209090000002', total: { input: 2000, output: 1200, cacheRead: 400, cacheWrite: 100, reasoning: 200 }, cost: {}, allUnpriced: false },
  // 全未配价行（有用量但无任何已配价分量——成本标量缺失排后 + allUnpriced=true 标注）
  { projectId: '7392120209089500001', total: { input: 1000, output: 800, cacheRead: 300, cacheWrite: 80, reasoning: 150 }, cost: {}, allUnpriced: true }
];

/** 零用量下钻（查无此号/无用量 = 全零 total + 空结构，明确空态非 404）。 */
export const ZERO_DETAIL = projectId => ({
  projectId,
  from: '2026-08-18T00:00:00Z',
  to: '2026-09-17T00:00:00Z',
  total: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 },
  cost: {},
  unpriced: [],
  byModel: [],
  byAgentKind: []
});

/**
 * 单项目下钻 fixtures（E2E 下钻两目标）：教研备课知识库（富分解 + 未配价档位）、
 * 校园社团招新小程序（零用量空态）。unpriced 元素**无 tokens**（bySubject 口径——
 * 与全局 unpriced 端点的 tokens 字段有意不同）。
 */
export const PROJECT_COST_DETAILS = {
  '7392120209100200009': {
    projectId: '7392120209100200009',
    from: '2026-08-18T00:00:00Z',
    to: '2026-09-17T00:00:00Z',
    total: { input: 500000, output: 420000, cacheRead: 210000, cacheWrite: 60000, reasoning: 130000 },
    cost: {},
    unpriced: [
      { provider: 'anthropic', model: 'claude-opus-5', tokenKind: 2, tokenKindName: '输出' },
      { provider: 'deepseek', model: 'deepseek-v4', tokenKind: 5, tokenKindName: '推理' }
    ],
    byModel: [
      { provider: 'anthropic', model: 'claude-sonnet-5', tokens: { input: 400000, output: 350000, cacheRead: 180000, cacheWrite: 50000, reasoning: 110000 } },
      { provider: 'deepseek', model: 'deepseek-v4', tokens: { input: 100000, output: 70000, cacheRead: 30000, cacheWrite: 10000, reasoning: 20000 } }
    ],
    byAgentKind: [
      { agentKind: 'naming', agentKindName: '命名', tokens: { input: 300000, output: 250000, cacheRead: 120000, cacheWrite: 35000, reasoning: 80000 } },
      { agentKind: 'internal-review', agentKindName: null, tokens: { input: 200000, output: 170000, cacheRead: 90000, cacheWrite: 25000, reasoning: 50000 } }
    ]
  },
  '7392120209100500010': ZERO_DETAIL('7392120209100500010')
};
