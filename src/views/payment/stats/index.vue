<script setup lang="ts">
/**
 * 统计概览（仪表盘）—— tier-1（4 块）+ tier-2（4 块）全量同页呈现，无占位。
 * 全部经 usePaymentStats store 消费（ADR-0002 seam）。
 * 金额统一 formatMoney（¥1,234.56）；图表复用既有 useEcharts hook + 既有图表组件范式。
 *
 * ⚠️ tier-1 的 overview / gateway-health / operations-audit 三个端点因 admin BFF 未转发 payment 必填的
 * from/to 返回 400（docs/backend-requirements/REQ-17），相应 widget 走降级态；status-distribution + 全部
 * tier-2 正常出数（tier-2 端点无时间窗）。BFF 修复后 tier-1 三块自动亮数据，前端零改动。
 */
import { computed, onMounted } from 'vue';
import { useAppStore } from '@/store/modules/app';
import { usePaymentStatsStore } from '@/store/modules/payment-stats';
import OverviewWidget from './modules/overview-widget.vue';
import StatusDistributionWidget from './modules/status-distribution-widget.vue';
import GatewayHealthWidget from './modules/gateway-health-widget.vue';
import OperationsAuditWidget from './modules/operations-audit-widget.vue';
import BusinessSystemWidget from './modules/business-system-widget.vue';
import ChannelWidget from './modules/channel-widget.vue';
import AnomaliesWidget from './modules/anomalies-widget.vue';
import OperationsActivityWidget from './modules/operations-activity-widget.vue';

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

    <!-- tier-2：按业务系统 + 按通道（两柱图） -->
    <NGrid :x-gap="gap" :y-gap="16" responsive="screen" item-responsive>
      <NGi span="24 m:12">
        <BusinessSystemWidget />
      </NGi>
      <NGi span="24 m:12">
        <ChannelWidget />
      </NGi>
    </NGrid>

    <!-- tier-2：操作员活动（柱图）+ 异常监控（列表） -->
    <NGrid :x-gap="gap" :y-gap="16" responsive="screen" item-responsive>
      <NGi span="24 m:16">
        <OperationsActivityWidget />
      </NGi>
      <NGi span="24 m:8">
        <AnomaliesWidget />
      </NGi>
    </NGrid>
  </div>
</template>

<style scoped></style>
