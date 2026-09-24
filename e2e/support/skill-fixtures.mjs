/**
 * 技能域 E2E mock fixtures（#67）——字段形状派生自 admin :8081 `/v3/api-docs`：
 * - `AiplatformSkillSummaryResponse`（列表行 = install 回执条目 = update 终态行集，同 schema）：
 *   id/name/description/source·sourceName/sourcePackage/version/status·statusName/
 *   operatorId/operatorName/updateAvailable
 * - `AiplatformSkillDetailResponse`（清单行超集 + frontmatter 自由 map + content 正文）
 * - `AiplatformSkillUpdateTraceResponse`（from/to/operator 两列/operatedAt）
 * - #68 指派：`AiplatformSlotAssignmentResponse` / `AiplatformSkillAssignCommand`
 * - #69 智能体配置：`AiplatformAgentConfigResponse` / `AiplatformAgentConfigUpdateCommand` /
 *   `AiplatformAgentConfigTraceResponse` / `AiplatformAgentToolResponse` /
 *   `AiplatformAgentToolSlotResponse` / `AiplatformAgentToolToggleCommand`
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

/* ---- 指派域（#68；`AiplatformSlotAssignmentResponse`={slot, skills[]} 与 PUT 回执同形、
 * `AiplatformSkillAssignCommand`={skillIds[]}——api-docs 实读）。初始态覆盖三签用例靶：
 * main 两项含停用行 csv-analyzer（「指派了但已停用」warning 呈现靶）/ executor 一项（清空靶）/
 * subagent 空（空→非空靶）。PUT 由 harness 就地整包替换（回读如实）。 ---- */

/** 指派槽位三键（路径段寻址；mock 对未知槽位回 404 SKL_010=7010）。 */
export const ASSIGN_SLOTS = ['main', 'executor', 'subagent'];

/** 初始指派态（安装行 TSID id 数组——GET 时映射 SKILL_ROWS 行）。 */
export const SKILL_ASSIGNMENTS = {
  main: [DISABLE_ID, ENABLE_ID],
  executor: [UNINSTALL_ID],
  subagent: []
};

/** subagent 空→非空靶（doc-writer 行 id——PUT body 断言锚）。 */
export const EMPTY_SLOT_ROW_ID = '740223456789000301';

/* ---- 智能体配置域（#69；`AiplatformAgentConfigResponse` / `AiplatformAgentConfigTraceResponse`
 * / `AiplatformAgentToolResponse` / `AiplatformAgentToolSlotResponse`——api-docs 实读）。契约要点：
 * main 默认档 deepseek-v4-flash、executor 默认档 deepseek-v4-pro（provider AgentProfile 镜像）；
 * PUT 全量终态（systemPrompt/modelId null/缺省/纯空白＝清覆盖回落默认、两 flag 缺省＝true 开）；
 * 工具开关窄幅写口挂 **main 行开关列**（provider toggleTool——与配置写共表共留痕），故工具面
 * main 槽两增强件挂载态＝main 配置 flag（harness 读面派生保持同源）。覆盖矩阵：main＝双覆盖靶
 * （prompt+modelId 已覆盖、fetchUrl 关——flag 透传断言锚）/ executor＝全默认靶（无覆盖行、
 * 留痕空态）。留痕两条：t1 双字段变化（变化项过滤：两 flag 不显）/ t2 仅 fetchUrl 变化。
 * ---- */

/** main 座枚举默认 prompt（覆盖预览/回落落点断言锚——清空覆盖即回此值）。 */
export const MAIN_DEFAULT_PROMPT = '你是主智能体：负责需求梳理、答询与迭代受理，永不读写沙箱代码。（E2E 默认 prompt 锚）';

/** main 座覆盖 prompt（编辑态预填/回滚写回断言锚）。 */
export const MAIN_OVERRIDE_PROMPT = '定制版主智能体提示词：聚焦电商交付话术。（E2E 覆盖 prompt 锚）';

/** executor 座枚举默认 prompt（全默认靶——生效值＝默认原文）。 */
export const EXECUTOR_DEFAULT_PROMPT = '你是 run 执行体：负责生成/更新 run 的执行侧读写。（E2E 默认 prompt 锚）';

/** main 座覆盖模型档位（回滚 PUT body 断言锚）。 */
export const MAIN_OVERRIDE_MODEL = 'deepseek-v4-max';

/** 配置读面（harness 写变异就地改；executor 无覆盖行＝写者 null 全回落）。 */
export const AGENT_CONFIGS = {
  main: {
    agentKey: 'main',
    agentName: '主智能体',
    systemPrompt: MAIN_OVERRIDE_PROMPT,
    modelId: MAIN_OVERRIDE_MODEL,
    systemPromptOverridden: true,
    modelIdOverridden: true,
    defaultSystemPrompt: MAIN_DEFAULT_PROMPT,
    defaultModelId: 'deepseek-v4-flash',
    webSearchEnabled: true,
    fetchUrlEnabled: false,
    operatorId: '700200',
    operatorName: '运营·技能管理员',
    updatedAt: '2026-09-20T09:30:00Z'
  },
  executor: {
    agentKey: 'executor',
    agentName: 'run 执行体',
    systemPrompt: EXECUTOR_DEFAULT_PROMPT,
    modelId: 'deepseek-v4-pro',
    systemPromptOverridden: false,
    modelIdOverridden: false,
    defaultSystemPrompt: EXECUTOR_DEFAULT_PROMPT,
    defaultModelId: 'deepseek-v4-pro',
    webSearchEnabled: true,
    fetchUrlEnabled: true,
    operatorId: null,
    operatorName: null,
    updatedAt: null
  }
};

