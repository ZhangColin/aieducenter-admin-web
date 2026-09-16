/**
 * AI 平台（aiplatform，#56/#57/#58）——类型契约。
 *
 * 消费 admin BFF `/api/admin/aiplatform/**`（admin#62 定稿、#63–#73 落地；契约正本 =
 * admin :8081 `/v3/api-docs`，逐字镜像 aiplatform provider `/api/backoffice/**`）。
 * 契约事实（api-docs 实测，2026-09-16）：
 * - `id`/`projectId` 为 Long/TSID → JSON **字符串**；`amount` 为 Long（分）→ JSON **string**（同 payment，框架全局序列化）。
 * - 枚举带 `statusName`/`typeName`/`kindName` 中文名（ADR-0009 直读，不做端侧 code→中文映射）；本体为 Integer code。
 * - 订单状态五态（controller 文档 + provider OrderStatus 印证）：1=待报价 2=已报价(=待支付) 3=已支付 4=已归档 5=已取消。
 *   未支付态 = 1|2（报价/取消守卫）；重试归档 = 3（已支付未归档卡单）。
 * - 项目状态两档（provider 文档「1=进行中, 3=已归档」，码位 2 已注销不复用）：筛选三档单选 =
 *   全部(缺省)/进行中(1)/已归档(3)——与订单 status 多选逗号串有意不同（单值直传）。
 * - 项目类型 1=官网 2=电商（v1 单模板，分类仅展示，typeName 随行）。
 * - 对话史 kind 1=user 2=agent 3=question 4=answer 5=closing 6=guide；全量同序（id 升序=对话序）；
 *   question/closing/attachments 为事件载荷原样——REQ-20（admin#75）swagger 空对象未文档化，
 *   前端跳过不渲染（仅渲染 text/kind/answered/at）。
 * - 版本列表 = 容器 git log 新→旧；回滚版本 runId 空、rollbackFrom 锚定源版本；
 *   版本详情 closing 为收尾卡载荷（Map，可空——收尾卡缺位/回滚版本无收尾卡）。
 * - costSummary.cost 为 `{}`（REQ-20 暂缓渲染）；unpriced=true 成本不完整。
 * - 价目史 `priceEntries` append-only 全量、新→旧，每条带操作者（存量行操作者为 null）。
 * - 分页全链 1-based（ADR-0012），请求 `page` 直传零 ±1。
 * - `status` 多选筛选项（订单域）：逗号分隔单值（`status=1,5`，BFF 拼串透传 provider 签名协议）。
 */
declare namespace Api {
  namespace Aiplatform {
    /** 订单状态（五态）：1=待报价 2=已报价 3=已支付 4=已归档 5=已取消。 */
    type OrderStatus = 1 | 2 | 3 | 4 | 5;

    /** 价目史行（append-only；detail 响应带操作者两列）。 */
    interface OrderPriceEntry {
      id: string;
      /** Long（分）→ JSON string */
      amount: string;
      /** ISO 4217；v1 恒 CNY */
      currency: string;
      note: string | null;
      /** 操作者留痕（存量行为 null） */
      operatorId: string | null;
      operatorName: string | null;
      createdAt: string;
    }

    /** 订单列表行（GET /orders items 元素）。 */
    interface OrderSummary {
      /** TSID → string */
      id: string;
      projectId: string;
      projectName: string;
      /** 下单账号昵称（缺档为 null） */
      ownerDisplayName: string | null;
      status: OrderStatus;
      statusName: string;
      /** Long（分）→ JSON string；待报价 null */
      amount: string | null;
      currency: string;
      createdAt: string;
      quotedAt: string | null;
    }

    /** 订单详情（GET /orders/{id}；价目史全量新→旧 + PRD 快照 + 状态时点组）。 */
    interface OrderDetail {
      id: string;
      projectId: string;
      projectName: string;
      ownerDisplayName: string | null;
      status: OrderStatus;
      statusName: string;
      amount: string | null;
      currency: string;
      /** 最新报价备注 */
      note: string | null;
      priceEntries: OrderPriceEntry[];
      /** 下单冻结的 PRD 快照正文 */
      prdSnapshot: string | null;
      createdAt: string;
      quotedAt: string | null;
      paidAt: string | null;
      archivedAt: string | null;
      archiveOperatorId: string | null;
      archiveOperatorName: string | null;
      cancelledAt: string | null;
      cancelReason: string | null;
      cancelOperatorId: string | null;
      cancelOperatorName: string | null;
    }

