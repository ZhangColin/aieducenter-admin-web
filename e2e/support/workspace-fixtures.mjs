/**
 * 沙箱域 E2E mock fixtures（#60）——字段形状派生自 admin :8081 `/v3/api-docs`：
 * - `AiplatformWorkspaceSummaryResponse`（列表行：workspaceId/containerName/kind·kindName/
 *   status·statusName/desiredState·desiredStateName/containerState·containerStateName/
 *   lastTouchAt/volumeSizeBytes/sealedAt/archiveSizeBytes/project）
 * - `AiplatformWorkspaceDetailResponse`（详情＝清单超集：+ networkName/provisionError/
 *   archivePath/createdAt/updatedAt/resources；resources 元素 {kind,containerName,internalUrl}
 *   无 kindName——kind 端侧小映射 1=PostgreSQL 2=Redis）
 *
 * 契约要点（api-docs + provider 枚举印证，2026-09-16）：workspaceId 为 TSID 字符串；
 * 期望态 1=运行 2=休眠 3=封存（意图侧）/实态 1=运行中 2=已停止 3=无容器 4=未知（探查一瞥不落库）；
 * 置备状态 1=置备中 2=就绪 3=失败；环境类型 1=开发 2=测试 3=生产（v1 仅 DEV，TEST 行专测
 * WSP_007 门控）；volumeSizeBytes/archiveSizeBytes Long（字节）→ **string**（封存容缺/探查失败 null）；
 * project 软引用可空（工作区先于项目存在）；清单新沙箱在前（TSID 倒序）。
 *
 * 与订单/项目域 fixtures 交叉一致：教研备课知识库/校园社团招新小程序/口算天天练的
 * workspaceId 即 project-fixtures 详情里的 workspaceId 字段（同批 TSID，跨域排查叙事连贯）。
 */

