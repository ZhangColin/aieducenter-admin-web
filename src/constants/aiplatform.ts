/**
 * AI 平台领域常量（aiplatform，#56/#57/#58/#60）——订单域 + 项目域 + 沙箱域。
 *
 * `status` 是 Integer code，响应带 `statusName` 中文名（ADR-0009 直读）——
 * 列表/详情/下拉标签文案直接用响应 `statusName` 原值（aiplatform 链路有 *Name，与 account 域
 * 无 *Name、需 record 映射不同，故本域无 statusRecord）；
 * 本文件只服务**筛选下拉选项与标签配色**（按钮门控用 `status` code：未支付=1|2 可报价/取消；3 已支付可重试归档）。
 * 整数枚举范式：手写 options、不走 transformRecordToOption（number 键运行时被压 string，破坏 NSelect）。
 */

/** 订单状态标签色（语义：待报价信息 / 已报价主色 / 已支付成功 / 终态灰 / 取消红）。 */
export const orderStatusTagColor: Record<Api.Aiplatform.OrderStatus, NaiveUI.ThemeColor> = {
  1: 'info',
  2: 'primary',
  3: 'success',
  4: 'default',
  5: 'error'
};

/** 状态筛选下拉（多选；手写 number options，组件内渲染时翻译）。 */
export const orderStatusOptions: CommonType.Option<Api.Aiplatform.OrderStatus, App.I18n.I18nKey>[] = [
  { value: 1, label: 'page.aiplatform.order.statusEnum.pendingQuote' },
  { value: 2, label: 'page.aiplatform.order.statusEnum.quoted' },
  { value: 3, label: 'page.aiplatform.order.statusEnum.paid' },
  { value: 4, label: 'page.aiplatform.order.statusEnum.archived' },
  { value: 5, label: 'page.aiplatform.order.statusEnum.cancelled' }
];

/** 项目状态标签色（语义：进行中主色 / 已归档终态灰）。 */
export const projectStatusTagColor: Record<Api.Aiplatform.ProjectStatus, NaiveUI.ThemeColor> = {
  1: 'primary',
  3: 'default'
};

/**
 * 项目状态筛选三档单选（全部='all' 占位缺省不传参；与订单多选有意不同——provider 项目清单只收单值）。
 * 整数枚举手写 options 先例；「全部」用 'all' 哨兵字符串（NRadio value 不收 null）。
 */
export const projectStatusRadioOptions: { value: 'all' | Api.Aiplatform.ProjectStatus; label: App.I18n.I18nKey }[] = [
  { value: 'all', label: 'page.aiplatform.project.statusEnum.all' },
  { value: 1, label: 'page.aiplatform.project.statusEnum.inProgress' },
  { value: 3, label: 'page.aiplatform.project.statusEnum.archived' }
];

/** 对话史 kind 标签色（语义：用户主色 / 智能体成功 / 问答卡 warning / 作答 info / 收尾卡红 / 平台引导灰）。 */
export const conversationKindTagColor: Record<Api.Aiplatform.ConversationEntryKind, NaiveUI.ThemeColor> = {
  1: 'primary',
  2: 'success',
  3: 'warning',
  4: 'info',
  5: 'error',
  6: 'default'
};

/* ---- 沙箱域（#60）---- */

/** 期望态筛选下拉（单选；手写 number options，组件内渲染时翻译；漂移清单=运行(1)+无容器(3) 组合）。 */
export const desiredStateOptions: CommonType.Option<Api.Aiplatform.WorkspaceDesiredState, App.I18n.I18nKey>[] = [
  { value: 1, label: 'page.aiplatform.workspace.desiredEnum.running' },
  { value: 2, label: 'page.aiplatform.workspace.desiredEnum.hibernated' },
  { value: 3, label: 'page.aiplatform.workspace.desiredEnum.sealed' }
];

