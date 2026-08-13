<script setup lang="ts">
/**
 * tier-2 · 按通道 widget：按支付方式 + 按接入类型两维度支付笔数（两组单系列条形）。
 * 消费 usePaymentStats store（ADR-0002 seam），不直连端点。
 *
 * 同卡片并列两柱图（与 status-distribution 两饼同范式）：byPayMode / byAccessType 各以 paymentCount 为柱高。
 * 维度分组键为枚举 **NAME** token（stats read-model，与列表 code 不同），经 name-token record 翻译、未知 token 原值回退。
 */
import { watch } from 'vue';
import { usePaymentStatsStore } from '@/store/modules/payment-stats';
import { useEcharts } from '@/hooks/common/echarts';
import { $t } from '@/locales';
import { accessTypeNameRecord, displayEnumName, payModeNameRecord } from '@/constants/payment';
import WidgetPlaceholder from './widget-placeholder.vue';

defineOptions({ name: 'PaymentChannelWidget' });

const store = usePaymentStatsStore();

// 两柱图——各以独立 useEcharts 实例构造（与 status-distribution 两饼同范式）。
const { domRef: payModeDomRef, updateOptions: updatePayMode } = useEcharts(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
  xAxis: { type: 'category', data: [] as string[], axisLabel: { interval: 0, rotate: 30 } },
  yAxis: { type: 'value', minInterval: 1 },
  series: [{ name: $t('page.payment.stats.byChannel.paymentCount'), type: 'bar', data: [] as number[], barMaxWidth: 40 }]
}));

const { domRef: accessTypeDomRef, updateOptions: updateAccessType } = useEcharts(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
  xAxis: { type: 'category', data: [] as string[], axisLabel: { interval: 0, rotate: 30 } },
  yAxis: { type: 'value', minInterval: 1 },
  series: [{ name: $t('page.payment.stats.byChannel.paymentCount'), type: 'bar', data: [] as number[], barMaxWidth: 40 }]
}));

/** 数据到达 → 灌两柱图（payMode / accessType 各 paymentCount）。 */
watch(
  () => store.channel,
  ch => {
    if (!ch) return;
    const byPayMode = ch.byPayMode ?? [];
    updatePayMode(opts => {
      opts.xAxis.data = byPayMode.map(s => displayEnumName(null, s.payMode, payModeNameRecord));
      opts.series[0].data = byPayMode.map(s => Number(s.paymentCount) || 0);
      return opts;
    });
    const byAccessType = ch.byAccessType ?? [];
    updateAccessType(opts => {
      opts.xAxis.data = byAccessType.map(s => displayEnumName(null, s.accessType, accessTypeNameRecord));
      opts.series[0].data = byAccessType.map(s => Number(s.paymentCount) || 0);
      return opts;
    });
  }
);
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper h-full">
    <template #header>
      <span class="font-500">{{ $t('page.payment.stats.byChannel.title') }}</span>
    </template>
    <template #header-extra>
      <NButton size="small" :loading="store.channelLoading" @click="store.loadChannel()">
        {{ $t('page.payment.stats.refresh') }}
      </NButton>
    </template>

    <WidgetPlaceholder
      :loading="store.channelLoading"
      :error="store.channelError"
      :has-data="Boolean(store.channel?.byPayMode?.length || store.channel?.byAccessType?.length)"
      min-height="h-280px"
    >
      <NGrid :x-gap="16" responsive="screen" item-responsive>
        <NGi span="24 m:12">
          <div class="mb-4px text-center text-13px font-500">{{ $t('page.payment.stats.byChannel.byPayMode') }}</div>
          <div ref="payModeDomRef" class="h-260px overflow-hidden"></div>
        </NGi>
        <NGi span="24 m:12">
          <div class="mb-4px text-center text-13px font-500">{{ $t('page.payment.stats.byChannel.byAccessType') }}</div>
          <div ref="accessTypeDomRef" class="h-260px overflow-hidden"></div>
        </NGi>
      </NGrid>
    </WidgetPlaceholder>
  </NCard>
</template>

<style scoped></style>