/** 列表行（12 条 = 两页 @size10；全状态矩阵：健康/漂移/泄漏/休眠收敛/封存/置备中/失败/未知/TEST）。 */
export const WORKSPACE_ROWS = [
  {
    workspaceId: '7394120209100500098',
    containerName: 'ws-7394120209100500098-app',
    kind: 1,
    kindName: '开发',
    status: 2,
    statusName: '就绪',
    desiredState: 1,
    desiredStateName: '运行',
    containerState: 1,
    containerStateName: '运行中',
    lastTouchAt: '2026-09-12T11:35:00',
    volumeSizeBytes: '5368709120',
    sealedAt: null,
    archiveSizeBytes: null,
    project: { projectId: '7392120209100500010', name: '校园社团招新小程序', archived: false }
  },
  {
    workspaceId: '7394120209100300102',
    containerName: 'ws-7394120209100300102-app',
    kind: 1,
    kindName: '开发',
    status: 1,
    statusName: '置备中',
    desiredState: 1,
    desiredStateName: '运行',
    containerState: 3,
    containerStateName: '无容器',
    lastTouchAt: '2026-09-12T10:20:00',
    volumeSizeBytes: null,
    sealedAt: null,
    archiveSizeBytes: null,
    project: null
  },
  {
    workspaceId: '7394120209100280101',
    containerName: 'ws-7394120209100280101-app',
    kind: 1,
    kindName: '开发',
    status: 2,
    statusName: '就绪',
    desiredState: 1,
    desiredStateName: '运行',
    containerState: 1,
    containerStateName: '运行中',
    lastTouchAt: '2026-09-12T09:48:00',
    volumeSizeBytes: '3221225472',
    sealedAt: null,
    archiveSizeBytes: null,
    project: { projectId: '7392120209101200012', name: '智能排课助手', archived: false }
  },
  {
    workspaceId: '7394120209100200099',
    containerName: 'ws-7394120209100200099-app',
    kind: 1,
    kindName: '开发',
    status: 2,
    statusName: '就绪',
    desiredState: 1,
    desiredStateName: '运行',
    containerState: 3,
    containerStateName: '无容器',
    lastTouchAt: '2026-09-12T08:15:00',
    volumeSizeBytes: '2147483648',
    sealedAt: null,
    archiveSizeBytes: null,
    project: { projectId: '7392120209100200009', name: '教研备课知识库', archived: false }
  },
  {
    workspaceId: '7394120209100180100',
    containerName: 'ws-7394120209100180100-app',
    kind: 1,
    kindName: '开发',
    status: 2,
    statusName: '就绪',
    desiredState: 2,
    desiredStateName: '休眠',
    containerState: 1,
    containerStateName: '运行中',
    lastTouchAt: '2026-09-11T22:40:00',
    volumeSizeBytes: '1073741824',
    sealedAt: null,
    archiveSizeBytes: null,
    project: { projectId: '7392120209092800008', name: '家校沟通助手', archived: false }
  },
  {
    workspaceId: '7394120209100120098',
    containerName: 'ws-7394120209100120098-app',
    kind: 1,
    kindName: '开发',
    status: 2,
    statusName: '就绪',
    desiredState: 1,
    desiredStateName: '运行',
    containerState: 2,
    containerStateName: '已停止',
    lastTouchAt: '2026-09-11T18:02:00',
    volumeSizeBytes: '524288000',
    sealedAt: null,
    archiveSizeBytes: null,
    project: { projectId: '7392120209091500005', name: '实验报告批改助手', archived: false }
  },
  {
    workspaceId: '7394120209092800001',
    containerName: 'ws-7394120209092800001-app',
    kind: 1,
    kindName: '开发',
    status: 2,
    statusName: '就绪',
    desiredState: 1,
    desiredStateName: '运行',
    containerState: 4,
    containerStateName: '未知',
    lastTouchAt: '2026-09-11T14:30:00',
    volumeSizeBytes: null,
    sealedAt: null,
    archiveSizeBytes: null,
    project: { projectId: '7392120209091000004', name: '班会课素材生成器', archived: false }
  },
  {
    workspaceId: '7394120209092500097',
    containerName: 'ws-7394120209092500097-app',
    kind: 1,
    kindName: '开发',
    status: 2,
    statusName: '就绪',
    desiredState: 3,
    desiredStateName: '封存',
    containerState: 3,
    containerStateName: '无容器',
    lastTouchAt: '2026-09-10T09:00:00',
    volumeSizeBytes: null,
    sealedAt: '2026-09-10T09:00:00',
    archiveSizeBytes: '104857600',
    project: { projectId: '7392120209092500007', name: '口算天天练', archived: true }
  },
  {
    workspaceId: '7394120209092000096',
    containerName: 'ws-7394120209092000096-app',
    kind: 1,
    kindName: '开发',
    status: 2,
    statusName: '就绪',
    desiredState: 1,
    desiredStateName: '运行',
    containerState: 1,
    containerStateName: '运行中',
    lastTouchAt: '2026-09-10T16:22:00',
    volumeSizeBytes: '2684354560',
    sealedAt: null,
    archiveSizeBytes: null,
    project: { projectId: '7392120209092000006', name: '英语晨读陪练', archived: true }
  },
  {
    workspaceId: '7394120209091500095',
    containerName: 'ws-7394120209091500095-app',
    kind: 1,
    kindName: '开发',
    status: 3,
    statusName: '失败',
    desiredState: 1,
    desiredStateName: '运行',
    containerState: 3,
    containerStateName: '无容器',
    lastTouchAt: '2026-09-09T11:10:00',
    volumeSizeBytes: null,
    sealedAt: null,
    archiveSizeBytes: null,
    project: { projectId: '7392120209090500003', name: '错题本同步工具', archived: true }
  },
  {
    workspaceId: '7394120209091000094',
    containerName: 'ws-7394120209091000094-app',
    kind: 2,
    kindName: '测试',
    status: 2,
    statusName: '就绪',
    desiredState: 1,
    desiredStateName: '运行',
    containerState: 1,
    containerStateName: '运行中',
    lastTouchAt: '2026-09-08T10:05:00',
    volumeSizeBytes: '1288490188',
    sealedAt: null,
    archiveSizeBytes: null,
    project: { projectId: '7392120209090100002', name: '听力训练助手', archived: false }
  },
  {
    workspaceId: '7394120209090500093',
    containerName: 'ws-7394120209090500093-app',
    kind: 1,
    kindName: '开发',
    status: 2,
    statusName: '就绪',
    desiredState: 1,
    desiredStateName: '运行',
    containerState: 1,
    containerStateName: '运行中',
    lastTouchAt: '2026-09-07T09:12:00',
    volumeSizeBytes: '1610612736',
    sealedAt: null,
    archiveSizeBytes: null,
    project: { projectId: '7392120209082800001', name: '作文批改引擎', archived: false }
  }
];

