declare namespace Api {
  /**
   * namespace Payment
   *
   * backend api module: 支付管理（admin 后端 `/api/admin/payment/**`，BFF 透传 payment 能力域）。
   * 独立限界上下文（后端 `com.aieducenter.admin.payment` 子包），体量最大，不并入 SystemManage。
   *
   * 分页约定同 SystemManage：请求 `page` **0-based**、响应 `PageResponse{ items, total, page(1-based), size }`。
   *
   * ⚠️ payment 枚举线上序列化：BaseEnum（PaymentStatus / PayMode / …）为 **Integer code 的字符串**
   * （如 `status: "5"`），admin BFF 原值透传——前端按 code 字面量建模。展示统一走后端 `*Name`
   * （`statusName` / `payModeName` …，平台统一枚举范式：后端给中文 label、前端只显示）；
   * code 仅用于筛选选项 value 与标签配色。纯 String token（LogType / result）按 token 字面量建模。
   * （admin BFF 透传 `*Name` 尚未落地，见 docs/backend-requirements/REQ-16；落地前展示回退 code。）
   *
   * ⚠️ 金额（amount / refundAmount / 各金额区间）单位 = **整数分**（payment 域 `Long`，BFF 透传）。
   * 前端展示经 `formatMoney` 除以 100；金额筛选 `amountMin/Max` 同样以分提交（UI 元换算）。
   * （spec「假设整数分、接真核对」——payment 服务侧 #9–#18 联调时核对。）
   */
  namespace Payment {
    // ---- 枚举字面量 ----
    //
    // payment 域枚举线上序列化分两类（契约源：payment domain enums + 实测 curl）：
    //  1. BaseEnum（Integer code）：PaymentStatus / PayMode / AccessType / PaymentChannel /
    //     RefundStatus / AuditType / OperationType / OperationLogTargetType。payment 经全局
    //     Jackson 序列化为 **Integer code 的字符串**（如 `status: "5"`），admin BFF 原值透传——
    //     故前端按 code（字符串字面量）建模。
    //     展示统一走后端 `*Name`（见各 summary 的 `statusName` / `payModeName` …，平台统一枚举范式：
    //     后端给中文 label、前端只显示）；code 仅用于筛选选项 value + 标签配色。
    //     ⚠️ 现阶段 admin BFF 尚未透传 `*Name`（见 docs/backend-requirements/REQ-16），前端展示
    //     暂回退到 code，BFF 落地 *Name 后自动显示中文——零前端改动。
    //  2. 纯 String token（非 enum）：LogType（PaymentLog.logType 列）、OperationLog.result。
    //     取值稳定但非闭合，线上即 token 本身（如 `"PAYMENT_REQUEST"`），按 token 字面量建模。

    /** 支付订单状态 code（payment PaymentStatus）：1=待支付 2=已支付 3=支付失败 4=已取消 5=已过期 */
    type PaymentStatus = '1' | '2' | '3' | '4' | '5';

    /** 支付方式 code（payment PayMode）：9=微信 10=支付宝 13=云闪付 */
    type PayMode = '9' | '10' | '13';

    /** 接入类型 code（payment AccessType）：5=APP 7=微信公众号 8=支付宝生活号 9=小程序 */
    type AccessType = '5' | '7' | '8' | '9';

    /** 支付通道 code（payment PaymentChannel）：1=工商银行 */
    type PaymentChannel = '1';

    /** 退款订单状态 code（payment RefundStatus）：1=待审核 2=已拒绝 3=已批准 4=退款中 5=退款成功 6=退款失败 */
    type RefundStatus = '1' | '2' | '3' | '4' | '5' | '6';

    /** 退款审核类型 code（payment AuditType）：1=免审 2=人工审核 */
    type AuditType = '1' | '2';

    /** 通道交互日志类型（payment PaymentLog.logType；纯 String token，非闭合） */
    type LogType =
      | 'PAYMENT_REQUEST'
      | 'PAYMENT_QUERY'
      | 'PAYMENT_CANCEL'
      | 'REFUND_REQUEST'
      | 'REFUND_QUERY'
      | 'PAYMENT_CALLBACK';

    /** 订单操作类型 code（payment OperationType）：1=审核通过 2=审核拒绝 3=通知重发 */
    type OperationType = '1' | '2' | '3';

