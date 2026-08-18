<script setup lang="ts">
/**
 * tier-1 · 订单状态分布 widget：支付各状态饼 + 退款各状态饼 + 退款待审核积压 KPI（笔数·金额）。
 * 消费 usePaymentStats store（ADR-0002 seam），不直连端点。
 *
 * 两饼同卡片并列（spec「支付 + 退款两列」）。
 * - 比例维度 = **笔数**（value=count）；**金额**作 tooltip 第二维度（spec 故事 23「各状态在途笔数·金额」），
 *   不抢饼比例以避免双量纲混淆。
 * - 标签走 displayEnumName：后端 statusName 优先 → 既有 i18n record 兜底（与列表/详情同源）→ code。
 * - 配色复用 paymentStatusTagColor / refundStatusTagColor（code 键，number code 经 enumTagColor 归一）。
 * - 积压 KPI：嵌套 refundBacklog{pendingCount, pendingAmount}（#54 对齐）——积压金额首次可用、一并展示。
 */
import { watch } from 'vue';
import { usePaymentStatsStore } from '@/store/modules/payment-stats';
import { useEcharts } from '@/hooks/common/echarts';
import type { TooltipComponentFormatterCallbackParams } from 'echarts';
import { $t } from '@/locales';
import {
  displayEnumName,
  paymentStatusRecord,
  paymentStatusTagColor,
  refundStatusRecord,
  refundStatusTagColor
} from '@/constants/payment';
import { formatCount, formatMoney } from '@/utils/common';
import WidgetPlaceholder from './widget-placeholder.vue';

defineOptions({ name: 'PaymentStatusDistributionWidget' });

const store = usePaymentStatsStore();

/** 未知 code 的兜底色板 */
const palette = ['#18a058', '#2080f0', '#f0a020', '#d03050', '#6c6c6c', '#8e9dff', '#26deca'];

/**
 * 饼图数据点：value=笔数（决定饼比例）、amount=该状态金额（tooltip 呈现，spec 故事 23「各状态在途笔数·金额」）。
 * echarts tooltip 的 CallbackDataParams.data 透传此原对象，formatter 经 `as` 取 amount。
 */
type PieDatum = { name: string; value: number; amount: number; itemStyle?: { color: string } };

/**
 * 饼图 tooltip：状态名 + 笔数 + 金额 + 占比（spec 故事 23「各状态在途笔数·金额」）。
 * value=count 决定饼比例，amount 作 tooltip 第二维度（不抢饼比例，避免双量纲混淆）。
 * 取 echarts 原生 `TooltipComponentFormatterCallbackParams`（CallbackDataParams | 其数组），
 * 按 trigger=item 取单值，`as` 读 data 上的 amount。
 */
function pieTooltipFormatter(params: TooltipComponentFormatterCallbackParams): string {
  // 饼图 trigger=item，params 取单个 CallbackDataParams 形态（数组形态仅 axis 触发，这里不会出现）。
  const p = Array.isArray(params) ? params[0] : params;
  if (!p) return '';
  const amount = (p.data as PieDatum | undefined)?.amount;
  return `${p.name}：${formatCount(p.value as number | string)} 笔 · ${formatMoney(amount)}（${p.percent ?? 0}%）`;
}

// 支付/退款两饼——各以独立内联 factory 构造（保持 useEcharts 对 series 的窄类型推断，
// 与 overview-widget 同范式；两饼仅 series.name 不同）。
const { domRef: payDomRef, updateOptions: updatePay } = useEcharts(() => ({
  tooltip: { trigger: 'item', formatter: pieTooltipFormatter },
  legend: { bottom: '1%', left: 'center', type: 'scroll' },
  series: [
    {
      name: $t('page.payment.stats.statusDistribution.paymentStatus'),
      type: 'pie',
      radius: ['40%', '68%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 1 },
      label: { show: true, formatter: '{b}\n{d}%' },
      data: [] as PieDatum[]
    }
  ]
}));

const { domRef: refundDomRef, updateOptions: updateRefund } = useEcharts(() => ({
  tooltip: { trigger: 'item', formatter: pieTooltipFormatter },
  legend: { bottom: '1%', left: 'center', type: 'scroll' },
  series: [
    {
      name: $t('page.payment.stats.statusDistribution.refundStatus'),
      type: 'pie',
      radius: ['40%', '68%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 1 },
      label: { show: true, formatter: '{b}\n{d}%' },
      data: [] as PieDatum[]
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
        name: displayEnumName(b.statusName, b.status, paymentStatusRecord),
        value: Number(b.count),
        amount: Number(b.amount),
        itemStyle: { color: paymentStatusTagColor[String(b.status) as Api.Payment.PaymentStatus] ?? palette[i % palette.length] }
      }));
      return opts;
    });
    const refundBuckets = sd.refundStatuses.filter(b => Number(b.count) > 0);
    updateRefund(opts => {
      opts.series[0].data = refundBuckets.map((b, i) => ({
        name: displayEnumName(b.statusName, b.status, refundStatusRecord),
        value: Number(b.count),
        amount: Number(b.amount),
        itemStyle: { color: refundStatusTagColor[String(b.status) as Api.Payment.RefundStatus] ?? palette[i % palette.length] }
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

    <!-- 退款待审核积压（嵌套 refundBacklog：笔数 + 金额——#54 起积压金额首次可用、一并展示） -->
    <div class="mb-8px flex items-center justify-between rounded-4px bg-#f5f5f5 px-12px py-8px dark:bg-#262626">
      <span class="text-13px opacity-75">{{ $t('page.payment.stats.statusDistribution.refundBacklog') }}</span>
      <span>
        <span class="font-600">{{ formatCount(store.statusDistribution?.refundBacklog?.pendingCount) }}</span>
        <span class="ml-4px text-12px opacity-60">{{ $t('page.payment.stats.statusDistribution.backlogCount') }}</span>
        <span class="ml-8px font-600">{{ formatMoney(store.statusDistribution?.refundBacklog?.pendingAmount) }}</span>
        <span class="ml-4px text-12px opacity-60">{{ $t('page.payment.stats.statusDistribution.backlogAmount') }}</span>
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
