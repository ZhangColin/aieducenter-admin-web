<script setup lang="ts">
/**
 * 统计概览（仪表盘）—— tier-1 四块 widget，全部经 usePaymentStats store 消费（ADR-0002 seam）。
 * 金额统一 formatMoney（¥1,234.56）；图表复用既有 useEcharts hook + 既有图表组件范式。
 *
 * ⚠️ 现阶段 overview / gateway-health / operations-audit 三个端点因 admin BFF 未转发 payment 必填的
 * from/to 返回 400（docs/backend-requirements/REQ-17），相应 widget 走降级态；status-distribution 正常出数。
 * BFF 修复后三块自动亮数据，前端零改动。
 */
import { computed, onMounted } from 'vue';
import { useAppStore } from '@/store/modules/app';
import { usePaymentStatsStore } from '@/store/modules/payment-stats';
import OverviewWidget from './modules/overview-widget.vue';
import StatusDistributionWidget from './modules/status-distribution-widget.vue';
import GatewayHealthWidget from './modules/gateway-health-widget.vue';
import OperationsAuditWidget from './modules/operations-audit-widget.vue';

defineOptions({ name: 'PaymentStats' });

const appStore = useAppStore();
const store = usePaymentStatsStore();

const gap = computed(() => (appStore.isMobile ? 0 : 16));

onMounted(() => {
  store.init();
});
</script>

<template>
  <div class="flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <OverviewWidget />

    <NGrid :x-gap="gap" :y-gap="16" responsive="screen" item-responsive>
      <NGi span="24 m:12">
        <StatusDistributionWidget />
      </NGi>
      <NGi span="24 m:12">
        <OperationsAuditWidget />
      </NGi>
    </NGrid>

    <GatewayHealthWidget />
  </div>
</template>

<style scoped></style>
