/**
 * 项目域 E2E mock fixtures（#58）——字段形状派生自 admin :8081 `/v3/api-docs`：
 * - `AiplatformProjectSummaryResponse`（列表行：id/name/ownerDisplayName/type·typeName/
 *   status·statusName/archived/createdAt/updatedAt）
 * - `AiplatformProjectDetailResponse`（详情：+ workspaceId/prdProducedAt/generatedAt/
 *   activeOrder·latestOrder 订单引用/costSummary 成本指针【cost 币种桶 + unpriced】）
 * - `AiplatformConversationEntryResponse`（对话史：text/kind·kindName/answered/at +
 *   四载荷 question/closing/attachments/quote——admin#75 @Schema 文档化结构，#64 前端渲染）
 * - `AiplatformPrdResponse`（PRD 全文：projectId/content/updatedAt）
 * - `AiplatformVersionResponse` / `AiplatformVersionDetailResponse`（版本列表新→旧 /
 *   详情锚定收尾卡 closing——run-finish 收口扩载结构，回滚版本 runId 空 + closing 可空）
 *
 * 契约要点（api-docs 实测 + admin#75 @Schema 文档化）：id 为 TSID 字符串；项目状态
 * 1=进行中 3=已归档（archived 同派生）；清单新项目在前（TSID 倒序）——fixtures 按 id 降序；
 * 详情 activeOrder=未终结订单（1|2）、latestOrder=最近任意状态（支付归档后 activeOrder 转空
 * 由本字段承接）；costSummary.cost 按币种分桶（键 = ISO 4217、值 = 金额 number 直读不折算，
 * 空对象 = 无用量或全未配价）；kind 1=user 2=agent 3=question 4=answer 5=closing 6=guide
 * 7=quote（kindName 随行中文「报价卡」），载荷条目 text=null；question 呈现投影 =
 * data.questions[{header,question,multiple,custom,options[{label}]}]；closing = run-finish
 * 收口扩载（可缺省键＝该轮无该事实）；attachments 元素 = {attachmentType:"annotation",
 * annotation:{kind,anchor{selector?,text?,region?},note?}}（#97）；quote =
 * {orderId,event:quoted|repriced}——不含金额（视镜语义 ADR-0017）。
 *
 * 与订单域 fixtures 交叉一致：本清单 12 个项目的 id/name 即订单 fixtures 行里的
 * projectId/projectName（同一批 TSID），运营跨域排查叙事连贯。
 */

