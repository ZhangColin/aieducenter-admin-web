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
  }
}
