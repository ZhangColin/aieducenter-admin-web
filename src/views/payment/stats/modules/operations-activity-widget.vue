<script setup lang="ts">
/**
 * tier-2 · 操作员活动 widget：各操作员按操作类型分组的笔数（分组条形）。
 * 消费 usePaymentStats store（ADR-0002 seam），不直连端点。
 *
 * x 轴 = 操作员，每个操作类型（AUDIT_APPROVE/AUDIT_REJECT/NOTIFY_RESEND…）一组柱（动态 series）。
 * operation 为 stats 聚合 read-model 的枚举 **NAME** token（与列表 code 不同），经 operationNameRecord 翻译、未知 token 原值回退。
 * notificationResendCount 为 NOTIFY_RESEND 的 roll-up，与该 series 同义，不在图上重复。
 */
import { watch } from 'vue';
import { usePaymentStatsStore } from '@/store/modules/payment-stats';
import { useEcharts } from '@/hooks/common/echarts';
import { $t } from '@/locales';
import { displayEnumName, operationNameRecord } from '@/constants/payment';
import WidgetPlaceholder from './widget-placeholder.vue';

defineOptions({ name: 'PaymentOperationsActivityWidget' });

const store = usePaymentStatsStore();

// 分组条形——series 按操作类型动态生成（操作类型数量非固定），factory 先给空壳类型，watch 内重建 series/legend。
const { domRef, updateOptions } = useEcharts(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  legend: { data: [] as string[], top: '0' },
  grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
  xAxis: { type: 'category', data: [] as string[], axisLabel: { interval: 0, rotate: 30 } },
  yAxis: { type: 'value', minInterval: 1 },
  series: [] as { name: string; type: 'bar'; data: number[] }[]
}));

/** operation token → 展示名（i18n 优先、未知原值回退） */
function labelOf(token: string): string {
  return displayEnumName(null, token, operationNameRecord);
}

/** 数据到达 → 按操作类型构建分组条形。 */
watch(
  () => store.operationsActivity,
  oa => {
    if (!oa) return;
    const operators = oa.operators ?? [];
    // 收集所有出现过的操作类型 token（保序去重），每个 token 一组柱
    const tokens: string[] = [];
    for (const op of operators) {
      for (const oc of op.operations ?? []) {
        if (oc.operation && !tokens.includes(oc.operation)) tokens.push(oc.operation);
      }
    }
    updateOptions(opts => {
      opts.xAxis.data = operators.map(o => o.operatorName || o.operatorId || '-');
      opts.legend.data = tokens.map(labelOf);
      opts.series = tokens.map(token => ({
        name: labelOf(token),
        type: 'bar',
        data: operators.map(o => Number(o.operations?.find(oc => oc.operation === token)?.count) || 0)
      }));
      return opts;
    });
  }
);
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper h-full">
    <template #header>
      <span class="font-500">{{ $t('page.payment.stats.operationsActivity.title') }}</span>
    </template>
    <template #header-extra>
      <NButton size="small" :loading="store.operationsActivityLoading" @click="store.loadOperationsActivity()">
        {{ $t('page.payment.stats.refresh') }}
      </NButton>
    </template>

    <WidgetPlaceholder
      :loading="store.operationsActivityLoading"
      :error="store.operationsActivityError"
      :has-data="Boolean(store.operationsActivity?.operators?.length)"
      min-height="h-300px"
    >
      <div ref="domRef" class="h-300px overflow-hidden"></div>
    </WidgetPlaceholder>
  </NCard>
</template>

<style scoped></style>