/** 列表行（12 条 = 两页 @size10；进行中/已归档混排 + 缺档 owner 一行）。 */
export const PROJECT_ROWS = [
  {
    id: '7392120209101200012',
    name: '智能排课助手',
    ownerDisplayName: '王十二',
    type: 2,
    typeName: '电商',
    status: 1,
    statusName: '进行中',
    archived: false,
    createdAt: '2026-09-12T09:05:00',
    updatedAt: '2026-09-12T18:40:00'
  },
  {
    id: '7392120209100800011',
    name: '幼儿绘本共读机器人',
    ownerDisplayName: null,
    type: 1,
    typeName: '官网',
    status: 3,
    statusName: '已归档',
    archived: true,
    createdAt: '2026-09-11T15:50:00',
    updatedAt: '2026-09-12T10:02:00'
  },
  {
    id: '7392120209100500010',
    name: '校园社团招新小程序',
    ownerDisplayName: '赵六',
    type: 1,
    typeName: '官网',
    status: 1,
    statusName: '进行中',
    archived: false,
    createdAt: '2026-09-11T09:12:00',
    updatedAt: '2026-09-11T20:16:00'
  },
  {
    id: '7392120209100200009',
    name: '教研备课知识库',
    ownerDisplayName: '钱七',
    type: 2,
    typeName: '电商',
    status: 1,
    statusName: '进行中',
    archived: false,
    createdAt: '2026-09-10T14:02:00',
    updatedAt: '2026-09-12T11:30:00'
  },
  {
    id: '7392120209092800008',
    name: '家校沟通助手',
    ownerDisplayName: '孙八',
    type: 1,
    typeName: '官网',
    status: 1,
    statusName: '进行中',
    archived: false,
    createdAt: '2026-09-09T10:48:00',
    updatedAt: '2026-09-09T10:48:00'
  },
  {
    id: '7392120209092500007',
    name: '口算天天练',
    ownerDisplayName: '周九',
    type: 2,
    typeName: '电商',
    status: 3,
    statusName: '已归档',
    archived: true,
    createdAt: '2026-09-09T08:30:00',
    updatedAt: '2026-09-10T09:05:00'
  },
  {
    id: '7392120209092000006',
    name: '英语晨读陪练',
    ownerDisplayName: '吴十',
    type: 1,
    typeName: '官网',
    status: 3,
    statusName: '已归档',
    archived: true,
    createdAt: '2026-09-08T18:05:00',
    updatedAt: '2026-09-09T16:20:00'
  },
  {
    id: '7392120209091500005',
    name: '实验报告批改助手',
    ownerDisplayName: '郑十一',
    type: 2,
    typeName: '电商',
    status: 1,
    statusName: '进行中',
    archived: false,
    createdAt: '2026-09-07T13:22:00',
    updatedAt: '2026-09-07T13:22:00'
  },
  {
    id: '7392120209091000004',
    name: '班会课素材生成器',
    ownerDisplayName: '王五',
    type: 1,
    typeName: '官网',
    status: 1,
    statusName: '进行中',
    archived: false,
    createdAt: '2026-09-06T09:58:00',
    updatedAt: '2026-09-08T15:44:00'
  },
  {
    id: '7392120209090500003',
    name: '错题本同步工具',
    ownerDisplayName: '李四',
    type: 2,
    typeName: '电商',
    status: 3,
    statusName: '已归档',
    archived: true,
    createdAt: '2026-09-05T15:30:00',
    updatedAt: '2026-09-06T10:12:00'
  },
  {
    id: '7392120209090100002',
    name: '听力训练助手',
    ownerDisplayName: '张三',
    type: 1,
    typeName: '官网',
    status: 1,
    statusName: '进行中',
    archived: false,
    createdAt: '2026-09-04T09:02:00',
    updatedAt: '2026-09-04T09:02:00'
  },
  {
    id: '7392120209082800001',
    name: '作文批改引擎',
    ownerDisplayName: '张三',
    type: 2,
    typeName: '电商',
    status: 1,
    statusName: '进行中',
    archived: false,
    createdAt: '2026-09-03T17:10:00',
    updatedAt: '2026-09-05T11:26:00'
  }
];