/**
 * 详情（按 id 索引；E2E 打开四个：漂移主档 / 封存档 / 置备中无项目档 / 失败排障档）。
 * detail 派生函数见 harness（四写响应＝动作后的观测详情——mock 按 action 变异基档回填）。
 */
export const WORKSPACE_DETAILS = {
  /** 漂移行主档：期望运行而实态无容器（#168 型）；中间件双资源 + 全量审计列；四写全开。 */
  '7394120209100200099': {
    workspaceId: '7394120209100200099',
    containerName: 'ws-7394120209100200099-app',
    networkName: 'ws-7394120209100200099-preview',
    kind: 1,
    kindName: '开发',
    status: 2,
    statusName: '就绪',
    provisionError: null,
    desiredState: 1,
    desiredStateName: '运行',
    containerState: 3,
    containerStateName: '无容器',
    lastTouchAt: '2026-09-12T08:15:00',
    volumeSizeBytes: '2147483648',
    sealedAt: null,
    archivePath: null,
    archiveSizeBytes: null,
    createdAt: '2026-09-10T14:05:00',
    updatedAt: '2026-09-12T08:15:00',
    resources: [
      { kind: 1, containerName: 'ws-7394120209100200099-pg', internalUrl: 'postgresql://dev:***@postgres:5432/app' },
      { kind: 2, containerName: 'ws-7394120209100200099-redis', internalUrl: 'redis://redis:6379/0' }
    ],
    project: { projectId: '7392120209100200009', name: '教研备课知识库', archived: false }
  },
  /** 封存档：sealedAt/archivePath/archiveSizeBytes 齐备、卷容缺 null、resources 空；仅唤醒可达。 */
  '7394120209092500097': {
    workspaceId: '7394120209092500097',
    containerName: 'ws-7394120209092500097-app',
    networkName: 'ws-7394120209092500097-preview',
    kind: 1,
    kindName: '开发',
    status: 2,
    statusName: '就绪',
    provisionError: null,
    desiredState: 3,
    desiredStateName: '封存',
    containerState: 3,
    containerStateName: '无容器',
    lastTouchAt: '2026-09-10T09:00:00',
    volumeSizeBytes: null,
    sealedAt: '2026-09-10T09:00:00',
    archivePath: 'workspace-sealed/7394120209092500097.tar.gz',
    archiveSizeBytes: '104857600',
    createdAt: '2026-09-09T08:35:00',
    updatedAt: '2026-09-10T09:00:00',
    resources: [],
    project: { projectId: '7392120209092500007', name: '口算天天练', archived: true }
  },
  /** 置备中档：project=null（工作区先于项目存在）；重活三写拒（置备在途），仅唤醒。 */
  '7394120209100300102': {
    workspaceId: '7394120209100300102',
    containerName: 'ws-7394120209100300102-app',
    networkName: 'ws-7394120209100300102-preview',
    kind: 1,
    kindName: '开发',
    status: 1,
    statusName: '置备中',
    provisionError: null,
    desiredState: 1,
    desiredStateName: '运行',
    containerState: 3,
    containerStateName: '无容器',
    lastTouchAt: '2026-09-12T10:20:00',
    volumeSizeBytes: null,
    sealedAt: null,
    archivePath: null,
    archiveSizeBytes: null,
    createdAt: '2026-09-12T10:18:00',
    updatedAt: '2026-09-12T10:20:00',
    resources: [],
    project: null
  },
  /** 失败档：provisionError 排障列（FAILED 态非 null）。 */
  '7394120209091500095': {
    workspaceId: '7394120209091500095',
    containerName: 'ws-7394120209091500095-app',
    networkName: 'ws-7394120209091500095-preview',
    kind: 1,
    kindName: '开发',
    status: 3,
    statusName: '失败',
    provisionError: '置备超时：基础镜像拉取失败（registry 不可达）',
    desiredState: 1,
    desiredStateName: '运行',
    containerState: 3,
    containerStateName: '无容器',
    lastTouchAt: '2026-09-09T11:10:00',
    volumeSizeBytes: null,
    sealedAt: null,
    archivePath: null,
    archiveSizeBytes: null,
    createdAt: '2026-09-07T13:20:00',
    updatedAt: '2026-09-09T11:10:00',
    resources: [],
    project: { projectId: '7392120209090500003', name: '错题本同步工具', archived: true }
  }
};
