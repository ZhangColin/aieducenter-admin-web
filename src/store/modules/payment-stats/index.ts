/**
 * usePaymentStatsStore —— 支付统计仪表盘 store（ADR-0002 seam）。
 *
 * 仪表盘 widget **经此 store 消费** admin-bff stats 端点，**不直连**。
 * 当前 store 只是透传 4 个 tier-1 端点，但这层是为「跨服务聚合」留的 seam——日后要组合
 * payment/钱包/Token 多源数据时，只改 store、widget 不动（见 ADR-0002 防回退说明）。
 *
 * 每个 tier-1 widget 一组 { data, loading, error } + 单独 load；`init()` 并发拉 4 个（allSettled，
 * 单个失败不阻断其余——3 个时间窗端点现阶段 400，status-distribution 仍能出数）。
 *
 * 错误处理：@sa/axios flat request 返回 { data, error }，HTTP 非 2xx 走 onError 拦截器（已 toast），
 * store 只记 `error: true` 供 widget 展示降级态——不为不可达态建专属处理（memory: UI 门控/通用兜底）。
 */
import { ref } from 'vue';
import type { Ref } from 'vue';
import { defineStore } from 'pinia';
import { SetupStoreId } from '@/enum';
import {
  fetchGetGatewayHealth,
  fetchGetOperationsAudit,
  fetchGetOrderStatusDistribution,
  fetchGetPaymentOverview
} from '@/service/api';

export const usePaymentStatsStore = defineStore(SetupStoreId.PaymentStats, () => {
  // ---- tier-1：overview（折线趋势）----
  const overview: Ref<Api.Payment.PaymentOverview | null> = ref(null);
  const overviewLoading = ref(false);
  const overviewError = ref(false);

  // ---- tier-1：status-distribution（饼）----
  const statusDistribution: Ref<Api.Payment.OrderStatusDistribution | null> = ref(null);
  const statusDistributionLoading = ref(false);
  const statusDistributionError = ref(false);

  // ---- tier-1：gateway-health（表 + 成功率条）----
  const gatewayHealth: Ref<Api.Payment.GatewayHealth | null> = ref(null);
  const gatewayHealthLoading = ref(false);
  const gatewayHealthError = ref(false);

  // ---- tier-1：operations-audit（表）----
  const operationsAudit: Ref<Api.Payment.OperationsAudit | null> = ref(null);
  const operationsAuditLoading = ref(false);
  const operationsAuditError = ref(false);

  /** 通用拉取：flat request 返回 { data, error }，记 data + error 标志（error 已由 onError toast） */
  async function loadResource<T>(
    fetcher: () => Promise<{ data: T | null; error: unknown }>,
    data: Ref<T | null>,
    loading: Ref<boolean>,
    error: Ref<boolean>
  ) {
    loading.value = true;
    error.value = false;
    const res = await fetcher();
    data.value = res.data;
    error.value = Boolean(res.error);
    loading.value = false;
  }

  async function loadOverview() {
    await loadResource(fetchGetPaymentOverview, overview, overviewLoading, overviewError);
  }

  async function loadStatusDistribution() {
    await loadResource(
      fetchGetOrderStatusDistribution,
      statusDistribution,
      statusDistributionLoading,
      statusDistributionError
    );
  }

  async function loadGatewayHealth() {
    await loadResource(fetchGetGatewayHealth, gatewayHealth, gatewayHealthLoading, gatewayHealthError);
  }

  async function loadOperationsAudit() {
    await loadResource(fetchGetOperationsAudit, operationsAudit, operationsAuditLoading, operationsAuditError);
  }

  /** 并发拉 4 个 tier-1 端点；allSettled——单个失败不阻断其余 */
  async function init() {
    await Promise.allSettled([loadOverview(), loadStatusDistribution(), loadGatewayHealth(), loadOperationsAudit()]);
  }

  return {
    overview,
    overviewLoading,
    overviewError,
    loadOverview,
    statusDistribution,
    statusDistributionLoading,
    statusDistributionError,
    loadStatusDistribution,
    gatewayHealth,
    gatewayHealthLoading,
    gatewayHealthError,
    loadGatewayHealth,
    operationsAudit,
    operationsAuditLoading,
    operationsAuditError,
    loadOperationsAudit,
    init
  };
});
