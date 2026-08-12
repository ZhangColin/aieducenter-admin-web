<script setup lang="ts">
/**
 * tier-1 · 支付总览 widget：KPI（笔数·金额·成功率·净额）+ 趋势折线（支付/退款笔数随时间）。
 * 消费 usePaymentStats store（ADR-0002 seam），不直连端点。
 */
import { watch } from 'vue';
import { usePaymentStatsStore } from '@/store/modules/payment-stats';
import { useEcharts } from '@/hooks/common/echarts';
import { $t } from '@/locales';
import { formatCount, formatDateTime, formatMoney, formatRate } from '@/utils/common';
import WidgetPlaceholder from './widget-placeholder.vue';

defineOptions({ name: 'PaymentOverviewWidget' });

const store = usePaymentStatsStore();

const { domRef, updateOptions } = useEcharts(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'cross', label: { backgroundColor: '#6a7985' } }
  },
  legend: { data: [$t('page.payment.stats.overview.paymentCount'), $t('page.payment.stats.overview.refundCount')], top: '0' },
  grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
  xAxis: { type: 'category', boundaryGap: false, data: [] as string[] },
  yAxis: { type: 'value', minInterval: 1 },
  series: [
    {
      name: $t('page.payment.stats.overview.paymentCount'),
      type: 'line',
      smooth: true,
      smoothMonotone: 'x',
      areaStyle: { opacity: 0.08 },
      data: [] as number[]
    },
    {
      name: $t('page.payment.stats.overview.refundCount'),
      type: 'line',
      smooth: true,
      smoothMonotone: 'x',
      areaStyle: { opacity: 0.08 },
      data: [] as number[]
    }
  ]
}));

/** 数据到达 → 灌趋势折线（支付/退款笔数）。 */
watch(
  () => store.overview,
  ov => {
    if (!ov) return;
    updateOptions(opts => {
      opts.xAxis.data = ov.trend.map(b => formatDateTime(b.bucket, 'MM-DD HH:mm'));
      opts.series[0].data = ov.trend.map(b => Number(b.paymentCount));
      opts.series[1].data = ov.trend.map(b => Number(b.refundCount));
      return opts;
    });
  }
);

const stats: { key: string; label: App.I18n.I18nKey; value: () => string }[] = [
  { key: 'paymentCount', label: 'page.payment.stats.overview.paymentCount', value: () => formatCount(store.overview?.paymentCount) },
  { key: 'paymentAmount', label: 'page.payment.stats.overview.paymentAmount', value: () => formatMoney(store.overview?.paymentAmount) },
  { key: 'successRate', label: 'page.payment.stats.overview.successRate', value: () => formatRate(store.overview?.successRate) },
  { key: 'netAmount', label: 'page.payment.stats.overview.netAmount', value: () => formatMoney(store.overview?.netAmount) }
];
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper">
    <template #header>
      <span class="font-500">{{ $t('page.payment.stats.overview.title') }}</span>
    </template>
    <template #header-extra>
      <NButton size="small" :loading="store.overviewLoading" @click="store.loadOverview()">
        {{ $t('page.payment.stats.refresh') }}
      </NButton>
    </template>

    <!-- KPI -->
    <NGrid :x-gap="16" :y-gap="8" responsive="screen" item-responsive class="mb-8px">
      <NGi v-for="s in stats" :key="s.key" span="12 s:6 m:6">
        <NStatistic :label="$t(s.label)" :value="s.value()" />
      </NGi>
    </NGrid>

    <!-- 趋势折线 -->
    <WidgetPlaceholder
      :loading="store.overviewLoading"
      :error="store.overviewError"
      :has-data="Boolean(store.overview)"
      min-height="h-300px"
    >
      <div ref="domRef" class="h-300px overflow-hidden"></div>
    </WidgetPlaceholder>
  </NCard>
</template>

<style scoped></style>
