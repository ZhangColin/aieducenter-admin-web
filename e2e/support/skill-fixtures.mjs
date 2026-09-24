/**
 * 技能域 E2E mock fixtures（#67）——字段形状派生自 admin :8081 `/v3/api-docs`：
 * - `AiplatformSkillSummaryResponse`（列表行 = install 回执条目 = update 终态行集，同 schema）：
 *   id/name/description/source·sourceName/sourcePackage/version/status·statusName/
 *   operatorId/operatorName/updateAvailable
 * - `AiplatformSkillDetailResponse`（清单行超集 + frontmatter 自由 map + content 正文）
 * - `AiplatformSkillUpdateTraceResponse`（from/to/operator 两列/operatedAt）
 *
 * 契约要点（api-docs 实读，2026-09-24）：id 为 **opaque 串两形制**（内置＝`builtin:<技能名>` /
 * 安装＝TSID 十进制串——一律 string，勿做数值假设）；source 1=内置 2=安装、status 1=启用 2=停用
 * （内置恒 1）＋`*Name` 中文名随行直读；sourcePackage/version 内置为 null；updateAvailable 为
 * 来源包级标记（true=远端 HEAD≠装时版本 / null=未检查过——按包统一才符合「包级」语义）。
 * 清单无分页、服务端排序内置在前（fixtures 预排：内置 3 行在前，安装行随后）。
 *
 * 覆盖矩阵：内置 ×3（下拉仅停用——更新/卸载/留痕不可达）；安装三包——PACK_A ×3（禁用行＝
 * 启用靶 + 可更新 true + 更新靶：from→to 翻新两行/移除 sql-helper/新增 diagram-draw）、
 * PACK_B ×1（装者留痕、可更新 false、卸载靶）、PACK_C ×1（可更新 null＝未检查、no-op 更新靶
 * from==to）。frontmatter 四型值（string/number/array/object）钉泛型键值格式化分派。
 */

/** 停用靶：PACK_A 行 a1（启用态、可更新 true——抽屉停用链 + 更新入口同包）。 */
export const DISABLE_ID = '740223456789000101';

/** 启用靶：PACK_A 行 a2（停用态、陈运营停用痕）。 */
export const ENABLE_ID = '740223456789000102';

/** 卸载靶：PACK_B 行 b1（装者王建设留痕、可更新 false）。 */
export const UNINSTALL_ID = '740223456789000201';

/** 更新移除靶：PACK_A 行 a3（启用态——真更新后被移除，removedSkillNames 断言锚）。 */
export const REMOVED_ID = '740223456789000103';

/** 更新靶（真更新 from→to + 移除 + 新增）/ 留痕靶（预排 2 条 + 更新后 3 条）。 */
export const PACK_A = 'https://github.com/acme/skill-pack-a';

/** no-op 更新靶（远端未前进 from==to，未落痕——留痕恒空态）。 */
export const PACK_C = 'https://github.com/acme/skill-pack-c';

/** 安装命令靶（install mock 按此 repoUrl 装入 2 行）。 */
export const INSTALL_REPO_URL = 'https://github.com/acme/e2e-new-pack';

/** PACK_A 装时版本（更新前）/ 更新后版本（远端 HEAD 前进）。 */
export const PACK_A_FROM = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0';
export const PACK_A_TO = '0b9a8f7e6d5c4b3a29180f7e6d5c4b3a2918076e';

/** 正文全文锚点（frontmatter 剥离后的 SKILL.md 原文断言用）。 */
export const CONTENT_MARK = 'E2E-SKILL-CONTENT-ANCHOR';