/** 详情（按 id 索引；E2E 打开三个：迭代中主档 / 已支付承接档 / 归档照读档）。 */
export const PROJECT_DETAILS = {
  /** 进行中——activeOrder 未终结（已报价）冻结迭代；对话史/PRD/版本全量演示主档。 */
  '7392120209100200009': {
    id: '7392120209100200009',
    name: '教研备课知识库',
    ownerDisplayName: '钱七',
    workspaceId: '7394120209100200099',
    type: 2,
    typeName: '电商',
    status: 1,
    statusName: '进行中',
    archived: false,
    createdAt: '2026-09-10T14:02:00',
    updatedAt: '2026-09-12T11:30:00',
    prdProducedAt: '2026-09-10T15:20:00',
    generatedAt: '2026-09-10T18:46:00',
    activeOrder: { id: '7393120209100200009', status: 2, statusName: '已报价' },
    latestOrder: { id: '7393120209100200009', status: 2, statusName: '已报价' },
    // 币种桶（admin#75 文档化）：已计价 USD 12.34——详情抽屉 chips 断言锚点
    costSummary: { cost: { USD: 12.34 }, unpriced: false }
  },
  /** 进行中——已支付未归档：activeOrder 转空、latestOrder 承接；PRD 未产出（4015 演示）。 */
  '7392120209100500010': {
    id: '7392120209100500010',
    name: '校园社团招新小程序',
    ownerDisplayName: '赵六',
    workspaceId: '7394120209100500098',
    type: 1,
    typeName: '官网',
    status: 1,
    statusName: '进行中',
    archived: false,
    createdAt: '2026-09-11T09:12:00',
    updatedAt: '2026-09-11T20:16:00',
    prdProducedAt: null,
    generatedAt: '2026-09-11T17:35:00',
    activeOrder: null,
    latestOrder: { id: '7393120209100500010', status: 3, statusName: '已支付' },
    // 空桶 + unpriced：空态文案（不伪装 0）+ 警示标记断言锚点
    costSummary: { cost: {}, unpriced: true }
  },
  /** 已归档——归档照读（工作区/对话/PRD/版本全可读）；版本含回滚 + closing 缺位。 */
  '7392120209092500007': {
    id: '7392120209092500007',
    name: '口算天天练',
    ownerDisplayName: '周九',
    workspaceId: '7394120209092500097',
    type: 2,
    typeName: '电商',
    status: 3,
    statusName: '已归档',
    archived: true,
    createdAt: '2026-09-09T08:30:00',
    updatedAt: '2026-09-10T09:05:00',
    prdProducedAt: '2026-09-09T09:40:00',
    generatedAt: '2026-09-09T16:08:00',
    activeOrder: null,
    latestOrder: { id: '7393120209092500007', status: 4, statusName: '已归档' },
    costSummary: { cost: { CNY: 5.2 }, unpriced: false }
  }
};

