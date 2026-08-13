/**
 * usePaymentStatsStore —— 支付统计仪表盘 store（ADR-0002 seam）。
 *
 * 仪表盘 widget **经此 store 消费** admin-bff stats 端点，**不直连**。
 * store 透传 8 个 stats 端点（tier-1 ×4 + tier-2 ×4），但这层是为「跨服务聚合」留的 seam——日后要组合
 * payment/钱包/Token 多源数据时，只改 store、widget 不动（见 ADR-0002 防回退说明）。
 *
 * 每个 widget 一组 { data, loading, error } + 单独 load；`init()` 并发拉 8 个（allSettled，单个失败不阻断其余——
 * tier-1 的 3 个时间窗端点现阶段 400，status-distribution 与全部 tier-2 仍能出数）。
 *
 * 错误处理：@sa/axios flat request 返回 { data, error }，HTTP 非 2xx 走 onError 拦截器（已 toast），
 * store 只记 `error: true` 供 widget 展示降级态——不为不可达态建专属处理（memory: UI 门控/通用兜底）。
 */
import { ref } from 'vue';
import type { Ref } from 'vue';
import { defineStore } from 'pinia';
import { SetupStoreId } from '@/enum';
import {
  fetchGetBusinessSystemStats,
  fetchGetChannelStats,
  fetchGetAnomalies,
  fetchGetGatewayHealth,
  fetchGetOperationsActivity,
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

  // ---- tier-2：by-business-system（条形）----
  const businessSystem: Ref<Api.Payment.BusinessSystemStats | null> = ref(null);
  const businessSystemLoading = ref(false);
  const businessSystemError = ref(false);

  // ---- tier-2：by-channel（条形）----
  const channel: Ref<Api.Payment.ChannelStats | null> = ref(null);
  const channelLoading = ref(false);
  const channelError = ref(false);

  // ---- tier-2：anomalies（列表）----
  const anomalies: Ref<Api.Payment.PaymentAnomalies | null> = ref(null);
  const anomaliesLoading = ref(false);
  const anomaliesError = ref(false);

  // ---- tier-2：operations-activity（条形）----
  const operationsActivity: Ref<Api.Payment.OperationsActivity | null> = ref(null);
  const operationsActivityLoading = ref(false);
  const operationsActivityError = ref(false);

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

  async function loadBusinessSystem() {
    await loadResource(fetchGetBusinessSystemStats, businessSystem, businessSystemLoading, businessSystemError);
  }

  async function loadChannel() {
    await loadResource(fetchGetChannelStats, channel, channelLoading, channelError);
  }

  async function loadAnomalies() {
    await loadResource(fetchGetAnomalies, anomalies, anomaliesLoading, anomaliesError);
  }

  async function loadOperationsActivity() {
    await loadResource(
      fetchGetOperationsActivity,
      operationsActivity,
      operationsActivityLoading,
      operationsActivityError
    );
  }

  /** 并发拉全部 8 个端点；allSettled——单个失败不阻断其余 */
  async function init() {
    await Promise.allSettled([
      loadOverview(),
      loadStatusDistribution(),
      loadGatewayHealth(),
      loadOperationsAudit(),
      loadBusinessSystem(),
      loadChannel(),
      loadAnomalies(),
      loadOperationsActivity()
    ]);
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
    businessSystem,
    businessSystemLoading,
    businessSystemError,
    loadBusinessSystem,
    channel,
    channelLoading,
    channelError,
    loadChannel,
    anomalies,
    anomaliesLoading,
    anomaliesError,
    loadAnomalies,
    operationsActivity,
    operationsActivityLoading,
    operationsActivityError,
    loadOperationsActivity,
    init
  };
});
