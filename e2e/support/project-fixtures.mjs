/**
 * 项目域 E2E mock fixtures（#58）——字段形状派生自 admin :8081 `/v3/api-docs`：
 * - `AiplatformProjectSummaryResponse`（列表行：id/name/ownerDisplayName/type·typeName/
 *   status·statusName/archived/createdAt/updatedAt）
 * - `AiplatformProjectDetailResponse`（详情：+ workspaceId/prdProducedAt/generatedAt/
 *   activeOrder·latestOrder 订单引用/costSummary 成本指针）
 * - `AiplatformConversationEntryResponse`（对话史：text/kind·kindName/answered/at；
 *   question/closing/attachments 载荷原样——REQ-20 #75 前端跳过不渲染）
 * - `AiplatformPrdResponse`（PRD 全文：projectId/content/updatedAt）
 * - `AiplatformVersionResponse` / `AiplatformVersionDetailResponse`（版本列表新→旧 /
 *   详情锚定收尾卡 closing，回滚版本 runId 空 + closing 可空）
 *
 * 契约要点（api-docs + provider 文档实测 2026-09-16）：id 为 TSID 字符串；项目状态
 * 1=进行中 3=已归档（archived 同派生）；清单新项目在前（TSID 倒序）——fixtures 按 id 降序；
 * 详情 activeOrder=未终结订单（1|2）、latestOrder=最近任意状态（支付归档后 activeOrder 转空
 * 由本字段承接）；costSummary.cost 为 {}（REQ-20 暂缓渲染）、unpriced 标记成本完整性；
 * kind 1=user 2=agent 3=question 4=answer 5=closing 6=guide，question/closing 条目 text=null。
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
    costSummary: { cost: {}, unpriced: false }
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
    costSummary: { cost: {}, unpriced: false }
  }
};

/** 对话史（按项目 id；全量同序 id 升序 = 对话序；六 kind 全覆盖）。 */
export const CONVERSATIONS = {
  /** 教研备课知识库：开场 → 首版收口 → 迭代意见 → 挂起问答卡（answered=false）。 */
  '7392120209100200009': [
    {
      id: '1',
      kind: 1,
      kindName: '用户',
      runId: null,
      text: '我们想做一个教研备课知识库，先把组内教案沉淀下来。',
      question: null,
      closing: null,
      attachments: null,
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
      answered: false,
      at: '2026-09-10T14:03:00'
    },
    {
      id: '3',
      kind: 3,
      kindName: '问答',
      runId: 'run-20260910-a1',
      text: null,
      question: {
        questions: ['优先级最高的是哪个方向？'],
        sentinelShouldNotRender: 'QUESTION_PAYLOAD_SENTINEL'
      },
      closing: null,
      attachments: null,
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
      closing: {
        summary: '首版知识库骨架落地：教案入库 + 学科年级检索（PRD 同步补充批注需求）',
        prdChanged: true,
        systemChanged: true
      },
      attachments: null,
      answered: false,
      at: '2026-09-10T18:46:00'
    },
    {
      id: '6',
      kind: 1,
      kindName: '用户',
      runId: null,
      text: '第二版把协同批注加上。',
      question: null,
      closing: null,
      attachments: null,
      answered: false,
      at: '2026-09-12T10:20:00'
    },
    {
      id: '7',
      kind: 6,
      kindName: '平台引导',
      runId: null,
      text: '已收到你的迭代意见，构建完成后会在这里同步结果。',
      question: null,
      closing: null,
      attachments: null,
      answered: false,
      at: '2026-09-12T10:20:05'
    },
    {
      id: '8',
      kind: 3,
      kindName: '问答',
      runId: 'run-20260912-b2',
      text: null,
      question: {
        questions: ['批注需要支持@人吗？'],
        sentinelShouldNotRender: 'QUESTION_PAYLOAD_SENTINEL'
      },
      closing: null,
      attachments: null,
      answered: false,
      at: '2026-09-12T11:30:00'
    }
  ],
  /** 口算天天练（归档照读）：短对话 + 收尾卡。 */
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
      closing: { summary: '口算出题与判分落地', prdChanged: false, systemChanged: true },
      attachments: null,
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
      files: [{ path: 'src/annotation/Editor.tsx', linesAdded: 86, linesRemoved: 12 }],
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