/** 对话史（按项目 id；全量同序 id 升序 = 对话序；kind 1–7 全覆盖，载荷按 admin#75 文档化结构）。 */
export const CONVERSATIONS = {
  /**
   * 教研备课知识库：开场（随带双圈注附件）→ 问答（已答）→ 收尾卡（#88 全字段）→ 首次报价卡 →
   * 迭代意见 → 挂起问答卡（answered=false，可多选）→ 改价卡（repriced 运营提示）。
   */
  '7392120209100200009': [
    {
      id: '1',
      kind: 1,
      kindName: '用户',
      runId: null,
      text: '我们想做一个教研备课知识库，先把组内教案沉淀下来。',
      question: null,
      closing: null,
      // 圈注附件两枚（#97 契约形）：select 点选（selector+text 锚定）/ circle 拖框（region+note）
      attachments: [
        {
          attachmentType: 'annotation',
          annotation: { kind: 'select', anchor: { selector: '#prd-goal-list', text: '教案结构化沉淀' } }
        },
        {
          attachmentType: 'annotation',
          annotation: { kind: 'circle', anchor: { region: { x: 10, y: 20, width: 300, height: 120 } }, note: '这一段要保留' }
        }
      ],
      quote: null,
      answered: false,
      at: '2026-09-10T14:02:10'
    },
    {
      id: '2',
      kind: 2,
      kindName: '智能体',
      runId: 'run-20260910-a1',
      text: '收到。我先梳理需求：按学科与年级组织教案，支持检索与协同批注，对吗？',
      question: null,
      closing: null,
      attachments: null,
      quote: null,
      answered: false,
      at: '2026-09-10T14:03:00'
    },
    {
      id: '3',
      kind: 3,
      kindName: '问答',
      runId: 'run-20260910-a1',
      text: null,
      // question-raised payload 原样（admin#75 example 同构）：呈现投影 = data.questions
      question: {
        runId: 'run-20260910-a1',
        sessionId: 's-20260910-01',
        engine: 'agentscope',
        summary: '需要确认首版迭代优先级',
        engineRef: 'req-101',
        data: {
          toolCalls: [{ id: 'tc-1', name: 'ask_user', input: { header: '迭代优先级', question: '优先级最高的是哪个方向？' } }],
          questions: [
            {
              header: '迭代优先级',
              question: '优先级最高的是哪个方向？',
              multiple: false,
              custom: true,
              options: [{ label: '检索优化' }, { label: '协同批注' }]
            }
          ]
        }
      },
      closing: null,
      attachments: null,
      quote: null,
      answered: true,
      at: '2026-09-10T14:03:40'
    },
    {
      id: '4',
      kind: 4,
      kindName: '作答',
      runId: 'run-20260910-a1',
      text: '检索优先，批注可以放到下一轮。',
      question: null,
      closing: null,
      attachments: null,
      quote: null,
      answered: false,
      at: '2026-09-10T14:04:20'
    },
    {
      id: '5',
      kind: 5,
      kindName: '收尾卡',
      runId: 'run-20260910-a1',
      text: null,
      question: null,
      // run-finish 收口扩载全字段（admin#75 文档化；version 锚定 8e21b0… 同 run 同载荷叙事）
      closing: {
        summary: '首版知识库骨架落地：教案入库 + 学科年级检索（PRD 同步补充批注需求）',
        prdChanged: true,
        prdNote: '补充第二轮批注范围',
        systemChanged: true,
        systemNote: '起服了检索服务',
        files: [{ path: 'src/search/Index.ts', added: 40, removed: 0 }],
        durationMs: 1043000,
        selfTest: { total: 3 },
        version: '8e21b0196c3d7a590b0e123456789abcdef0123'
      },
      attachments: null,
      quote: null,
      answered: false,
      at: '2026-09-10T18:46:00'
    },
    {
      id: '6',
      kind: 7,
      kindName: '报价卡',
      runId: null,
      text: null,
      question: null,
      closing: null,
      attachments: null,
      // 报价卡载荷（aiplatform#203）：仅事件＋订单引用，不含金额（视镜语义 ADR-0017）
      quote: { orderId: '3897654321098765432', event: 'quoted' },
      answered: false,
      at: '2026-09-10T18:47:00'
    },
    {
      id: '7',
      kind: 1,
      kindName: '用户',
      runId: null,
      text: '第二版把协同批注加上。',
      question: null,
      closing: null,
      attachments: null,
      quote: null,
      answered: false,
      at: '2026-09-12T10:20:00'
    },
    {
      id: '8',
      kind: 6,
      kindName: '平台引导',
      runId: null,
      text: '已收到你的迭代意见，构建完成后会在这里同步结果。',
      question: null,
      closing: null,
      attachments: null,
      quote: null,
      answered: false,
      at: '2026-09-12T10:20:05'
    },
    {
      id: '9',
      kind: 3,
      kindName: '问答',
      runId: 'run-20260912-b2',
      text: null,
      question: {
        runId: 'run-20260912-b2',
        sessionId: 's-20260912-02',
        engine: 'agentscope',
        summary: '确认批注协作范围',
        engineRef: 'req-118',
        data: {
          toolCalls: [{ id: 'tc-2', name: 'ask_user', input: { header: '批注协作', question: '批注需要支持@人吗？' } }],
          questions: [
            {
              header: '批注协作',
              question: '批注需要支持@人吗？',
              multiple: true,
              custom: true,
              options: [{ label: '支持@人' }, { label: '不需要' }]
            }
          ]
        }
      },
      closing: null,
      attachments: null,
      quote: null,
      answered: false,
      at: '2026-09-12T11:30:00'
    },
    {
      id: '10',
      kind: 7,
      kindName: '报价卡',
      runId: null,
      text: null,
      question: null,
      closing: null,
      attachments: null,
      // 改价卡：event=repriced——admin#77 运营提示（改价即刻对用户可见）
      quote: { orderId: '3897654321098765432', event: 'repriced' },
      answered: false,
      at: '2026-09-12T11:35:00'
    }
  ],
  /** 口算天天练（归档照读）：短对话 + 收尾卡（可缺省键子集——该轮无 files/selfTest/version 事实）。 */
  '7392120209092500007': [
    {
      id: '21',
      kind: 1,
      kindName: '用户',
      runId: null,
      text: '口算练习要能按年级出题，自动判分。',
      question: null,
      closing: null,
      attachments: null,
      quote: null,
      answered: false,
      at: '2026-09-09T08:30:10'
    },
    {
      id: '22',
      kind: 5,
      kindName: '收尾卡',
      runId: 'run-20260909-c3',
      text: null,
      question: null,
      closing: { summary: '口算出题与判分落地', prdChanged: false, systemChanged: true, durationMs: 655000 },
      attachments: null,
      quote: null,
      answered: false,
      at: '2026-09-09T16:08:00'
    }
  ]
};

