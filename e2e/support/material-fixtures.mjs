/**
 * 素材域 E2E mock fixtures（#63）——字段形状派生自 admin :8081 `/v3/api-docs`：
 * - `AiplatformMaterialSummaryResponse`（列表行 = 三写回执，同 schema）：
 *   id/kind/projectId/projectName/title/status·statusName/sunkAt/operatorId/operatorName
 * - `AiplatformMaterialDetailResponse`（清单行超集 + content 全文）
 *
 * 契约要点（api-docs + :8081 实测，2026-09-17）：kind 为 **string 裸值**（v1 业务口径恒 "PRD"，
 * 无 *Name 字段）；status Integer code 1=启用 2=停用 + statusName 中文名随行；sunkAt 首沉淀
 * 时间 ISO-8601 Instant UTC 带 Z（重沉淀与治理动作不改；页侧 formatDateTime 折算断言）；
 * operator 两列＝最近管理动作留痕（未治理过 null）；排序服务端定死沉淀倒序（fixtures 预排）。
 *
 * 覆盖矩阵：12 条＝两页 @size10。王十二官网（projectId …010）×3＝projectId 精确过滤靶；
 * 停用态 ×4（002/005/009/012）＝status 单选过滤靶；9 月沉淀 ×10 vs 8 月 ×2＝沉淀时间闭区间
 * 过滤靶（窗 [09-01, 09-30 23:59] 时区无关命中 10 行）；002/004/009 带陈运营操作者、余 null。
 * 启停/删除变异由 harness 就地改行（行与详情同步——抽屉 reload 后拿到新事实）。
 */

/** 抽屉停用靶：行 003（启用态、未治理、王十二官网）。 */
export const DISABLE_ID = '357801000000000003';

/** 行内启用靶：行 002（停用态、陈运营停用痕、赵六电商）。 */
export const ENABLE_ID = '357801000000000002';

/** 删除靶：行 005（停用态、王十二电商——第 1 页中段，删除后行数可见减一）。 */
export const DELETE_ID = '357801000000000005';

/** 组合过滤靶：项目 012（王十二的电商）唯一行 005 为停用态——停用 ∩ 012 命中 1 行。 */
export const COMBO_PROJECT_ID = '357701050000000012';

/** 素材详情全文锚点（块按 seq 空行拼接——多段呈现，段落断=切点）。 */
export const CONTENT_MARK = 'E2E-MATERIAL-CONTENT-ANCHOR';

/** 列表行（12 条 = 两页 @size10；预排沉淀倒序——新沉淀在前）。 */
export const MATERIAL_ROWS = [
  {
    id: '357801000000000001',
    kind: 'PRD',
    projectId: '357701050000000010',
    projectName: '王十二的官网',
    title: 'PRD',
    status: 1,
    statusName: '启用',
    sunkAt: '2026-09-15T02:00:00Z',
    operatorId: null,
    operatorName: null
  },
  {
    id: '357801000000000002',
    kind: 'PRD',
    projectId: '357701050000000011',
    projectName: '赵六的电商',
    title: 'PRD',
    status: 2,
    statusName: '停用',
    sunkAt: '2026-09-14T02:00:00Z',
    operatorId: '3',
    operatorName: '陈运营'
  },
  {
    id: '357801000000000003',
    kind: 'PRD',
    projectId: '357701050000000010',
    projectName: '王十二的官网',
    title: 'PRD',
    status: 1,
    statusName: '启用',
    sunkAt: '2026-09-13T08:00:00Z',
    operatorId: null,
    operatorName: null
  },
  {
    id: '357801000000000004',
    kind: 'PRD',
    projectId: '357701050000000011',
    projectName: '赵六的电商',
    title: 'PRD',
    status: 1,
    statusName: '启用',
    sunkAt: '2026-09-12T02:00:00Z',
    operatorId: '3',
    operatorName: '陈运营'
  },
  {
    id: '357801000000000005',
    kind: 'PRD',
    projectId: '357701050000000012',
    projectName: '王十二的电商',
    title: 'PRD',
    status: 2,
    statusName: '停用',
    sunkAt: '2026-09-11T02:00:00Z',
    operatorId: null,
    operatorName: null
  },
  {
    id: '357801000000000006',
    kind: 'PRD',
    projectId: '357701050000000010',
    projectName: '王十二的官网',
    title: 'PRD',
    status: 1,
    statusName: '启用',
    sunkAt: '2026-09-10T02:00:00Z',
    operatorId: null,
    operatorName: null
  },
  {
    id: '357801000000000007',
    kind: 'PRD',
    projectId: '357701050000000013',
    projectName: '内部工具站',
    title: 'PRD',
    status: 1,
    statusName: '启用',
    sunkAt: '2026-09-09T02:00:00Z',
    operatorId: null,
    operatorName: null
  },
  {
    id: '357801000000000008',
    kind: 'PRD',
    projectId: '357701050000000014',
    projectName: '赵六的官网',
    title: 'PRD',
    status: 1,
    statusName: '启用',
    sunkAt: '2026-09-08T02:00:00Z',
    operatorId: null,
    operatorName: null
  },
  {
    id: '357801000000000009',
    kind: 'PRD',
    projectId: '357701050000000015',
    projectName: '运营中台',
    title: 'PRD',
    status: 2,
    statusName: '停用',
    sunkAt: '2026-09-07T02:00:00Z',
    operatorId: '3',
    operatorName: '陈运营'
  },
  {
    id: '357801000000000010',
    kind: 'PRD',
    projectId: '357701050000000013',
    projectName: '内部工具站',
    title: 'PRD',
    status: 1,
    statusName: '启用',
    sunkAt: '2026-09-06T02:00:00Z',
    operatorId: null,
    operatorName: null
  },
  {
    id: '357801000000000011',
    kind: 'PRD',
    projectId: '357701050000000016',
    projectName: '早期官网',
    title: 'PRD',
    status: 1,
    statusName: '启用',
    sunkAt: '2026-08-20T02:00:00Z',
    operatorId: null,
    operatorName: null
  },
  {
    id: '357801000000000012',
    kind: 'PRD',
    projectId: '357701050000000017',
    projectName: '早期电商',
    title: 'PRD',
    status: 2,
    statusName: '停用',
    sunkAt: '2026-08-15T02:00:00Z',
    operatorId: null,
    operatorName: null
  }
];

/** 造素材全文（块按 seq 空行拼接——多段，含断言锚点）。 */
function materialContent(id) {
  return [
    `# ${id} PRD`,
    '',
    '## 目标',
    `${CONTENT_MARK} 为王十二的官网项目沉淀的 PRD 素材，含目标用户与核心诉求。`,
    '',
    '## 范围',
    '首页、产品列表、关于我们三个页面；不含支付与会员体系。',
    '',
    '## 验收',
    'Lighthouse ≥ 90；移动端适配 375px 起。'
  ].join('\n');
}

/** 详情（清单行超集 + content；写变异由 harness 行·详情同步改）。 */
export const MATERIAL_DETAILS = Object.fromEntries(
  MATERIAL_ROWS.map(row => [row.id, { ...row, content: materialContent(row.id) }])
);
