declare namespace Api {
  /**
   * namespace Payment
   *
   * backend api module: 支付管理（admin 后端 `/api/admin/payment/**`，BFF 透传 payment 能力域）。
   * 独立限界上下文（后端 `com.aieducenter.admin.payment` 子包），体量最大，不并入 SystemManage。
   *
   * 分页约定同 SystemManage：请求 `page` **0-based**、响应 `PageResponse{ items, total, page(1-based), size }`。
   *
   * ⚠️ payment 状态/方式等枚举为 **Java enum 名字符串**（如 `'PENDING'` / `'WECHAT'`），
   * admin BFF 原值透传（不改成整数 code）——前端按枚举名映射 i18n 文案。这与 SystemManage 的整数枚举不同。
   *
   * ⚠️ 金额（amount / refundAmount / 各金额区间）单位 = **整数分**（payment 域 `Long`，BFF 透传）。
   * 前端展示经 `formatMoney` 除以 100；金额筛选 `amountMin/Max` 同样以分提交（UI 元换算）。
   * （spec「假设整数分、接真核对」——payment 服务侧 #9–#18 联调时核对。）
   */
  namespace Payment {
    // ---- 枚举字面量（payment 域 Java enum 名，BFF 原值透传）----

    /** 支付订单状态（payment PaymentStatus） */
    type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'EXPIRED';

    /** 支付方式（payment PayMode） */
    type PayMode = 'WECHAT' | 'ALIPAY' | 'UNIONPAY';

    /** 接入类型（payment AccessType） */
    type AccessType = 'H5' | 'APP' | 'WECHAT_OA' | 'ALIPAY_LIFE' | 'MINI_PROGRAM';

    /** 支付通道（payment PaymentChannel） */
    type PaymentChannel = 'ICBC';

    /** 退款订单状态（payment RefundStatus） */
    type RefundStatus = 'PENDING' | 'REJECTED' | 'APPROVED' | 'REFUNDING' | 'SUCCESS' | 'FAILED';

    /** 退款审核类型（payment AuditType）：MANUAL=人工审核 / AUTO=免审 */
    type AuditType = 'AUTO' | 'MANUAL';

    /** 通道交互日志类型（payment PaymentLog.logType；String，非闭合 Java enum，但取值稳定） */
    type LogType =
      | 'PAYMENT_REQUEST'
      | 'PAYMENT_QUERY'
      | 'PAYMENT_CANCEL'
      | 'REFUND_REQUEST'
      | 'REFUND_QUERY'
      | 'PAYMENT_CALLBACK';

    /** 订单操作类型（payment OperationType） */
    type OperationType = 'AUDIT_APPROVE' | 'AUDIT_REJECT' | 'NOTIFY_RESEND';

    /** 订单操作记录目标类型（payment OperationLogTargetType） */
    type OperationTargetType = 'PAYMENT' | 'REFUND';

    // ---- 支付订单（列表 / 筛选）----

    /**
     * 后端 PaymentOrderSummaryResponse（GET /payments 列表项）。
     * 各字段为 payment 原值透传；`amount` 为整数分；各类 `*No` 为字符串（防 Long 精度丢失）。
     */
    interface PaymentOrderSummary {
      paymentOrderNo: string;
      businessOrderNo: string;
      businessSystemName: string | null;
      /** payment PaymentStatus 枚举名 */
      status: PaymentStatus;
      /** 整数分 */
      amount: number;
      /** payment PayMode 枚举名 */
      payMode: PayMode | null;
      /** payment AccessType 枚举名 */
      accessType: AccessType | null;
      /** payment PaymentChannel 枚举名 */
      paymentChannel: PaymentChannel | null;
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
      /** 整数分（BigDecimal → number） */
      amount: number;
      payMode: PayMode | null;
      accessType: AccessType | null;
      paymentChannel: PaymentChannel | null;
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
      /** payment RefundStatus 枚举名 */
      status: RefundStatus;
      /** 整数分（BigDecimal → number） */
      refundAmount: number;
      /** payment AuditType 枚举名（AUTO 免审 / MANUAL 人工）；未审核可空 */
      auditType: AuditType | null;
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
      /** 目标类型枚举名 */
      targetType: OperationTargetType | null;
      /** 目标单号（支付订单号 / 退款订单号） */
      targetNo: string | null;
      /** 操作类型枚举名 */
      operation: OperationType | null;
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
      targetNo: string | null;
      operation: OperationType | null;
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
  }
}