/** PRD 全文（按项目 id；校园社团招新小程序缺档 → mock 404 PRD_NOT_PRODUCED 走 toast）。 */
export const PRDS = {
  '7392120209100200009': {
    projectId: '7392120209100200009',
    content:
      '# 教研备课知识库\n\n## 背景\n组内教案分散在个人网盘，检索困难。\n\n## 目标\n1. 教案结构化沉淀\n2. 按学科/年级检索\n3. 备课组协同批注（第二轮迭代）\n\n## 非目标\n- 不做学生侧访问',
    updatedAt: '2026-09-10T15:20:00'
  },
  '7392120209092500007': {
    projectId: '7392120209092500007',
    content: '# 口算天天练\n\n## 目标\n按年级出题、自动判分、错题回顾。',
    updatedAt: '2026-09-09T09:40:00'
  }
};

/** 版本列表（按项目 id；git log 新→旧；回滚版本 runId 空 + rollbackFrom 锚定源版本）。 */
export const VERSIONS = {
  '7392120209100200009': [
    {
      commitHash: '9f31c02a7d4e8b6a0c1f23456789abcdef01234',
      subject: '收口：协同批注功能落地',
      runId: 'run-20260912-b2',
      rollbackFrom: null,
      committedAt: '2026-09-12T11:28:00'
    },
    {
      commitHash: '8e21b0196c3d7a590b0e123456789abcdef0123',
      subject: '收口：首版知识库骨架与检索',
      runId: 'run-20260910-a1',
      rollbackFrom: null,
      committedAt: '2026-09-10T18:45:00'
    },
    {
      commitHash: '7d10a0185b2c6948a0d0123456789abcdef012',
      subject: '回滚到首版骨架后的修复',
      runId: null,
      rollbackFrom: '8e21b0196c3d7a590b0e123456789abcdef0123',
      committedAt: '2026-09-09T12:00:00'
    }
  ],
  '7392120209092500007': [
    {
      commitHash: '6c009f074a1b583790c0abcdef0123456789',
      subject: '收口：口算出题与判分',
      runId: 'run-20260909-c3',
      rollbackFrom: null,
      committedAt: '2026-09-09T16:07:00'
    }
  ]
};

