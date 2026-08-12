<script setup lang="ts">
/**
 * tier-1 · 订单状态分布 widget：支付各状态在途笔数饼图 + 退款待审核积压 KPI。
 * 消费 usePaymentStats store（ADR-0002 seam），不直连端点。
 *
 * 饼图标签走后端 statusName（平台统一枚举范式），回退 code；配色复用 paymentStatusTagColor（code 键）。
 * BFF 透传 statusName 前（REQ-16）标签回退为 code——不影响饼图比例（值=count）。
 */
import { watch } from 'vue';
import { usePaymentStatsStore } from '@/store/modules/payment-stats';
import { useEcharts } from '@/hooks/common/echarts';
import { $t } from '@/locales';
import { paymentStatusTagColor } from '@/constants/payment';
import { formatCount } from '@/utils/common';
import WidgetPlaceholder from './widget-placeholder.vue';

defineOptions({ name: 'PaymentStatusDistributionWidget' });

const store = usePaymentStatsStore();

/** 饼图色板：按 code 取 paymentStatusTagColor，未知 code 兜底灰。 */
const palette = ['#18a058', '#2080f0', '#f0a020', '#d03050', '#6c6c6c', '#8e9dff', '#26deca'];

const { domRef, updateOptions } = useEcharts(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
  legend: { bottom: '1%', left: 'center', type: 'scroll' },
  series: [
    {
      name: $t('page.payment.stats.statusDistribution.paymentStatus'),
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 1 },
      label: { show: true, formatter: '{b}\n{d}%' },
      data: [] as { name: string; value: number; itemStyle?: { color: string } }[]
    }
  ]
}));

watch(
  () => store.statusDistribution,
  sd => {
    if (!sd) return;
    // 过滤 0 笔，避免空切片污染图例
    const buckets = sd.paymentStatuses.filter(b => Number(b.count) > 0);
    updateOptions(opts => {
      opts.series[0].data = buckets.map((b, i) => ({
        name: b.statusName || b.status,
        value: Number(b.count),
        itemStyle: { color: paymentStatusTagColor[b.status as Api.Payment.PaymentStatus] ?? palette[i % palette.length] }
      }));
      return opts;
    });
  }
);
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper">
    <template #header>
      <span class="font-500">{{ $t('page.payment.stats.statusDistribution.title') }}</span>
    </template>
    <template #header-extra>
      <NButton size="small" :loading="store.statusDistributionLoading" @click="store.loadStatusDistribution()">
        {{ $t('page.payment.stats.refresh') }}
      </NButton>
    </template>

    <!-- 退款待审核积压 -->
    <div class="mb-8px flex items-center justify-between rounded-4px bg-#f5f5f5 px-12px py-8px dark:bg-#262626">
      <span class="text-13px opacity-75">{{ $t('page.payment.stats.statusDistribution.refundBacklog') }}</span>
      <NSpace :size="20" align="center">
        <span>
          <span class="font-600">{{ formatCount(store.statusDistribution?.refundPendingAuditCount) }}</span>
          <span class="ml-4px text-12px opacity-60">{{ $t('page.payment.stats.statusDistribution.backlogCount') }}</span>
        </span>
      </NSpace>
    </div>

    <WidgetPlaceholder
      :loading="store.statusDistributionLoading"
      :error="store.statusDistributionError"
      :has-data="Boolean(store.statusDistribution)"
      min-height="h-300px"
    >
      <div ref="domRef" class="h-300px overflow-hidden"></div>
    </WidgetPlaceholder>
  </NCard>
</template>

<style scoped></style>
