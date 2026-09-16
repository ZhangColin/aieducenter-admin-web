/**
 * AI 平台（aiplatform，#56/#57）——类型契约。
 *
 * 消费 admin BFF `/api/admin/aiplatform/**`（admin#62 定稿、#63–#73 落地；契约正本 =
 * admin :8081 `/v3/api-docs`，逐字镜像 aiplatform provider `/api/backoffice/**`）。
 * 契约事实（api-docs 实测，2026-09-16）：
 * - `id`/`projectId` 为 Long/TSID → JSON **字符串**；`amount` 为 Long（分）→ JSON **string**（同 payment，框架全局序列化）。
 * - 枚举带 `statusName` 中文名（ADR-0009 直读，不做端侧 code→中文映射）；`status` 本体为 Integer code。
 * - 订单状态五态（controller 文档 + provider OrderStatus 印证）：1=待报价 2=已报价(=待支付) 3=已支付 4=已归档 5=已取消。
 *   未支付态 = 1|2（报价/取消守卫）；重试归档 = 3（已支付未归档卡单）。
 * - 价目史 `priceEntries` append-only 全量、新→旧，每条带操作者（存量行操作者为 null）。
 * - 分页全链 1-based（ADR-0012），请求 `page` 直传零 ±1。
 * - `status` 多选筛选项：逗号分隔单值（`status=1,5`，BFF 拼串透传 provider 签名协议）。
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
  }
}