/** 内置行（服务端排序内置在前——fixtures 预排前三）。 */
const BUILTIN_ROWS = [
  {
    id: 'builtin:web-search',
    name: 'web-search',
    description: '联网搜索增强工具技能（平台内置）',
    source: 1,
    sourceName: '内置',
    sourcePackage: null,
    version: null,
    status: 1,
    statusName: '启用',
    operatorId: null,
    operatorName: null,
    updateAvailable: null
  },
  {
    id: 'builtin:fetch-url',
    name: 'fetch-url',
    description: '网页抓取增强工具技能（平台内置）',
    source: 1,
    sourceName: '内置',
    sourcePackage: null,
    version: null,
    status: 1,
    statusName: '启用',
    operatorId: null,
    operatorName: null,
    updateAvailable: null
  },
  {
    id: 'builtin:project-context',
    name: 'project-context',
    description: '项目事实只读件技能（平台内置）',
    source: 1,
    sourceName: '内置',
    sourcePackage: null,
    version: null,
    status: 1,
    statusName: '启用',
    operatorId: null,
    operatorName: null,
    updateAvailable: null
  }
];

/** 安装行（PACK_A 可更新 true / PACK_B false / PACK_C null——包级统一）。 */
const INSTALLED_ROWS = [
  {
    id: DISABLE_ID,
    name: 'pdf-export',
    description: '将项目交付文档导出为 PDF 并打包下载',
    source: 2,
    sourceName: '安装',
    sourcePackage: PACK_A,
    version: PACK_A_FROM,
    status: 1,
    statusName: '启用',
    operatorId: '1',
    operatorName: '王建设',
    updateAvailable: true
  },
  {
    id: ENABLE_ID,
    name: 'csv-analyzer',
    description: '解析 CSV 数据并生成统计摘要',
    source: 2,
    sourceName: '安装',
    sourcePackage: PACK_A,
    version: PACK_A_FROM,
    status: 2,
    statusName: '停用',
    operatorId: '3',
    operatorName: '陈运营',
    updateAvailable: true
  },
  {
    id: REMOVED_ID,
    name: 'sql-helper',
    description: '辅助编写与校验 SQL 查询',
    source: 2,
    sourceName: '安装',
    sourcePackage: PACK_A,
    version: PACK_A_FROM,
    status: 1,
    statusName: '启用',
    operatorId: '1',
    operatorName: '王建设',
    updateAvailable: true
  },
  {
    id: UNINSTALL_ID,
    name: 'seo-audit',
    description: '对站点做 SEO 基线审计并出报告',
    source: 2,
    sourceName: '安装',
    sourcePackage: 'https://github.com/acme/skill-pack-b',
    version: '112233445566778899aabbccddeeff0011223344',
    status: 1,
    statusName: '启用',
    operatorId: '1',
    operatorName: '王建设',
    updateAvailable: false
  },
  {
    id: '740223456789000301',
    name: 'doc-writer',
    description: '按模板撰写技术文档初稿',
    source: 2,
    sourceName: '安装',
    sourcePackage: PACK_C,
    version: 'ccdd00112233445566778899aabbccddeeff0011',
    status: 1,
    statusName: '启用',
    operatorId: null,
    operatorName: null,
    updateAvailable: null
  }
];

/** 技能清单（harness 写变异就地改；内置在前预排）。 */
export const SKILL_ROWS = [...BUILTIN_ROWS, ...INSTALLED_ROWS];

/** 造 SKILL.md 正文（frontmatter 剥离后原文，多段 + 断言锚点）。 */
function skillContent(id) {
  return [
    `# ${id}`,
    '',
    `## 职能`,
    `${CONTENT_MARK} 本技能按指令执行其专职动作，输入输出遵循 SKILL.md 约定。`,
    '',
    '## 使用约束',
    '仅在明确指令下调用；失败时如实回报，不静默重试。',
    '',
    '## 参考',
    '详见来源仓库 README。'
  ].join('\n');
}

/**
 * 详情（清单行超集 + frontmatter 自由 map + content）。安装行 frontmatter 四型值
 * （string/number/array/object）钉泛型键值格式化分派；内置行极简两键。
 */
