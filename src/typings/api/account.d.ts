/**
 * 平台账号管理（Account，#50）——类型契约。
 *
 * 消费 admin BFF `/api/admin/accounts/**`（admin#49 定稿、identity #67–#72 上游）。
 * 契约事实（本地后端源码核实，2026-08-14）：
 * - 列表行与管理详情**字段完全同构**（identity `AccountManagementView` 共用）。
 * - `status` 是 Integer code（1=ACTIVE / 0=DISABLED）；`locked` 是原始 boolean——两条独立状态轴。
 * - **无 `*Name` 字段**（identity 不回，展示文案前端按 code 映射）。
 * - `userId` 为 Long/TSID → JSON **字符串**（防精度丢失）。
 * - 响应**无注册时间字段**（注册时间仅作筛选参数）。
 */
declare namespace Api {
  namespace Account {
    /** 封号轴状态（管理员手动停用/恢复）：1=ACTIVE 正常 / 0=DISABLED 已封号。 */
    type AccountStatus = 1 | 0;

    /** 列表行 / 管理详情（同构）。 */
    interface AccountSummary {
      /** Long → string */
      userId: string;
      email: string | null;
      phone: string | null;
      nickname: string | null;
      avatar: string | null;
      /** 封号轴 */
      status: AccountStatus;
      /** 系统锁定轴（登录失败累计等自动触发，独立于封号） */
      locked: boolean;
      /** 是否设过密码（社交/纯验证码账号 false）。Q8 拍板：UI 不渲染，字段保留。 */
      hasPassword: boolean;
    }

    /** GET /accounts/{userId}/management 响应（与列表行同构）。 */
    type AccountManagementDetail = AccountSummary;

    /** GET /accounts 查询参数。分页全链 1-based（REQ-18 已落地）。 */
    interface AccountSearchParams {
      page: number;
      size: number;
      /** INNER_LIKE 模糊 */
      email?: string;
      /** INNER_LIKE 模糊 */
      phone?: string;
      /** TSID 精确匹配（数字字符串，Spring 转 Long） */
      userId?: string;
      status?: AccountStatus;
      /** null=不限；false=只看未锁 */
      locked?: boolean;
      /** 注册时间起（含），LocalDateTime ISO 本地串 */
      createdFrom?: string;
      createdTo?: string;
    }

    type AccountFilter = Omit<AccountSearchParams, 'page' | 'size'>;

    /** POST /accounts/{userId}/disable body——reason 必填 ≤500（@NotBlank @Size(max=500)）。 */
    interface DisableAccountCommand {
      reason: string;
    }
  }
}