    /** 订单操作记录目标类型 code（payment OperationLogTargetType）：1=支付订单 2=退款订单 */
    type OperationTargetType = '1' | '2';

    // ---- 支付订单（列表 / 筛选）----

    /**
     * 后端 PaymentOrderSummaryResponse（GET /payments 列表项）。
     * 各字段为 payment 原值透传；`amount` 为整数分；各类 `*No` 为字符串（防 Long 精度丢失）。
     */
    interface PaymentOrderSummary {
      paymentOrderNo: string;
      businessOrderNo: string;
      businessSystemName: string | null;
      /** payment PaymentStatus 枚举 code（字符串） */
      status: PaymentStatus;
      /** 状态中文名（后端序列化，展示用）；BFF 透传——见 REQ-16，未落地前为 null */
      statusName: string | null;
      /** 整数分 */
      amount: number;
      /** payment PayMode 枚举 code */
      payMode: PayMode | null;
      /** 支付方式中文名（后端序列化，展示用）；REQ-16 未落地前为 null */
      payModeName: string | null;
      /** payment AccessType 枚举 code */
      accessType: AccessType | null;
      /** 接入类型中文名（后端序列化，展示用）；REQ-16 未落地前为 null */
      accessTypeName: string | null;
      /** payment PaymentChannel 枚举 code */
      paymentChannel: PaymentChannel | null;
      /** 支付通道中文名（后端序列化，展示用）；REQ-16 未落地前为 null */
      paymentChannelName: string | null;
      /** 支付时间，可空（未支付）；ISO 字符串 */
      paidAt: string | null;
      /** 创建时间，ISO 字符串 */
      createdAt: string;
    }

    /**
     * GET /payments 搜索参数（后端 PaymentOrderQuery + Spring Pageable）。
     * 请求 `page` 为 **0-based**（响应 PageResponse.page 才是 1-based）。
     *
     * - `statuses` 多选（Spring 绑定 record List<String>，axios qs 默认 indices 格式可绑）；
     * - 金额区间（`amountMin/Max`）与时间区间（`createdAtFrom/To`、`paidAtFrom/To`）均为可空，
     *   空值由调用方剔除；金额单位分、时间为 ISO 字符串（`YYYY-MM-DDTHH:mm:ss`）。
     */
    interface PaymentOrderSearchParams {
      paymentOrderNo?: string | null;
      businessOrderNo?: string | null;
      businessSystemName?: string | null;
      /** 状态多选；null/空 = 不过滤 */
      statuses?: PaymentStatus[] | null;
      payMode?: PayMode | null;
      accessType?: AccessType | null;
      paymentChannel?: PaymentChannel | null;
      /** 金额下限（整数分，含） */
      amountMin?: number | null;
      /** 金额上限（整数分，含） */
      amountMax?: number | null;
      /** 创建时间起（ISO，含） */
      createdAtFrom?: string | null;
      /** 创建时间止（ISO，含） */
      createdAtTo?: string | null;
      /** 支付时间起（ISO，含） */
      paidAtFrom?: string | null;
      /** 支付时间止（ISO，含） */
      paidAtTo?: string | null;
      /** 0-based */
      page: number;
      size: number;
    }

    /** 支付订单筛选载荷（搜索参数去分页——分页由列表页管）。搜索组件 emit、列表页接收。 */
    type PaymentOrderFilter = Omit<PaymentOrderSearchParams, 'page' | 'size'>;

    // ---- 支付订单详情（GET /payments/{no}）----