    /** 写操作回执（quote/cancel/retry-archive；成功后前端不回读此体、自行回详情+刷列表）。 */
    interface OrderWriteAck {
      id: string;
      projectId: string;
      status: OrderStatus;
      statusName: string;
      amount: string | null;
      currency: string;
      note: string | null;
      quotedAt: string | null;
      /** 写回执的价目行不带操作者两列（契约如此，消费方不用） */
      priceEntries: Omit<OrderPriceEntry, 'operatorId' | 'operatorName'>[];
      createdAt: string;
      cancelledAt: string | null;
      paidAt: string | null;
      archivedAt: string | null;
    }

    /** GET /orders 查询参数。分页 1-based 直传；`status` 多选逗号拼接。 */
    interface OrderSearchParams {
      page: number;
      size: number;
      /** 状态多选（序列化为逗号分隔单值 status=1,5） */
      status?: OrderStatus[];
      /** 创建时间起（含），ISO-8601 本地串（如 2026-09-01T00:00:00） */
      createdFrom?: string;
      createdTo?: string;
      /** 下单账号 externalId 精确（换算不到＝空清单 200） */
      externalId?: string;
      /** 订单号精确（TSID 十进制；查无/非数值→空清单 200） */
      orderId?: string;
    }

    type OrderFilter = Omit<OrderSearchParams, 'page' | 'size'>;

    /** POST /orders/{id}/quote body——amount 整数分（Jackson Long 兼容 number）。 */
    interface QuoteOrderCommand {
      amount: number;
      note?: string;
    }

    /** POST /orders/{id}/cancel body——reason 必填（空禁用确认）。 */
    interface CancelOrderCommand {
      reason: string;
    }

    /** 项目状态（两档）：1=进行中 3=已归档（码位 2 已注销不复用）。 */
    type ProjectStatus = 1 | 3;

    /** 项目类型：1=官网 2=电商（v1 单模板，分类仅展示）。 */
    type ProjectType = 1 | 2;

    /** 对话史条目 kind：1=user 2=agent 3=question 4=answer 5=closing 6=guide。 */
    type ConversationEntryKind = 1 | 2 | 3 | 4 | 5 | 6;

    /** 项目列表行（GET /projects items 元素；清单 TSID 倒序=新项目在前，服务端定死）。 */
    interface ProjectSummary {
      /** TSID → string */
      id: string;
      name: string;
      /** 归属账号昵称（缺档/无主为 null） */
      ownerDisplayName: string | null;
      type: ProjectType;
      typeName: string;
      status: ProjectStatus;
      statusName: string;
      /** 归档标记（与 status=3 同派生自 archived_at） */
      archived: boolean;
      createdAt: string;
      updatedAt: string;
    }

    /** 订单引用（项目详情 activeOrder/latestOrder 内嵌摘要）。 */
    interface OrderBrief {
      id: string;
      status: OrderStatus;
      statusName: string;
    }

    /** 成本指针（cost:{} 为 REQ-20 缺口暂缓渲染；unpriced=true 成本不完整，无用量＝false 空态）。 */
    interface CostSummary {
      /** 按币种分桶——swagger 空对象未文档化（REQ-20 #75），v1 不渲染 */
      cost?: Record<string, number>;
      unpriced: boolean;
    }

    /** 项目详情（GET /projects/{id}；清单字段全量 + 工作区引用 + 订单引用双档 + 成本指针）。 */
    interface ProjectDetail {
      id: string;
      name: string;
      ownerDisplayName: string | null;
      /** 工作区引用（沙箱域下钻锚点） */
      workspaceId: string;
      type: ProjectType;
      typeName: string;
      status: ProjectStatus;
      statusName: string;
      archived: boolean;
      createdAt: string;
      updatedAt: string;
      prdProducedAt: string | null;
      generatedAt: string | null;
      /** 未终结订单（1|2）——有值即冻结迭代；支付归档后转空 */
      activeOrder: OrderBrief | null;
      /** 最近一张任意状态订单（activeOrder 转空后承接完整取单面；从未下单两者皆空） */
      latestOrder: OrderBrief | null;
      /** 成本汇总指针——恒在：无用量＝空 cost＋unpriced:false 明确空态（provider 文档钉死） */
      costSummary: CostSummary;
    }