export const SKILL_DETAILS = {
  [DISABLE_ID]: {
    ...INSTALLED_ROWS[0],
    frontmatter: {
      name: 'pdf-export',
      description: 'PDF 导出技能（acme 技能包）',
      version: 2,
      license: 'MIT',
      'allowed-tools': ['Read', 'Write', 'Bash'],
      strict: true,
      metadata: { owner: 'acme', tier: 'gold' }
    },
    content: skillContent('pdf-export')
  },
  [ENABLE_ID]: { ...INSTALLED_ROWS[1], frontmatter: { name: 'csv-analyzer', license: 'Apache-2.0' }, content: skillContent('csv-analyzer') },
  [REMOVED_ID]: { ...INSTALLED_ROWS[2], frontmatter: { name: 'sql-helper' }, content: skillContent('sql-helper') },
  [UNINSTALL_ID]: {
    ...INSTALLED_ROWS[3],
    frontmatter: { name: 'seo-audit', description: 'SEO 审计技能', version: 1 },
    content: skillContent('seo-audit')
  },
  '740223456789000301': {
    ...INSTALLED_ROWS[4],
    frontmatter: { name: 'doc-writer' },
    content: skillContent('doc-writer')
  },
  'builtin:web-search': {
    ...BUILTIN_ROWS[0],
    frontmatter: { name: 'web-search', description: '内置联网搜索技能' },
    content: skillContent('builtin:web-search')
  },
  'builtin:fetch-url': { ...BUILTIN_ROWS[1], frontmatter: { name: 'fetch-url' }, content: skillContent('builtin:fetch-url') },
  'builtin:project-context': {
    ...BUILTIN_ROWS[2],
    frontmatter: { name: 'project-context' },
    content: skillContent('builtin:project-context')
  }
};

/** 更新留痕（按来源包；倒序预排——最近在前。harness 真更新后 unshift 第三条）。 */
export const UPDATE_TRACES = {
  [PACK_A]: [
    {
      sourcePackage: PACK_A,
      fromVersion: '9988776655443322110099aabbccddeeff001122',
      toVersion: PACK_A_FROM,
      operatorId: '1',
      operatorName: '王建设',
      operatedAt: '2026-09-10T08:00:00Z'
    },
    {
      sourcePackage: PACK_A,
      fromVersion: '556677889900112233445566778899aabbccdde0',
      toVersion: '9988776655443322110099aabbccddeeff001122',
      operatorId: '3',
      operatorName: '陈运营',
      operatedAt: '2026-09-03T06:30:00Z'
    }
  ]
};

/** install mock 装入条目（e2e-new-pack 2 行——版本＝装时 HEAD）。 */
export const INSTALL_ROWS = [
  {
    id: '740223456789000401',
    name: 'chart-render',
    description: '将数据表渲染为图表组件',
    source: 2,
    sourceName: '安装',
    sourcePackage: INSTALL_REPO_URL,
    version: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
    status: 1,
    statusName: '启用',
    operatorId: '1',
    operatorName: 'E2E Mock',
    updateAvailable: null
  },
  {
    id: '740223456789000402',
    name: 'slide-builder',
    description: '按大纲生成演示幻灯片',
    source: 2,
    sourceName: '安装',
    sourcePackage: INSTALL_REPO_URL,
    version: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
    status: 1,
    statusName: '启用',
    operatorId: '1',
    operatorName: 'E2E Mock',
    updateAvailable: null
  }
];

/** 真更新后 PACK_A 新增行（同名行原地翻新、消失行移除之外的新插入行）。 */
export const UPDATE_ADDED_ROW = {
  id: '740223456789000501',
  name: 'diagram-draw',
  description: '绘制架构图与流程图',
  source: 2,
  sourceName: '安装',
  sourcePackage: PACK_A,
  version: PACK_A_TO,
  status: 1,
  statusName: '启用',
  operatorId: '1',
  operatorName: 'E2E Mock',
  updateAvailable: false
};