    /**
     * 后端 PaymentOrderDetailResponse（GET /payments/{paymentOrderNo}）。
     *
     * 与列表项 {@link PaymentOrderSummary} 字段面当前一致，但详情是完整聚合投影、独立演进
     * （payment 契约定型后详情可新增字段）——故单立类型、不与列表项共用。
     * `amount` 为 BigDecimal → JSON number（整数分）；其余约定同 PaymentOrderSummary。
     */
    interface PaymentOrderDetail {
      paymentOrderNo: string;
      businessOrderNo: string;
      businessSystemName: string | null;
      status: PaymentStatus;
      /** 状态中文名（后端序列化，展示用）；REQ-16 未落地前为 null */
      statusName: string | null;
      /** 整数分（BigDecimal → number） */
      amount: number;
      payMode: PayMode | null;
      /** 支付方式中文名（后端序列化，展示用）；REQ-16 未落地前为 null */
      payModeName: string | null;
      accessType: AccessType | null;
      /** 接入类型中文名（后端序列化，展示用）；REQ-16 未落地前为 null */
      accessTypeName: string | null;
      paymentChannel: PaymentChannel | null;
      /** 支付通道中文名（后端序列化，展示用）；REQ-16 未落地前为 null */
      paymentChannelName: string | null;
      /** 支付时间，可空（未支付）；ISO 字符串 */
      paidAt: string | null;
      /** 创建时间，ISO 字符串 */
      createdAt: string;
    }

    // ---- 退款订单（列表 / 筛选）----

    /**
     * 后端 RefundOrderSummaryResponse（GET /refunds 列表项）。
     * 各字段为 payment 原值透传；`refundAmount` 为整数分；各类 `*No` 为字符串（防 Long 精度丢失）。
     *
     * `auditorId` 为 Long → 经全局 Jackson `Long→string` 序列化为 JSON **字符串**，按 string 处理防精度丢失。
     */
    interface RefundOrderSummary {
      refundOrderNo: string;
      paymentOrderNo: string;
      businessOrderNo: string;
      businessSystemName: string | null;
      /** payment RefundStatus 枚举 code（字符串） */
      status: RefundStatus;
      /** 状态中文名（后端序列化，展示用）；REQ-16 未落地前为 null */
      statusName: string | null;
      /** 整数分（BigDecimal → number） */
      refundAmount: number;
      /** payment AuditType 枚举 code（1=免审 / 2=人工）；未审核可空 */
      auditType: AuditType | null;
      /** 审核类型中文名（后端序列化，展示用）；REQ-16 未落地前为 null */
      auditTypeName: string | null;
      /** 审核人 ID，Long→string */
      auditorId: string | null;
      /** 审核人姓名，可空 */
      auditorName: string | null;
      /** 审核时间，可空（未审核）；ISO 字符串 */
      auditedAt: string | null;
      /** 创建时间，ISO 字符串 */
      createdAt: string;
    }

    /**
     * GET /refunds 搜索参数（后端 RefundOrderQuery + Spring Pageable）。
     * 请求 `page` 为 **0-based**（响应 PageResponse.page 才是 1-based）。
     *
     * - `statuses` 多选（Spring 绑定 record List<String>，axios qs 默认 indices 格式可绑）；
     * - 退款金额区间 `refundAmountMin/Max`（整数分）与创建时间区间 `createdAtFrom/To`（ISO 串）均可空，
     *   空值由调用方剔除；
     * - `auditorId` 为 Long，前端按 **string** 处理防精度丢失，提交字符串由后端绑 Long。
     */
    interface RefundOrderSearchParams {
      refundOrderNo?: string | null;
      paymentOrderNo?: string | null;
      businessOrderNo?: string | null;
      businessSystemName?: string | null;
      /** 状态多选；null/空 = 不过滤 */
      statuses?: RefundStatus[] | null;
      auditType?: AuditType | null;
      /** 审核人 ID（Long）—— string 防精度丢失，后端绑 Long */
      auditorId?: string | null;
      /** 退款金额下限（整数分，含） */
      refundAmountMin?: number | null;
      /** 退款金额上限（整数分，含） */
      refundAmountMax?: number | null;
      /** 创建时间起（ISO，含） */
      createdAtFrom?: string | null;
      /** 创建时间止（ISO，含） */
      createdAtTo?: string | null;
      /** 0-based */
      page: number;
      size: number;
    }

    /** 退款订单筛选载荷（搜索参数去分页——分页由列表页管）。搜索组件 emit、列表页接收。 */
    type RefundOrderFilter = Omit<RefundOrderSearchParams, 'page' | 'size'>;

    // ---- 通道交互日志（列表 / 筛选，GET /payment-logs）----