/** 配置座两键（路径段寻址；mock 对未知键 404 PRJ_033＝4033）。 */
export const AGENT_KEYS = ['main', 'executor'];

/**
 * 配置变更留痕（operatedAt 倒序预排——最近在前；harness 写变异 unshift 新痕）。
 * t2（新）＝仅 fetchUrl 关——「只渲染变化项」靶；t1（旧）＝prompt+modelId 双覆盖——
 * 多字段变化＋null 显「（默认）」靶（两 flag 未动不显）。
 */
export const AGENT_TRACES = {
  main: [
    {
      id: '740224000000000002',
      oldSystemPrompt: MAIN_OVERRIDE_PROMPT,
      oldModelId: MAIN_OVERRIDE_MODEL,
      oldWebSearchEnabled: true,
      oldFetchUrlEnabled: true,
      newSystemPrompt: MAIN_OVERRIDE_PROMPT,
      newModelId: MAIN_OVERRIDE_MODEL,
      newWebSearchEnabled: true,
      newFetchUrlEnabled: false,
      operatorId: '700200',
      operatorName: '运营·技能管理员',
      operatedAt: '2026-09-20T09:30:00Z'
    },
    {
      id: '740224000000000001',
      oldSystemPrompt: null,
      oldModelId: null,
      oldWebSearchEnabled: true,
      oldFetchUrlEnabled: true,
      newSystemPrompt: MAIN_OVERRIDE_PROMPT,
      newModelId: MAIN_OVERRIDE_MODEL,
      newWebSearchEnabled: true,
      newFetchUrlEnabled: true,
      operatorId: '1',
      operatorName: '王建设',
      operatedAt: '2026-09-10T08:00:00Z'
    }
  ],
  executor: []
};

/**
 * 工具面三槽位（`AiplatformAgentToolSlotResponse` 形状——slotName 契约直读；呈现序＝平台资产
 * 在前、harness 内建在后）。main 槽两增强件 enabled 为占位——harness 读面按 main 配置 flag
 * 派生（同源不漂移）；骨架/harness 内建恒 true 锁死（PRJ_036）。
 */
export const AGENT_TOOL_SLOTS = [
  {
    slot: 'main',
    slotName: '主智能体',
    tools: [
      { name: 'ask_user', kind: 'SKELETON', enabled: true, description: '每轮一问的澄清工具（问答挂起的唯一起源——编排链路）' },
      { name: 'savePrd', kind: 'SKELETON', enabled: true, description: 'PRD 产出/修订落盘＋业务登记（编排链路）' },
      { name: 'saveBuildPlan', kind: 'SKELETON', enabled: true, description: '切片计划事实登记（生成编排的切片输入——编排链路）' },
      { name: 'list_workspace_files', kind: 'SKELETON', enabled: true, description: '工作区文件清单（答询查证只读件）' },
      { name: 'read_workspace_file', kind: 'SKELETON', enabled: true, description: '读工作区文件内容（答询查证只读件）' },
      { name: 'query_project_facts', kind: 'SKELETON', enabled: true, description: '查项目事实含系统访问地址（答询查证只读件）' },
      { name: 'fetch_url', kind: 'ENHANCEMENT', enabled: true, description: '读用户贴的 http/https 地址内容（增强可关）' },
      { name: 'web_search', kind: 'ENHANCEMENT', enabled: true, description: '自主搜索调研补缺口（增强可关——成本与滥用可控）' }
    ]
  },
  {
    slot: 'executor',
    slotName: 'run 执行体',
    tools: [
      { name: 'finish_edit', kind: 'SKELETON', enabled: true, description: '更新收口结束工具（编排链路）' },
      { name: 'update_plan', kind: 'SKELETON', enabled: true, description: 'run 级步骤清单的全量快照（编排链路）' },
      { name: 'read_file', kind: 'HARNESS_BUILTIN', enabled: true, description: 'harness 内建：读文件（呈现口径，不可开关）' },
      { name: 'execute', kind: 'HARNESS_BUILTIN', enabled: true, description: 'harness 内建：执行命令（呈现口径，不可开关）' }
    ]
  },
  {
    slot: 'subagent',
    slotName: '子智能体',
    tools: [
      { name: 'read_file', kind: 'HARNESS_BUILTIN', enabled: true, description: 'self-test 子智能体声明工具面（只读交付代码＋跑测试＋报告写隔离根）' },
      { name: 'execute', kind: 'HARNESS_BUILTIN', enabled: true, description: 'self-test 子智能体声明工具面（只读交付代码＋跑测试＋报告写隔离根）' }
    ]
  }
];
