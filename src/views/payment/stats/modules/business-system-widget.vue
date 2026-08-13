<script setup lang="ts">
/**
 * tier-2 · 按业务系统 widget：各业务系统支付/退款笔数（分组条形）。
 * 消费 usePaymentStats store（ADR-0002 seam），不直连端点。
 *
 * 条形按 businessSystemName 分组、支付笔数 + 退款笔数两组柱（运营关心的「哪个业务系统最活跃」）。
 * successRate/refundRate/金额为次要维度，留待后端补 *Name 或后续按需加视图——tier-2 不占位。
 * businessSystemName 为调用方 callerAppName，可能较长 → x 轴标签 rotate 防重叠。
 */
import { watch } from 'vue';
import { usePaymentStatsStore } from '@/store/modules/payment-stats';
import { useEcharts } from '@/hooks/common/echarts';
import { $t } from '@/locales';
import WidgetPlaceholder from './widget-placeholder.vue';

defineOptions({ name: 'PaymentBusinessSystemWidget' });

const store = usePaymentStatsStore();

const { domRef, updateOptions } = useEcharts(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' }
  },
  legend: {
    data: [$t('page.payment.stats.byBusinessSystem.paymentCount'), $t('page.payment.stats.byBusinessSystem.refundCount')],
    top: '0'
  },
  grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
  xAxis: { type: 'category', data: [] as string[], axisLabel: { interval: 0, rotate: 30 } },
  yAxis: { type: 'value', minInterval: 1 },
  series: [
    {
      name: $t('page.payment.stats.byBusinessSystem.paymentCount'),
      type: 'bar',
      data: [] as number[]
    },
    {
      name: $t('page.payment.stats.byBusinessSystem.refundCount'),
      type: 'bar',
      data: [] as number[]
    }
  ]
}));

/** 数据到达 → 灌分组条形（支付/退款笔数 × 业务系统）。 */
watch(
  () => store.businessSystem,
  bs => {
    if (!bs) return;
    const systems = bs.systems ?? [];
    updateOptions(opts => {
      opts.xAxis.data = systems.map(s => s.businessSystemName || '-');
      opts.series[0].data = systems.map(s => Number(s.paymentCount) || 0);
      opts.series[1].data = systems.map(s => Number(s.refundCount) || 0);
      return opts;
    });
  }
);
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper h-full">
    <template #header>
      <span class="font-500">{{ $t('page.payment.stats.byBusinessSystem.title') }}</span>
    </template>
    <template #header-extra>
      <NButton size="small" :loading="store.businessSystemLoading" @click="store.loadBusinessSystem()">
        {{ $t('page.payment.stats.refresh') }}
      </NButton>
    </template>

    <WidgetPlaceholder
      :loading="store.businessSystemLoading"
      :error="store.businessSystemError"
      :has-data="Boolean(store.businessSystem?.systems?.length)"
      min-height="h-300px"
    >
      <div ref="domRef" class="h-300px overflow-hidden"></div>
    </WidgetPlaceholder>
  </NCard>
</template>

<style scoped></style>