/** 实态筛选下拉（单选；探查一瞥不落库——UNKNOWN 是诚实位，探查失败≠容器不在）。 */
export const containerStateOptions: CommonType.Option<Api.Aiplatform.WorkspaceContainerState, App.I18n.I18nKey>[] = [
  { value: 1, label: 'page.aiplatform.workspace.actualEnum.running' },
  { value: 2, label: 'page.aiplatform.workspace.actualEnum.stopped' },
  { value: 3, label: 'page.aiplatform.workspace.actualEnum.absent' },
  { value: 4, label: 'page.aiplatform.workspace.actualEnum.unknown' }
];

/** 置备状态标签色（语义：置备中 warning / 就绪成功 / 失败红）。 */
export const provisioningStatusTagColor: Record<Api.Aiplatform.WorkspaceProvisioningStatus, NaiveUI.ThemeColor> = {
  1: 'warning',
  2: 'success',
  3: 'error'
};

/** 期望态标签色（语义：运行主色 / 休眠 info / 封存终态灰——意图侧）。 */
export const desiredStateTagColor: Record<Api.Aiplatform.WorkspaceDesiredState, NaiveUI.ThemeColor> = {
  1: 'primary',
  2: 'info',
  3: 'default'
};

/** 实态标签色（语义：运行中成功 / 已停止 warning / 无容器红（期望运行时即漂移）/ 未知灰）。 */
export const containerStateTagColor: Record<Api.Aiplatform.WorkspaceContainerState, NaiveUI.ThemeColor> = {
  1: 'success',
  2: 'warning',
  3: 'error',
  4: 'default'
};

/**
 * 中间件资源 kind 端侧映射（1=PostgreSQL 2=Redis）——resources[].kind 契约**无 *Name 字段**
 * （区别于其余枚举 ADR-0009 直读）；两值是语言无关专有名词，端侧小映射不构成 i18n 负担。
 */
export const middlewareKindLabel: Record<1 | 2, string> = {
  1: 'PostgreSQL',
  2: 'Redis'
};

/**
 * 沙箱四写可用性（列表行下拉与详情抽屉共用单点，防两处门控漂移）。
 * 契约守卫链 WSP_001→007→015→009→017 的**可前置观测子集**（kind/status/desiredState 三要素）：
 * - 非 DEV（WSP_007）：四写全拒（v1 仅 DEV；TEST/PROD 纯运行不开放干预）——不可达操作不出现。
 * - 唤醒：无状态限制——封存态走深度唤醒、漂移/已死容器走幂等重建、run 在途不受限（不动数据面）。
 * - 休眠/重建/封存（重活三写同守卫 WSP_009）：置备中(1)/封存态(3) 拒——封存态卷已删（先唤醒）、
 *   置备在途不可打断。休眠对「已休眠」幂等成功（补删残留容器），照常给——期望休眠而实态运行
 *   的残留容器行正需要它。
 * run 在途(WSP_015)/收敛任务在途(WSP_017) 不在本函数可见字段内，留给服务端裁决走透传 toast。
 */
export function availableWorkspaceActions(meta: {
  kind: Api.Aiplatform.WorkspaceEnvKind;
  status: Api.Aiplatform.WorkspaceProvisioningStatus;
  desiredState: Api.Aiplatform.WorkspaceDesiredState;
}): Api.Aiplatform.WorkspaceAction[] {
  if (meta.kind !== 1) return [];
  const heavyAllowed = meta.status !== 1 && meta.desiredState !== 3;
  return heavyAllowed ? ['wake', 'hibernate', 'rebuild', 'seal'] : ['wake'];
}

/** 沙箱四写权限码（hasAuth 门控用；与门控 helper 同居单点——列表页与抽屉共用）。 */
export const workspaceWriteAuth: Record<Api.Aiplatform.WorkspaceAction, string> = {
  wake: 'admin:aiplatform:workspace:wake',
  hibernate: 'admin:aiplatform:workspace:hibernate',
  rebuild: 'admin:aiplatform:workspace:rebuild',
  seal: 'admin:aiplatform:workspace:seal'
};
