<script setup lang="ts">
/**
 * tier-2 · 异常监控 widget：长时滞留待支付 / 长时滞留退款中 / 近期失败（列表）。
 * 消费 usePaymentStats store（ADR-0002 seam），不直连端点。
 *
 * 三项以行列表展示、按严重度配色（滞留=warning、失败=error）。#54 对齐：滞留项为嵌套
 * {count, amount}（笔数 + 金额，金额首次可用、经 formatMoney 展示）；近期失败为 recentFailures.totalCount。
 * 三项笔数全 0 时附「暂无异常」提示——这是真实数据（无异常即 0），非「即将上线」占位。
 * 计数 Long→string 经 formatCount/Number() 兜底。
 */
import { computed } from 'vue';
import { usePaymentStatsStore } from '@/store/modules/payment-stats';
import { $t } from '@/locales';
import { formatCount, formatMoney } from '@/utils/common';
import WidgetPlaceholder from './widget-placeholder.vue';

defineOptions({ name: 'PaymentAnomaliesWidget' });

const store = usePaymentStatsStore();

interface AnomalyItem {
  key: string;
  label: App.I18n.I18nKey;
  /** 严重度色（warning=#f0a020、error=#d03050，与 status-distribution 调色板一致） */
  color: string;
  count: () => number;
  /** 滞留金额（整数分，string；仅两类滞留行有） */
  amount?: () => string | undefined;
}

const items = computed<AnomalyItem[]>(() => [
  {
    key: 'longPending',
    label: 'page.payment.stats.anomalies.longPending',
    color: '#f0a020',
    count: () => Number(store.anomalies?.longPendingPayments?.count) || 0,
    amount: () => store.anomalies?.longPendingPayments?.amount
  },
  {
    key: 'longRefunding',
    label: 'page.payment.stats.anomalies.longRefunding',
    color: '#f0a020',
    count: () => Number(store.anomalies?.longRefundingRefunds?.count) || 0,
    amount: () => store.anomalies?.longRefundingRefunds?.amount
  },
  {
    key: 'recentFailure',
    label: 'page.payment.stats.anomalies.recentFailure',
    color: '#d03050',
    count: () => Number(store.anomalies?.recentFailures?.totalCount) || 0
  }
]);

/** 三项笔数全 0 → 展示「暂无异常」（真实数据，非占位） */
const allZero = computed(() => items.value.every(it => it.count() === 0));
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper h-full">
    <template #header>
      <span class="font-500">{{ $t('page.payment.stats.anomalies.title') }}</span>
    </template>
    <template #header-extra>
      <NButton size="small" :loading="store.anomaliesLoading" @click="store.loadAnomalies()">
        {{ $t('page.payment.stats.refresh') }}
      </NButton>
    </template>

    <WidgetPlaceholder
      :loading="store.anomaliesLoading"
      :error="store.anomaliesError"
      :has-data="Boolean(store.anomalies)"
      min-height="h-200px"
    >
      <div class="flex-col-stretch gap-12px">
        <div
          v-for="it in items"
          :key="it.key"
          class="flex items-center justify-between rounded-4px bg-#f5f5f5 px-12px py-10px dark:bg-#262626"
        >
          <span class="flex items-center gap-8px text-13px opacity-80">
            <span class="inline-block h-8px w-8px shrink-0 rounded-full" :style="{ background: it.color }"></span>
            {{ $t(it.label) }}
          </span>
          <span>
            <span class="font-600" :style="{ color: it.count() > 0 ? it.color : undefined }">{{ formatCount(it.count()) }}</span>
            <span class="ml-4px text-12px opacity-60">{{ $t('page.payment.stats.anomalies.count') }}</span>
            <!-- 滞留行附金额（分，string；#54 起新增展示） -->
            <span v-if="it.amount" class="ml-8px font-600">{{ formatMoney(it.amount()) }}</span>
          </span>
        </div>
      </div>

      <div v-if="allZero" class="mt-8px text-center text-12px opacity-50">
        {{ $t('page.payment.stats.anomalies.healthy') }}
      </div>
    </WidgetPlaceholder>
  </NCard>
</template>

<style scoped></style>
