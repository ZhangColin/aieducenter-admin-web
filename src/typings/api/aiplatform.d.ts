/**
 * AI 平台（aiplatform，#56/#57/#58/#60/#61）——类型契约。
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
 * - 对话史 kind 1=user 2=agent 3=question 4=answer 5=closing 6=guide 7=quote；全量同序（id 升序=对话序）；
 *   question/closing/attachments/quote 为事件载荷原样（admin#75 已钉进 swagger @Schema——结构见
 *   各 payload 接口注释；载荷缺失/形状不符走空态不报错）。kindName 中文名随行直读（7=报价卡）。
 * - 版本列表 = 容器 git log 新→旧；回滚版本 runId 空、rollbackFrom 锚定源版本；
 *   版本详情 closing 为收尾卡载荷（与对话史 kind=5 同载荷 #88，可空——收尾卡缺位/回滚版本无收尾卡）。
 * - costSummary.cost 为按币种分桶（admin#75 已文档化）；unpriced=true 成本不完整。
 * - 价目史 `priceEntries` append-only 全量、新→旧，每条带操作者（存量行操作者为 null）。
 * - 分页全链 1-based（ADR-0012），请求 `page` 直传零 ±1。
 * - `status` 多选筛选项（订单域）：逗号分隔单值（`status=1,5`，BFF 拼串透传 provider 签名协议）。
 * - 沙箱域（#60，provider 枚举印证）：期望态 1=运行 2=休眠 3=封存（DB 意图侧）/实态 1=运行中
 *   2=已停止 3=无容器 4=未知（docker 探查一瞥，不落库）两列如实分示——「期望运行而实态无容器」
 *   即漂移行；置备状态 1=置备中 2=就绪 3=失败；环境类型 1=开发 2=测试 3=生产（v1 仅 DEV）。
 *   四写守卫链 WSP_001→007(非 DEV)→015(run 在途)→009(置备在途/封存态)→017：唤醒无状态限制
 *   （封存走深度唤醒、漂移行幂等重建），休眠/重建/封存同拒置备中(1)/封存态(3)。
 *   四写响应＝动作后的观测详情（WorkspaceDetail，区别于订单 OrderWriteAck——响应即新事实，
 *   前端直接回填抽屉免二次回读）；错误码数字形＝域码 1×1000＋序号（1001/1009/1015/1016/1017）。
 * - 成本域（#61，4 读端点）：时间窗 from/to **必填**（BFF 不设默认窗口；半开 [from,to)、
 *   ISO-8601 Instant UTC 带 Z）；五档 token 为 primitive long → JSON **数字**（非 Long-string）；
 *   `cost` 按币种分桶（admin#75 已文档化——键 = ISO 4217 币种码、值 = 金额直读不折算，
 *   swagger number 可能带小数，**不做分→元换算**；空对象 = 无用量或全未配价不伪装 0）；
 *   byAgentKind 的 agentKindName 为 null 落「—」桶
 *   （辅助标记）；项目成本清单排序服务端定死成本降序（全未配价排后 allUnpriced=true）。
 * - 单价表域（#62，3 端点）：`unitPrice` BigDecimal → JSON **string** 明文小数、**请求侧为 number**
 *   （REQ-20 #75——预填保响应原串勿经 Number() 往返，微小价位会落科学计数法形）；改价＝同事务
 *   关当前行+开新行（closed 行保留原开行操作者不被改写，opened 行落 X-User 落痕）；`effectiveTo`
 *   null 即当前行（改价/停用目标位，METER_007 目标非当前行 409）；无「开行」端点（种子脚本通道）。
 * - 素材域（#63，5 端点）：status 单选两态（1=启用 2=停用，缺省全部——与订单多选逗号串有意不同）；
 *   `kind` 为 **string 裸值**（v1 业务口径恒 "PRD"，无 *Name 字段——专有名词直显，不映射）；
 *   sunkFrom/sunkTo **闭区间含两端**、ISO-8601 Instant UTC 带 Z（同成本域时间窗口径，区别于
 *   订单/项目创建区间的本地串）；排序服务端定死沉淀时间倒序（新在前）。停用⇄启用可逆且重复幂等、
 *   删除不可逆（治理移除，不动来源项目；回执＝删除前终态 summary——确认移除了什么）。错误码数字形
 *   ＝域码 2×1000＋序号（KNW_005→2005 查无 404 / KNW_006→2006 缺 X-User 头 400 / KNW_007→2007
 *   未知 status 400）。
 *
 * 技能域（#67 技能管理，技能线 8 端点）：清单**无分页**（有界目录）、服务端排序内置在前；
 *   id 为 opaque 串两形制（内置＝`builtin:<技能名>` / 安装＝TSID 十进制串）——一律 string 透传、
 *   禁止数值化；source 1=内置 2=安装、status 1=启用 2=停用（与素材域同构），`*Name` 随行直读。
 *   安装命令无 tag/ref 字段（repoUrl＋excludeDirs[]，版本恒＝装时 HEAD commit）。回执三形：
 *   install＝装入条目 summary[] / uninstall·启停＝单个 summary（uninstall＝删除前终态）/
 *   update＝from→to＋removedSkillNames[]＋终态行集（from==to＝幂等未落痕未写行）。
 *   `updateAvailable` 为来源包级标记（true=远端 HEAD≠装时版本；null=未检查过、内置恒 null）
 *   ——**不门控更新动作**（provider 不保证检查过）。留痕 append-only 倒序、卸载不删痕。
 *   错误码数字形＝域码 7×1000＋序号（SKL_001→7001 查无 404 / SKL_002–007 安装失败族 /
 *   SKL_008→7008 有指派在身 409 / SKL_013→7013 更新整体拒绝 409）。
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

    /** 对话史条目 kind：1=user 2=agent 3=question 4=answer 5=closing 6=guide 7=quote（aiplatform#203）。 */
    type ConversationEntryKind = 1 | 2 | 3 | 4 | 5 | 6 | 7;

    /**
     * 问答卡载荷（kind=3 携带，其余 kind 为 null）——question-raised 事件 payload 原样
     * （admin#75 @Schema 文档化）。呈现投影 = `data.questions`；`data.toolCalls` 为答复续跑
     * 重建所需的待确认工具最小面（服务侧语义，不呈现）。
     */
    interface QuestionCardPayload {
      runId?: string;
      sessionId?: string;
      engine?: string;
      /** 单句概括（多问并一卡时为首个问题的原文） */
      summary?: string;
      engineRef?: string;
      data?: {
        toolCalls?: { id?: string; name?: string; input?: Record<string, unknown> }[];
        /** 问答卡投影（呈现主体）；custom 恒 true 可自由输入 */
        questions?: {
          header?: string;
          question?: string;
          multiple?: boolean;
          custom?: boolean;
          options?: { label?: string }[];
        }[];
      };
    }

    /** 收尾卡文件变更行（closing.files 元素）。 */
    interface ClosingFileChange {
      path: string;
      added: number;
      removed: number;
    }

    /**
     * 收尾卡载荷（kind=5 携带 / 版本详情锚定，#88 同载荷两承载面）——run-finish 收口扩载
     * 原样（admin#75 @Schema 文档化）。**可缺省键＝该轮无该事实**（全字段可选，按存在渲染）；
     * durationBreakdown 为平台分析口径，呈现可忽略（文档明示，不渲染）。
     */
    interface ClosingCardPayload {
      summary?: string;
      prdChanged?: boolean;
      prdNote?: string;
      systemChanged?: boolean;
      systemNote?: string;
      files?: ClosingFileChange[];
      durationMs?: number;
      selfTest?: { total?: number };
      /** 锚定版本 commit hash（全量 64 位十六进制） */
      version?: string;
      durationBreakdown?: {
        llmMs?: number;
        toolsMs?: number;
        selfTestMs?: number;
        closingMs?: number;
        attempts?: number[];
      };
    }

    /**
     * 圈注附件（kind=1 用户发言可携带，#97）——结构化定位＋标注类型，据此重建圈注 chip
     * （非截图）。annotation.kind 三值：select=点选锚定 / circle=拖框圈区域 / comment=历史兼容。
     */
    interface AnnotationAttachment {
      /** 恒 "annotation"（v1 唯一附件类型） */
      attachmentType?: string;
      annotation?: {
        kind?: string;
        anchor?: {
          /** CSS 选择器（select 点选） */
          selector?: string;
          /** 锚定文本（select 点选） */
          text?: string;
          /** 拖框区域（circle 圈选，页面坐标） */
          region?: { x: number; y: number; width: number; height: number };
        };
        note?: string;
      };
    }

    /**
     * 报价卡载荷（kind=7 携带，其余 kind 为 null，aiplatform#203）——仅事件＋订单引用，
     * **不含金额**（视镜非快照，aiplatform ADR-0017——金额/备注/状态呈现时取订单当前态）。
     */
    interface QuoteCardPayload {
      /** Long → JSON string（防 JS 精度丢失） */
      orderId: string;
      /** quoted=报价已出 / repriced=报价已更新（改价即刻对用户可见） */
      event: 'quoted' | 'repriced';
    }

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

    /**
     * 成本指针（cost 按币种分桶，admin#75 已文档化——键 = ISO 4217 币种码、值 = 金额直读不折算；
     * 空对象 = 无用量或全未配价，空态文案不伪装 0。unpriced=true 成本不完整，无用量＝false 空态）。
     */
    interface CostSummary {
      /** 按币种分桶（金额 swagger number 直读——非平台 Long 分口径，不做 ÷100 换算） */
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
      /** 话语正文——question/closing/quote 条目为 null（载荷入正文区渲染） */
      text: string | null;
      /** 问答卡载荷（kind=3 携带；缺失/形状不符走空态） */
      question?: QuestionCardPayload | null;
      /** 收尾卡载荷（kind=5 携带；与版本详情 #88 同载荷，ClosingCard 共组件渲染） */
      closing?: ClosingCardPayload | null;
      /** 圈注附件（kind=1 用户发言可携带；缺失/形状不符走空态） */
      attachments?: AnnotationAttachment[] | null;
      /** 报价卡载荷（kind=7 携带；视镜语义不含金额） */
      quote?: QuoteCardPayload | null;
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
      /** 收尾卡载荷（#88 与对话史 kind=5 同载荷，ClosingCard 共组件）——收尾卡缺位/回滚版本为 null */
      closing: ClosingCardPayload | null;
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

    /** 沙箱环境类型：1=开发 2=测试 3=生产（v1 仅 DEV；四写非 DEV 拒 WSP_007——TEST/PROD 纯运行不开放干预）。 */
    type WorkspaceEnvKind = 1 | 2 | 3;

    /** 沙箱置备状态：1=置备中 2=就绪 3=失败（置备中＝重活三写的 WSP_009 拒绝位）。 */
    type WorkspaceProvisioningStatus = 1 | 2 | 3;

    /** 期望态（DB 意图侧，ADR-0016）：1=运行 2=休眠 3=封存。 */
    type WorkspaceDesiredState = 1 | 2 | 3;

    /** 容器实态（docker 探查一瞥，不落库）：1=运行中 2=已停止 3=无容器 4=未知（探查失败的诚实位）。 */
    type WorkspaceContainerState = 1 | 2 | 3 | 4;

    /** 沙箱四写动作（wake/hibernate/rebuild/seal，均无 body）。 */
    type WorkspaceAction = 'wake' | 'hibernate' | 'rebuild' | 'seal';

    /** 中间件资源观测（详情 resources 元素）。kind 无 *Name 字段（契约如此）——专有名词端侧小映射（constants）。 */
    interface WorkspaceMiddlewareResource {
      /** 1=PostgreSQL 2=Redis（provider MiddlewareKind） */
      kind: 1 | 2;
      containerName: string;
      /** 连接串原文（容器内回环形态，排障用） */
      internalUrl: string;
    }

    /** 所属项目引用（软引用可空——工作区先于项目存在）。 */
    interface WorkspaceProjectRef {
      projectId: string;
      name: string;
      archived: boolean;
    }

    /** 沙箱列表行（GET /workspaces items 元素；新沙箱在前＝TSID 倒序，服务端定死）。 */
    interface WorkspaceSummary {
      /** TSID → string */
      workspaceId: string;
      containerName: string;
      kind: WorkspaceEnvKind;
      kindName: string;
      status: WorkspaceProvisioningStatus;
      statusName: string;
      desiredState: WorkspaceDesiredState;
      desiredStateName: string;
      containerState: WorkspaceContainerState;
      containerStateName: string;
      lastTouchAt: string;
      /** Long（字节）→ JSON string；封存容缺（卷已删）/探查失败为 null */
      volumeSizeBytes: string | null;
      sealedAt: string | null;
      /** Long（字节）→ JSON string；未封存为 null */
      archiveSizeBytes: string | null;
      /** 所属项目引用（无所属项目为 null） */
      project: WorkspaceProjectRef | null;
    }

    /** 沙箱详情（GET /workspaces/{id}；清单行超集——另带网络名/置备失败原因/封存包寻址键/审计列/中间件资源）。 */
    interface WorkspaceDetail extends WorkspaceSummary {
      networkName: string;
      /** 置备失败原因（FAILED 态非 null，其余 null） */
      provisionError: string | null;
      /** 封存包寻址键（未封存为 null） */
      archivePath: string | null;
      createdAt: string;
      updatedAt: string;
      resources: WorkspaceMiddlewareResource[];
    }

    /** GET /workspaces 查询参数。分页 1-based 直传；desired/actual 单选单值、可组合、均可缺省（缺省=全量）。 */
    interface WorkspaceSearchParams {
      page: number;
      size: number;
      /** 期望态单选（1=运行 2=休眠 3=封存） */
      desired?: WorkspaceDesiredState;
      /** 容器实态单选（1=运行中 2=已停止 3=无容器 4=未知）——漂移清单=desired 1+actual 3 组合 */
      actual?: WorkspaceContainerState;
    }

    type WorkspaceFilter = Omit<WorkspaceSearchParams, 'page' | 'size'>;

    /* ---- 成本域（#61）---- */

    /**
     * token 用量五档（成本域四端点共用载荷）。与订单金额的 Long-string 口径**有意不同**：
     * 后端 DTO 为 primitive long → JSON **数字**（swagger integer/int64；非包装 Long 的字符串序列化）。
     */
    interface TokenUsage {
      input: number;
      output: number;
      cacheRead: number;
      cacheWrite: number;
      reasoning: number;
    }

    /** 分模型聚合项（provider + model 为单价表匹配键）。 */
    interface ModelUsage {
      provider: string;
      model: string;
      tokens: TokenUsage;
    }

    /** 分智能体聚合项（agentKind 裸维度串原值；辅助标记 agentKindName 为 null——前端落「—」桶）。 */
    interface AgentKindUsage {
      agentKind: string | null;
      agentKindName: string | null;
      tokens: TokenUsage;
    }

    /** 平台成本全局总览（GET /costs/overview）。 */
    interface CostOverview {
      from: string;
      to: string;
      total: TokenUsage;
      /** 按币种分桶（admin#75 已文档化——ISO 4217 码 → 金额直读不折算；空对象＝无用量或全未配价） */
      cost?: Record<string, number>;
      byModel: ModelUsage[];
      byAgentKind: AgentKindUsage[];
    }

    /** 全局 unpriced 档位项（tokenKind 1=输入…5=推理 + tokenKindName 随行；tokens 只计无价分量）。 */
    interface UnpricedTierUsage {
      provider: string;
      model: string;
      tokenKind: number;
      tokenKindName: string;
      tokens: number;
    }

    /** unpriced 全局警示（GET /costs/unpriced；空窗/无未配价用量 = 空 items 非错误）。 */
    interface UnpricedUsage {
      from: string;
      to: string;
      items: UnpricedTierUsage[];
    }

    /** 项目成本清单行（GET /costs/projects items；排序服务端定死成本降序、全未配价排后）。 */
    interface ProjectCost {
      /** 计量 subject 原值（TSID 十进制串；已删项目照列——项目名归前端互查，不解释存在性） */
      projectId: string;
      total: TokenUsage;
      /** 按币种分桶（admin#75 已文档化——ISO 4217 码 → 金额直读不折算；空对象＝无用量或全未配价） */
      cost?: Record<string, number>;
      /** 全未配价标注（有用量但无任何已配价分量——true 时成本不完整） */
      allUnpriced: boolean;
    }

    /**
     * 单项目下钻 unpriced 档位项（**无 tokens**——bySubject 口径无 token 计数，档位用量汇总走
     * 全局 unpriced 端点；下钻端点 description 自述）。swagger `UnpricedTier` 同名 schema 与全局
     * 端点嵌套 record 撞名合并成带 tokens 的单形——以下钻端点 description 为准（tokens 不渲染）。
     */
    interface UnpricedTierMark {
      provider: string;
      model: string;
      tokenKind: number;
      tokenKindName: string;
    }

    /** 单项目成本下钻（GET /costs/projects/{projectId}；无用量/查无此号 = 全零 total + 空结构，非 404）。 */
    interface ProjectCostDetail {
      projectId: string;
      from: string;
      to: string;
      total: TokenUsage;
      /** 按币种分桶（admin#75 已文档化——ISO 4217 码 → 金额直读不折算；空对象＝无用量或全未配价） */
      cost?: Record<string, number>;
      unpriced: UnpricedTierMark[];
      byModel: ModelUsage[];
      byAgentKind: AgentKindUsage[];
    }

    /** 成本域时间窗（from/to 必填——BFF 不设默认窗口，缺参 400；半开 [from,to)）。 */
    interface CostWindowParams {
      /** ISO-8601 Instant UTC 带 Z（如 2026-09-01T00:00:00Z） */
      from: string;
      to: string;
    }

    /** GET /costs/projects 查询参数（时间窗 + 分页 1-based 直传）。 */
    interface CostProjectSearchParams extends CostWindowParams {
      page: number;
      size: number;
    }

    /* ---- 单价表域（#62）---- */

    /** token 档位（单价表）：1=输入 2=输出 3=缓存读 4=缓存写 5=推理（tokenKindName 中文名随行直读）。 */
    type PriceTokenKind = 1 | 2 | 3 | 4 | 5;

    /**
     * 单价行（清单行 = 改价回执 closed/opened 行 = 停用回执，同 schema `AiplatformUnitPriceEntryResponse`）。
     * 清单含历史行全量（价史全貌），排序服务端定死＝生效起点倒序（新段在前，同起点 id 倒序稳定）；
     * `effectiveTo` null 即当前行（改价/停用目标位，其余为已关历史行）。operator 两列为该行**最近
     * 管理动作**留痕（开行或停用；种子行 null）。
     */
    interface UnitPriceEntry {
      /** TSID → string */
      id: string;
      provider: string;
      model: string;
      tokenKind: PriceTokenKind;
      tokenKindName: string;
      /** BigDecimal 明文小数 → JSON string（请求侧 number——REQ-20 #75）；按 token 计价，非每千 token */
      unitPrice: string;
      /** ISO 4217 */
      currency: string;
      /** ISO-8601 Instant UTC 带 Z */
      effectiveFrom: string;
      /** null = 当前行 */
      effectiveTo: string | null;
      operatorId: string | null;
      operatorName: string | null;
    }

    /** GET /price-entries 查询参数。provider/model 为匹配键成分＝精确等值过滤、均可缺省（缺省=全量行）。 */
    interface PriceEntrySearchParams {
      page: number;
      size: number;
      provider?: string;
      model?: string;
    }

    type PriceEntryFilter = Omit<PriceEntrySearchParams, 'page' | 'size'>;

    /**
     * POST /price-entries/{id}/reprice body——unitPrice JSON **number**（BigDecimal 语义，区别于响应
     * string）；currency ISO 4217（非 ISO 400 METER_010）；effectiveFrom ISO-8601 Instant UTC 带 Z
     * （未来时点=预发布，重叠校验 provider 裁决 409 METER_008）。
     */
    interface RepriceCommand {
      unitPrice: number;
      currency: string;
      effectiveFrom: string;
    }

    /** 原子改价回执（同事务两步=库内事实）：closed 保留原开行操作者、effectiveTo=新起点；opened 敞口生效。 */
    interface RepriceReceipt {
      closed: UnitPriceEntry;
      opened: UnitPriceEntry;
    }

    /* ---- 素材域（#63）---- */

    /** 素材状态（两态）：1=启用 2=停用——停用可逆（enable 恢复命中），两写重复均幂等。 */
    type MaterialStatus = 1 | 2;

    /** 素材治理三写动作（disable/enable 可逆开关 + delete 不可逆移除；权限码 Record 的键约束）。 */
    type MaterialAction = 'disable' | 'enable' | 'delete';

    /**
     * 素材列表行（GET /materials items 元素 = 三写回执，同 schema `AiplatformMaterialSummaryResponse`）。
     * 排序服务端定死沉淀时间倒序（新沉淀在前）；operator 两列＝最近管理动作留痕（未治理过为 null）。
     */
    interface MaterialSummary {
      /** TSID → string */
      id: string;
      /** 素材类别裸值（v1 恒 "PRD"——无 *Name 字段，专有名词直显） */
      kind: string;
      projectId: string;
      projectName: string;
      title: string;
      status: MaterialStatus;
      statusName: string;
      /** 首沉淀时间（重沉淀与治理动作不改） */
      sunkAt: string;
      operatorId: string | null;
      operatorName: string | null;
    }

    /** 素材详情（GET /materials/{id}；清单行超集——content＝块按 seq 空行拼接的素材全文）。 */
    interface MaterialDetail extends MaterialSummary {
      content: string;
    }

    /** GET /materials 查询参数。分页 1-based 直传；status 单选单值（缺省＝全部）。 */
    interface MaterialSearchParams {
      page: number;
      size: number;
      /** 状态单选（1=启用 2=停用；缺省＝全部） */
      status?: MaterialStatus;
      /** 沉淀时间区间（首沉淀，闭区间含两端）——ISO-8601 Instant UTC 带 Z */
      sunkFrom?: string;
      sunkTo?: string;
      /** 来源项目 id 精确（登记面字符串，查无＝空清单 200） */
      projectId?: string;
    }

    type MaterialFilter = Omit<MaterialSearchParams, 'page' | 'size'>;

    /* ---- 技能域（#67 技能管理——技能线 8 端点）---- */

    /** 技能来源（两态）：1=内置 2=安装（sourceName 中文名随行直读）。 */
    type SkillSource = 1 | 2;

    /** 技能状态（两态）：1=启用 2=停用——与素材域同构；内置恒 1（启停对内置行的裁决归 provider 透传）。 */
    type SkillStatus = 1 | 2;

    /** 技能管理五写动作（install 单独门控触发按钮；disable⇄enable 互斥；uninstall/update 仅安装行）。 */
    type SkillAction = 'install' | 'disable' | 'enable' | 'uninstall' | 'update';

    /**
     * 技能列表行（GET /skills 全量元素 = install 回执条目 = update 回执终态行集，同 schema
     * `AiplatformSkillSummaryResponse`）。清单无分页（有界目录）、服务端排序内置在前。
     */
    interface SkillSummary {
      /**
       * 技能柄（opaque 串两形制，详情寻址键）：内置＝`builtin:<技能名>` / 安装＝TSID 十进制串
       * ——一律 string 透传，禁止数值化。
       */
      id: string;
      name: string;
      description: string;
      source: SkillSource;
      sourceName: string;
      /** 来源包标识（安装仓库规范化地址）；内置 null */
      sourcePackage: string | null;
      /** 版本标识（装时/上次更新 commit）；内置 null */
      version: string | null;
      status: SkillStatus;
      statusName: string;
      operatorId: string | null;
      operatorName: string | null;
      /**
       * 远端有新版标记（来源包级）：true=远端 HEAD≠装时版本；null=未检查过（内置恒 null 不适用）
       * ——展示性标记，**不门控更新动作**（provider 不保证检查过，更新永远显式点）。
       */
      updateAvailable: boolean | null;
    }

    /** 技能详情（GET /skills/{id}；清单行超集——frontmatter 解析态 + 正文全文＝安装审核面）。 */
    interface SkillDetail extends SkillSummary {
      /** SKILL.md frontmatter 全量（自由 map——审核面所见即运行时注入面，键值原样直出） */
      frontmatter: Record<string, unknown>;
      /** SKILL.md 正文（frontmatter 剥离后全文） */
      content: string;
    }

    /** POST /skills/install body——安装命令无 tag/ref 字段，版本恒＝装时 HEAD commit。 */
    interface InstallSkillCommand {
      /** 技能仓库 git 地址（https/ssh/本地路径——clone 走宿主 git 凭据） */
      repoUrl: string;
      /** 排除目录段名单（可缺省）：仓库相对路径任一段命中即不入库（段名精确匹配） */
      excludeDirs?: string[];
    }

    /** POST /skills/update body——sourcePackage 取技能清单行原值回传。 */
    interface UpdateSkillCommand {
      sourcePackage: string;
    }

    /**
     * 显式更新回执（POST /skills/update）：from==to＝远端未前进（幂等，未落痕未写行）；
     * removedSkillNames＝本次移除的技能名（有指派在身的移除会令整体 409 SKL_013，不至此）；
     * skills＝更新后该来源包全部条目（同名行原地翻新保留 id/状态/指派）。
     */
    interface SkillUpdateReceipt {
      sourcePackage: string;
      fromVersion: string;
      toVersion: string;
      removedSkillNames: string[];
      operatorId: string;
      operatorName: string;
      skills: SkillSummary[];
    }

    /** 更新留痕行（GET /skills/update-traces?sourcePackage=；倒序 append-only、卸载不删痕）。 */
    interface SkillUpdateTrace {
      sourcePackage: string;
      fromVersion: string;
      toVersion: string;
      operatorId: string;
      operatorName: string;
      operatedAt: string;
    }

    /**
     * 账号档案（GET /accounts/{externalId}；有码无页——订单/项目详情抽屉嵌件按 externalId 查，
     * 认交易对手）。externalId＝OIDC sub＝identity 账户 Id；未命中 404 IDN_004（业务码 6004）。
     */
    interface AccountProfile {
      /** aiplatform 侧账号 TSID → 十进制 string */
      id: string;
      externalId: string;
      displayName: string;
      createdAt: string;
    }
  }
}