    /**
     * 后端 PaymentLogSummaryResponse（GET /payment-logs 列表项）。
     * payment 全字段为基础类型（无枚举语义），admin 原值透传、不做翻译。
     *
     * - `id` / `executionTime` 为 Long → 经全局 Jackson `Long→string` 序列化为 JSON **字符串**，按 string 处理防精度丢失；
     * - `httpStatus` 为 Integer → number；`success` 为 Boolean（均可空）；
     * - `logType` 取值稳定但非闭合，按 {@link LogType} 映射、未知值原值回退（见列表 renderEnum 范式）。
     */
    interface PaymentLogSummary {
      /** Long→string */
      id: string;
      paymentOrderNo: string | null;
      refundOrderNo: string | null;
      /** 日志类型（稳定 token，非闭合；前端按已知值映射 i18n、未知值原值展示） */
      logType: LogType | null;
      bankCode: string | null;
      bankInterface: string | null;
      /** Integer→number */
      httpStatus: number | null;
      returnCode: string | null;
      returnMsg: string | null;
      /** 执行耗时（毫秒），Long→string */
      executionTime: string | null;
      success: boolean | null;
      errorMessage: string | null;
      /** 创建时间，ISO 字符串 */
      createdAt: string;
    }

    /**
     * GET /payment-logs 搜索参数（后端 PaymentLogQuery + Spring Pageable）。
     * 请求 `page` 为 **0-based**（响应 PageResponse.page 才是 1-based）。
     *
     * - `logTypes` 多选（Spring 绑定 record List<String>，axios qs 默认 indices 格式可绑）；
     * - `success` 为 Boolean 单选；时间区间 `createdAtFrom/To`（ISO 串）均可空，空值由调用方剔除。
     */
    interface PaymentLogSearchParams {
      paymentOrderNo?: string | null;
      refundOrderNo?: string | null;
      /** 日志类型多选；null/空 = 不过滤 */
      logTypes?: LogType[] | null;
      bankInterface?: string | null;
      /** 是否成功；null = 不过滤 */
      success?: boolean | null;
      returnCode?: string | null;
      /** 创建时间起（ISO，含） */
      createdAtFrom?: string | null;
      /** 创建时间止（ISO，含） */
      createdAtTo?: string | null;
      /** 0-based */
      page: number;
      size: number;
    }

    /** 通道交互日志筛选载荷（搜索参数去分页——分页由列表页管）。搜索组件 emit、列表页接收。 */
    type PaymentLogFilter = Omit<PaymentLogSearchParams, 'page' | 'size'>;

    // ---- 订单操作记录（列表 / 筛选，GET /operation-logs）----

    /**
     * 后端 OperationLogSummaryResponse（GET /operation-logs 列表项）。
     * 记录行为者对订单的操作（审核通过/拒绝、通知重发等），admin 原值透传、不做翻译。
     *
     * - `id` / `operatorId` 为 Long → JSON **字符串**，按 string 处理防精度丢失；
     * - `result` 为自由稳定 token（非闭合集合：SUCCESS / DELIVERY_FAILED / SKIPPED …），原值展示；
     * - `targetType` / `operation` 取值稳定，按已知枚举映射 i18n、未知值原值回退。
     */
    interface OperationLogSummary {
      /** Long→string */
      id: string;
      /** 目标类型枚举 code */
      targetType: OperationTargetType | null;
      /** 目标类型中文名（后端序列化，展示用）；REQ-16 未落地前为 null */
      targetTypeName: string | null;
      /** 目标单号（支付订单号 / 退款订单号） */
      targetNo: string | null;
      /** 操作类型枚举 code */
      operation: OperationType | null;
      /** 操作类型中文名（后端序列化，展示用）；REQ-16 未落地前为 null */
      operationName: string | null;
      /** 操作者 ID，Long→string */
      operatorId: string | null;
      operatorName: string | null;
      /** 来源系统（调用方 appName） */
      operatorSystem: string | null;
      /** 操作结果（自由稳定 token、非闭合枚举），原值展示 */
      result: string | null;
      remark: string | null;
      /** 创建时间，ISO 字符串 */
      createdAt: string;
    }

