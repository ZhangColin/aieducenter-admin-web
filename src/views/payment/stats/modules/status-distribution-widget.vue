<script setup lang="ts">
/**
 * tier-1 · 订单状态分布 widget：支付各状态饼 + 退款各状态饼 + 退款待审核积压 KPI。
 * 消费 usePaymentStats store（ADR-0002 seam），不直连端点。
 *
 * 两饼同卡片并列（spec「支付 + 退款两列」）；标签走后端 statusName（平台统一范式）回退 code；
 * 配色复用 paymentStatusTagColor / refundStatusTagColor（code 键）。
 * BFF 透传 statusName 前（REQ-16）标签回退 code——不影响饼图比例（值=count）。
 */
import { watch } from 'vue';
import { usePaymentStatsStore } from '@/store/modules/payment-stats';
import { useEcharts } from '@/hooks/common/echarts';
import { $t } from '@/locales';
import { paymentStatusTagColor, refundStatusTagColor } from '@/constants/payment';
import { formatCount } from '@/utils/common';
import WidgetPlaceholder from './widget-placeholder.vue';

defineOptions({ name: 'PaymentStatusDistributionWidget' });

const store = usePaymentStatsStore();

/** 未知 code 的兜底色板 */
const palette = ['#18a058', '#2080f0', '#f0a020', '#d03050', '#6c6c6c', '#8e9dff', '#26deca'];

// 支付/退款两饼——各以独立内联 factory 构造（保持 useEcharts 对 series 的窄类型推断，
// 与 overview-widget 同范式；两饼仅 series.name 不同）。
const { domRef: payDomRef, updateOptions: updatePay } = useEcharts(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
  legend: { bottom: '1%', left: 'center', type: 'scroll' },
  series: [
    {
      name: $t('page.payment.stats.statusDistribution.paymentStatus'),
      type: 'pie',
      radius: ['40%', '68%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 1 },
      label: { show: true, formatter: '{b}\n{d}%' },
      data: [] as { name: string; value: number; itemStyle?: { color: string } }[]
    }
  ]
}));

const { domRef: refundDomRef, updateOptions: updateRefund } = useEcharts(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
  legend: { bottom: '1%', left: 'center', type: 'scroll' },
  series: [
    {
      name: $t('page.payment.stats.statusDistribution.refundStatus'),
      type: 'pie',
      radius: ['40%', '68%'],
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
    const payBuckets = sd.paymentStatuses.filter(b => Number(b.count) > 0);
    updatePay(opts => {
      opts.series[0].data = payBuckets.map((b, i) => ({
        name: b.statusName || b.status,
        value: Number(b.count),
        itemStyle: { color: paymentStatusTagColor[b.status as Api.Payment.PaymentStatus] ?? palette[i % palette.length] }
      }));
      return opts;
    });
    const refundBuckets = sd.refundStatuses.filter(b => Number(b.count) > 0);
    updateRefund(opts => {
      opts.series[0].data = refundBuckets.map((b, i) => ({
        name: b.statusName || b.status,
        value: Number(b.count),
        itemStyle: { color: refundStatusTagColor[b.status as Api.Payment.RefundStatus] ?? palette[i % palette.length] }
      }));
      return opts;
    });
  }
);
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper h-full">
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
      <span>
        <span class="font-600">{{ formatCount(store.statusDistribution?.refundPendingAuditCount) }}</span>
        <span class="ml-4px text-12px opacity-60">{{ $t('page.payment.stats.statusDistribution.backlogCount') }}</span>
      </span>
    </div>

    <WidgetPlaceholder
      :loading="store.statusDistributionLoading"
      :error="store.statusDistributionError"
      :has-data="Boolean(store.statusDistribution)"
      min-height="h-280px"
    >
      <NGrid :x-gap="16" responsive="screen" item-responsive>
        <NGi span="24 m:12">
          <div class="mb-4px text-center text-13px font-500">{{ $t('page.payment.stats.statusDistribution.paymentStatus') }}</div>
          <div ref="payDomRef" class="h-260px overflow-hidden"></div>
        </NGi>
        <NGi span="24 m:12">
          <div class="mb-4px text-center text-13px font-500">{{ $t('page.payment.stats.statusDistribution.refundStatus') }}</div>
          <div ref="refundDomRef" class="h-260px overflow-hidden"></div>
        </NGi>
      </NGrid>
    </WidgetPlaceholder>
  </NCard>
</template>

<style scoped></style>