    /** 对话史条目（GET /projects/{id}/conversation；id 升序=对话序全量同序）。 */
    interface ConversationEntry {
      /** Long → JSON string（对话序锚点，仅排序用不渲染） */
      id: string;
      kind: ConversationEntryKind;
      kindName: string;
      /** 锚定构建 run（用户发言/平台引导为 null） */
      runId: string | null;
      /** 话语正文——question/closing 条目为 null（载荷跳过，REQ-20） */
      text: string | null;
      /** 问答卡事件载荷原样——REQ-20 未文档化，跳过不渲染 */
      question?: Record<string, unknown> | null;
      /** 收尾卡载荷原样——REQ-20 未文档化，跳过不渲染（版本详情有锚定正口） */
      closing?: Record<string, unknown> | null;
      /** 圈注附件原样——REQ-20 未文档化，跳过不渲染 */
      attachments?: unknown[] | null;
      /** 问答卡作答标记（kind=3 语义：false=挂起待答；其余 kind 恒 false 不渲染） */
      answered: boolean;
      at: string;
    }

    /** PRD 全文（GET /projects/{id}/prd；工作区 docs/PRD.md 直读，v1 无版本链只最新版）。 */
    interface PrdContent {
      projectId: string;
      content: string;
      /** 文件 mtime */
      updatedAt: string;
    }

    /** 版本列表行（GET /projects/{id}/versions；git log 新→旧，零版本=空列表非错误）。 */
    interface VersionSummary {
      commitHash: string;
      subject: string;
      /** 锚定构建 run（回滚版本为 null） */
      runId: string | null;
      /** 回滚版本锚定源版本 hash（run 版本为 null） */
      rollbackFrom: string | null;
      committedAt: string;
    }

    /** 版本详情（GET /projects/{id}/versions/{ref}；+ 收尾卡载荷，可空）。 */
    interface VersionDetail {
      commitHash: string;
      subject: string;
      runId: string | null;
      rollbackFrom: string | null;
      committedAt: string;
      /** 收尾卡载荷（Map）——收尾卡缺位/回滚版本为 null（兜底文案） */
      closing: Record<string, unknown> | null;
    }

    /** 文件树条目（GET /projects/{id}/files 的 files 元素）。只列文件——目录由前端按路径段合成；size Long（字节）→ JSON string。 */
    interface FileEntry {
      /** 工作区相对路径（服务端按路径稳定排序） */
      path: string;
      /** Long（字节）→ JSON string */
      size: string;
    }

    /** 文件树（GET /projects/{id}/files；交付口径 = dev 工作区剔 data/、.platform/、node_modules/ 与 .env——与源码包同口径）。 */
    interface ProjectFiles {
      projectId: string;
      files: FileEntry[];
    }

    /** 文本文件内容（GET /projects/{id}/files/content?path=；provider 只读策略全裁决——机密/超 1MiB/非文本拒读走 HTTP 非 2xx）。 */
    interface FileContent {
      /** 原样回显请求 path */
      path: string;
      /** 工作区文件原样文本 */
      content: string;
    }

    /** GET /projects 查询参数。分页 1-based 直传；status 三档单选单值直传（缺省=全部）。 */
    interface ProjectSearchParams {
      page: number;
      size: number;
      /** 状态三档单选（1=进行中 3=已归档；缺省＝全部，归档项目缺省含） */
      status?: ProjectStatus;
      /** 创建时间起（含），ISO-8601 本地串（如 2026-09-01T00:00:00） */
      createdFrom?: string;
      createdTo?: string;
      /** 归属账号 externalId 精确（换算不到＝空清单 200） */
      externalId?: string;
      /** 项目 id 精确（TSID 十进制；查无/非数值→空清单 200） */
      projectId?: string;
    }

    type ProjectFilter = Omit<ProjectSearchParams, 'page' | 'size'>;
  }
}