    /**
     * GET /operation-logs 搜索参数（后端 OperationLogQuery + Spring Pageable）。
     * 请求 `page` 为 **0-based**（响应 PageResponse.page 才是 1-based）。
     *
     * ⚠️ `operation` 为**单选**：payment 的 OperationLogQuery.operation 是单个 OperationType（EQUAL），
     * issue 文案的「operation 多选」以 payment 实现契约为准收敛为单值——向单值下游转发多值会静默丢过滤条件。
     *
     * - `operatorId` 为 Long，前端按 **string** 处理防精度丢失，提交字符串由后端绑 Long；
     * - `result` 为自由 token，走文本输入；时间区间 `createdAtFrom/To`（ISO 串）均可空，空值由调用方剔除。
     */
    interface OperationLogSearchParams {
      targetType?: OperationTargetType | null;
      targetNo?: string | null;
      /** 操作类型——单选（payment 单值 EQUAL 契约） */
      operation?: OperationType | null;
      /** 操作者 ID（Long）—— string 防精度丢失，后端绑 Long */
      operatorId?: string | null;
      operatorSystem?: string | null;
      result?: string | null;
      /** 创建时间起（ISO，含） */
      createdAtFrom?: string | null;
      /** 创建时间止（ISO，含） */
      createdAtTo?: string | null;
      /** 0-based */
      page: number;
      size: number;
    }

    /** 订单操作记录筛选载荷（搜索参数去分页——分页由列表页管）。搜索组件 emit、列表页接收。 */
    type OperationLogFilter = Omit<OperationLogSearchParams, 'page' | 'size'>;

    // ---- 订单生命周期（GET /orders/{no}/lifecycle）----

    /**
     * 生命周期事件来源（payment 已在 BFF 上游合并 PaymentLog + OperationLog 按 createdAt 排序返回）。
     * - `PAYMENT_LOG`：机机通道事件（与银行/通道网关的交互留痕），网关字段组生效；
     * - `OPERATION_LOG`：人/系统行为者操作事件（审核/通知重发等），操作字段组生效。
     * 非生效组字段为 null（union 平表投影）。
     */
    type LifecycleSource = 'PAYMENT_LOG' | 'OPERATION_LOG';

    /**
     * 后端 OrderLifecycleResponse.LifecycleEvent——payment 合并后的单条时间线条目。
     *
     * 平表投影：source=PAYMENT_LOG 时网关字段组（logType…success）生效、操作字段组为 null；
     * source=OPERATION_LOG 时反之。
     *
     * ⚠️ Long 字段（executionTime / operatorId）经 cartisan-web 全局 Jackson `Long→string`
     * 序列化为 JSON **字符串**（见 JacksonConfiguration），故按 string 处理防精度丢失；
     * 展示时 `Number()` 兜底。`success` 为 Boolean（可空）。
     */
    interface LifecycleEvent {
      source: LifecycleSource;
      /** 发生时间（合并排序键，payment 已排好序）；ISO 字符串 */
      createdAt: string;

      // ===== PaymentLog 字段（source=PAYMENT_LOG 时生效，否则 null）=====
      logType: LogType | null;
      paymentOrderNo: string | null;
      refundOrderNo: string | null;
      bankInterface: string | null;
      returnCode: string | null;
      returnMsg: string | null;
      /** 执行耗时（毫秒），Long→string */
      executionTime: string | null;
      success: boolean | null;

      // ===== OperationLog 字段（source=OPERATION_LOG 时生效，否则 null）=====
      targetType: OperationTargetType | null;
      /** 目标类型中文名（后端序列化，展示用）；REQ-16 未落地前为 null */
      targetTypeName: string | null;
      targetNo: string | null;
      operation: OperationType | null;
      /** 操作类型中文名（后端序列化，展示用）；REQ-16 未落地前为 null */
      operationName: string | null;
      /** 操作人 ID，Long→string */
      operatorId: string | null;
      operatorName: string | null;
      operatorSystem: string | null;
      /** 操作结果（自由稳定 token、非闭合枚举），原值展示 */
      result: string | null;
      remark: string | null;
    }

    /**
     * 后端 OrderLifecycleResponse——payment 已合并（按 createdAt 排序）的时间线。
     * admin BFF 原值透传、不本地再合并（避免与 payment 双逻辑不一致）。
     */
    interface OrderLifecycle {
      orderNo: string;
      events: LifecycleEvent[];
    }

