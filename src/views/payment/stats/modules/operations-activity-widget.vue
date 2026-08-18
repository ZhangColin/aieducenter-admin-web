<script setup lang="ts">
/**
 * tier-2 · 操作员活动 widget：各操作员按操作类型分组的笔数（分组条形）。
 * 消费 usePaymentStats store（ADR-0002 seam），不直连端点。
 *
 * x 轴 = 操作员，每个操作类型一组柱（动态 series）。#54 对齐：列表名 byOperator；操作类型出口为
 * Integer code + operationName 中文名（直读展示，旧 NAME-token read-model 已废）；notifyResend 为
 * 顶层汇总（不在图上重复 NOTIFY_RESEND series）。
 */
import { watch } from 'vue';
import { usePaymentStatsStore } from '@/store/modules/payment-stats';
import { useEcharts } from '@/hooks/common/echarts';
import { $t } from '@/locales';
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

/** 操作类型 code（number→string 归一）→ 展示名（后端 operationName 中文名优先、缺失回退 code） */
function labelOfCode(operators: Api.Payment.OperatorActivityStat[], code: string): string {
  for (const op of operators) {
    const oc = (op.operations ?? []).find(o => String(o.operation) === code);
    if (oc) return oc.operationName || code;
  }
  return code;
}

/** 数据到达 → 按操作类型构建分组条形。 */
watch(
  () => store.operationsActivity,
  oa => {
    if (!oa) return;
    const operators = oa.byOperator ?? [];
    // 收集所有出现过的操作类型 code（归一 string、保序去重），每个 code 一组柱
    const codes: string[] = [];
    for (const op of operators) {
      for (const oc of op.operations ?? []) {
        const key = String(oc.operation);
        if (!codes.includes(key)) codes.push(key);
      }
    }
    updateOptions(opts => {
      opts.xAxis.data = operators.map(o => o.operatorName || o.operatorId || '-');
      opts.legend.data = codes.map(code => labelOfCode(operators, code));
      opts.series = codes.map(code => ({
        name: labelOfCode(operators, code),
        type: 'bar',
        data: operators.map(o => Number(o.operations?.find(oc => String(oc.operation) === code)?.count) || 0)
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
      :has-data="Boolean(store.operationsActivity?.byOperator?.length)"
      min-height="h-300px"
    >
      <div ref="domRef" class="h-300px overflow-hidden"></div>
    </WidgetPlaceholder>
  </NCard>
</template>

<style scoped></style>