/** 版本详情（按 `${projectId}:${ref}`；锚定收尾卡 closing 载荷原样；回滚/缺位 closing 为 null）。 */
export const VERSION_DETAILS = {
  '7392120209100200009:9f31c02a7d4e8b6a0c1f23456789abcdef01234': {
    commitHash: '9f31c02a7d4e8b6a0c1f23456789abcdef01234',
    subject: '收口：协同批注功能落地',
    runId: 'run-20260912-b2',
    rollbackFrom: null,
    committedAt: '2026-09-12T11:28:00',
    closing: {
      summary: '协同批注落地：教案页内批注 + 备课组可见（本轮 PRD 未变，系统更新 4 文件）',
      prdChanged: false,
      systemChanged: true,
      files: [{ path: 'src/annotation/Editor.tsx', added: 86, removed: 12 }],
      durationMs: 812000
    }
  },
  '7392120209100200009:8e21b0196c3d7a590b0e123456789abcdef0123': {
    commitHash: '8e21b0196c3d7a590b0e123456789abcdef0123',
    subject: '收口：首版知识库骨架与检索',
    runId: 'run-20260910-a1',
    rollbackFrom: null,
    committedAt: '2026-09-10T18:45:00',
    closing: {
      summary: '首版知识库骨架落地：教案入库 + 学科年级检索（PRD 同步补充批注需求）',
      prdChanged: true,
      prdNote: '补充第二轮批注范围',
      systemChanged: true,
      durationMs: 1043000
    }
  },
  /** 回滚版本：无 run / 收尾卡缺位（closing=null，版本元数据仍如实返回）。 */
  '7392120209100200009:7d10a0185b2c6948a0d0123456789abcdef012': {
    commitHash: '7d10a0185b2c6948a0d0123456789abcdef012',
    subject: '回滚到首版骨架后的修复',
    runId: null,
    rollbackFrom: '8e21b0196c3d7a590b0e123456789abcdef0123',
    committedAt: '2026-09-09T12:00:00',
    closing: null
  },
  '7392120209092500007:6c009f074a1b583790c0abcdef0123456789': {
    commitHash: '6c009f074a1b583790c0abcdef0123456789',
    subject: '收口：口算出题与判分',
    runId: 'run-20260909-c3',
    rollbackFrom: null,
    committedAt: '2026-09-09T16:07:00',
    closing: { summary: '口算出题与判分落地', prdChanged: false, systemChanged: true, durationMs: 655000 }
  }
};

/**
 * 交付文件树（按项目 id；#59）——形状派生自 `AiplatformProjectFilesResponse` /
 * `FileEntry`：只列文件 [{path,size}]（目录由前端按路径段合成）、size Long（字节）→ **string**、
 * path 按路径稳定排序。交付口径 = 剔 data/、.platform/、node_modules/ 与 .env（.env 不入树，
 * 故机密拒读 4020 经树不可达——mock 只覆盖树内可达的 4022/4023 两类拒读，与契约一致）。
 * 树含根级文件 + 三层目录（assets/docs/src×2），覆盖前端目录合成与默认展开。
 */
export const FILE_TREES = {
  '7392120209100500010': {
    projectId: '7392120209100500010',
    files: [
      { path: 'assets/hero.png', size: '5242880' },
      { path: 'docs/PRD.md', size: '2048' },
      { path: 'package.json', size: '512' },
      { path: 'src/app/page.tsx', size: '10240' },
      { path: 'src/components/Card.tsx', size: '4096' },
      { path: 'src/lib/utils.ts', size: '2560' },
      { path: 'src/sitemap.raw.map', size: '12582912' }
    ]
  }
};

/** 文本文件内容（按 `${projectId}:${path}`；path 原样回显 + content 工作区原样文本）。 */
export const FILE_CONTENTS = {
  '7392120209100500010:package.json': {
    path: 'package.json',
    content: '{\n  "name": "club-recruit-miniapp",\n  "version": "0.3.1",\n  "private": true\n}'
  },
  '7392120209100500010:docs/PRD.md': {
    path: 'docs/PRD.md',
    content: '# 社团招新小程序 PRD\n\n## 目标\n线上报名、社团审核、名单一键导出。'
  },
  '7392120209100500010:src/app/page.tsx': {
    path: 'src/app/page.tsx',
    content: 'export default function Page() {\n  return <main>社团招新报名入口</main>;\n}'
  }
};

/**
 * 拒读响应（按 `${projectId}:${path}`；AiplatformUpstreamErrorAdvice 形状——HTTP 状态照抄 provider、
 * code=数字业务码、message 原文）。两类树内可达拒读：超 1MiB 上限 4022 / 非文本 4023——
 * 前端统一「无法预览」一态兜底，两码同 UI 态正是 mock 要钉死的事实。
 */
export const FILE_REJECTIONS = {
  '7392120209100500010:src/sitemap.raw.map': {
    status: 400,
    code: 4022,
    message: '文件超过在线查看上限（1 MiB）（PRJ_022）'
  },
  '7392120209100500010:assets/hero.png': {
    status: 400,
    code: 4023,
    message: '非文本文件，无法在线查看（PRJ_023）'
  }
};