    // ---- 统计（仪表盘 tier-1，GET /stats/**）----
    //
    // admin BFF 透传 payment 聚合结果。约定同上：Long → JSON **字符串**、BigDecimal → number、
    // LocalDateTime → ISO 串。比率（successRate / approvalRate）为 **小数 0–1 区间**（payment wire 约定，
    // 展示时 ×100）。金额为整数分（`formatMoney` ÷100）。
    //
    // ⚠️ 现阶段 3 个带时间窗的端点（overview / gateway-health / operations-audit）因 admin BFF 未转发
    // payment 必填的 `from`/`to` 返回 400（见 docs/backend-requirements/REQ-17）；status-distribution 正常。
    // 前端按锁定契约建，BFF 修复后自动通数据。

    /** overview 趋势分桶（某时间窗内的支付/退款笔数·金额快照） */
    interface PaymentOverviewTrendBucket {
      /** 时间桶起（LocalDateTime → ISO 串） */
      bucket: string;
      /** 支付笔数（Long→string） */
      paymentCount: string;
      /** 支付金额（整数分） */
      paymentAmount: number;
      /** 退款笔数（Long→string） */
      refundCount: string;
      /** 退款金额（整数分） */
      refundAmount: number;
    }

    /** GET /stats/payments/overview —— 支付/退款笔数·金额·成功率·净额 + 时间分桶趋势 */
    interface PaymentOverview {
      paymentCount: string;
      paymentAmount: number;
      refundCount: string;
      refundAmount: number;
      /** 成功率（小数 0–1） */
      successRate: number;
      /** 净额（整数分，支付金额 − 退款金额） */
      netAmount: number;
      trend: PaymentOverviewTrendBucket[];
    }

    /** 状态分桶（payment/refund 各状态在途笔数·金额） */
    interface OrderStatusBucket {
      /** 状态 code（PaymentStatus / RefundStatus 的 Integer code 字符串） */
      status: string;
      /** 状态中文名（后端序列化，展示用）；REQ-16 未落地前为 null */
      statusName: string | null;
      /** 笔数（Long→string） */
      count: string;
      /** 金额（整数分；paymentStatuses=支付金额，refundStatuses=退款金额） */
      amount: number;
    }

    /** GET /stats/orders/status-distribution —— 支付/退款各状态分布 + 退款待审核积压 */
    interface OrderStatusDistribution {
      paymentStatuses: OrderStatusBucket[];
      refundStatuses: OrderStatusBucket[];
      /** 退款待审核积压笔数（Long→string） */
      refundPendingAuditCount: string;
    }

    /** gateway 返回码分布（单一 returnCode 出现次数） */
    interface GatewayReturnCodeStat {
      returnCode: string;
      /** 出现次数（Long→string） */
      count: string;
    }

    /** 单一银行接口健康度（调用次数·成功率·平均耗时·返回码分布） */
    interface GatewayBankInterfaceStat {
      /** 银行接口名（如 "ICBC_PAY"） */
      bankInterface: string;
      /** 调用次数（Long→string） */
      callCount: string;
      /** 成功次数（Long→string） */
      successCount: string;
      /** 成功率（小数 0–1） */
      successRate: number;
      /** 平均执行耗时（毫秒，Long→string） */
      avgExecutionTime: string;
      returnCodes: GatewayReturnCodeStat[];
    }

    /** GET /stats/gateway/health —— 各银行接口调用统计 + 返回码分布 */
    interface GatewayHealth {
      bankInterfaces: GatewayBankInterfaceStat[];
    }

    /** 单一审核人统计（审核笔数·通过率·平均时长） */
    interface OperationsAuditorStat {
      /** 审核人 ID（Long→string） */
      auditorId: string;
      auditorName: string | null;
      /** 审核笔数（Long→string） */
      auditCount: string;
      /** 通过笔数（Long→string） */
      approvedCount: string;
      /** 通过率（小数 0–1） */
      approvalRate: number;
      /** 平均审核时长（秒，Long→string） */
      avgAuditDurationSeconds: string;
    }

    /** GET /stats/operations/audit —— 审核笔数·通过率·平均时长 + 按审核人聚合 */
    interface OperationsAudit {
      /** 审核总笔数（Long→string） */
      auditCount: string;
      /** 通过率（小数 0–1） */
      approvalRate: number;
      /** 平均审核时长（秒，Long→string） */
      avgAuditDurationSeconds: string;
      auditors: OperationsAuditorStat[];
    }
  }
}
