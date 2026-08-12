<script setup lang="ts">
/**
 * 订单生命周期（T4 / #48 从 T2 抽出，支付/退款详情抽屉共用）。
 *
 * 渲染 `GET /orders/{orderNo}/lifecycle`（payment 已合并 PaymentLog + OperationLog 按 createdAt 排序）：
 * - 机机通道事件 vs 人/系统操作事件 **分色（dot outcome）+ 分图标（source）**；
 * - success/fail 可辨（PAYMENT_LOG 的 success boolean + OPERATION_LOG 的 result 启发式着色）。
 *
 * 按需首次加载：父级以 `active` 标识当前是否切到生命周期 tab，首次激活时拉取一次（`loaded` 守卫防重拉）。
 * 支付/退款抽屉各传自己的 no——payment `/orders/{no}/lifecycle` 同取 paymentOrderNo / refundOrderNo。
 */
import { ref, watch } from 'vue';
import { fetchGetOrderLifecycle } from '@/service/api';
import { displayEnumName, logTypeRecord, operationTypeRecord } from '@/constants/payment';
import { $t } from '@/locales';
import { formatDateTime } from '@/utils/common';

defineOptions({ name: 'PaymentOrderLifecycle' });

const props = defineProps<{
  /** 订单号（支付订单号 / 退款订单号——payment 同端点兼容） */
  orderNo: string;
  /** 当前是否处于生命周期 tab——首次为 true 时拉取（懒加载，等同 T2 handleTabChange 行为） */
  active: boolean;
}>();

const lifecycle = ref<Api.Payment.OrderLifecycle | null>(null);
const loading = ref(false);
const loaded = ref(false);

async function load() {
  if (!props.orderNo || loaded.value) return;
  loading.value = true;
  const { data, error } = await fetchGetOrderLifecycle(props.orderNo);
  if (!error && data) {
    lifecycle.value = data;
  }
  loaded.value = true;
  loading.value = false;
}

// 首次激活加载（immediate：若父级默认就在生命周期 tab 也能拉到）
watch(
  () => props.active,
  val => {
    if (val) load();
  },
  { immediate: true }
);

/** NTimeline dot 类型：PAYMENT_LOG 按 success 决定 success/error，OPERATION_LOG 统一 info（行为者=蓝） */
function timelineType(ev: Api.Payment.LifecycleEvent): 'success' | 'error' | 'info' | 'default' {
  if (ev.source === 'PAYMENT_LOG') {
    if (ev.success === true) return 'success';
    if (ev.success === false) return 'error';
    return 'default';
  }
  return 'info';
}

/** 生命周期事件标题：PAYMENT_LOG→logType，OPERATION_LOG→operation（均未知回退 source 文案） */
function eventTitle(ev: Api.Payment.LifecycleEvent): string {
  if (ev.source === 'PAYMENT_LOG') return displayEnumName(null, ev.logType, logTypeRecord);
  return displayEnumName(ev.operationName, ev.operation, operationTypeRecord);
}

/** 操作结果（自由稳定 token）启发式着色：FAIL/ERROR/REJECT→error，SUCCESS/APPROVE→success，余 default */
function resultTagType(result: string | null): NaiveUI.ThemeColor {
  if (!result) return 'default';
  const r = result.toUpperCase();
  if (r.includes('FAIL') || r.includes('ERROR') || r.includes('REJECT')) return 'error';
  if (r.includes('SUCCESS') || r.includes('APPROVE') || r.includes('OK') || r === 'DONE') return 'success';
  return 'default';
}

/** executionTime 为 Long→string（全局 Jackson），展示兜底 Number() */
function formatExecMs(ms: string | null): string {
  if (ms == null || ms === '') return '-';
  const n = Number(ms);
  return Number.isNaN(n) ? '-' : `${n} ms`;
}

/** 父级重置（抽屉重开时换号）：暴露给父级清状态 */
defineExpose({
  reset() {
    lifecycle.value = null;
    loaded.value = false;
  }
});
</script>

<template>
  <div v-if="loading" class="flex-center min-h-300px">
    <NSpin />
  </div>
  <div v-else-if="lifecycle && lifecycle.events.length" class="pt-8px">
    <NTimeline size="large">
      <NTimelineItem
        v-for="(ev, i) in lifecycle.events"
        :key="`${ev.createdAt}-${ev.source}-${i}`"
        :type="timelineType(ev)"
        :time="formatDateTime(ev.createdAt)"
      >
        <div class="flex flex-wrap items-center gap-8px">
          <!-- 分图标：机机通道=payment，行为者=person -->
          <icon-ic-round-payment v-if="ev.source === 'PAYMENT_LOG'" class="text-16px" />
          <icon-ic-round-person v-else class="text-16px" />
          <span class="font-500">{{ eventTitle(ev) }}</span>
          <!-- 分色 outcome tag -->
          <NTag v-if="ev.source === 'PAYMENT_LOG'" size="tiny" :type="ev.success === false ? 'error' : ev.success === true ? 'success' : 'default'">
            {{ ev.success === false ? $t('page.payment.lifecycle.fail') : ev.success === true ? $t('page.payment.lifecycle.success') : $t('page.payment.lifecycle.unknown') }}
          </NTag>
          <NTag v-else size="tiny" :type="resultTagType(ev.result)">
            {{ ev.result || '-' }}
          </NTag>
        </div>
        <!-- 机机通道事件 meta -->
        <div v-if="ev.source === 'PAYMENT_LOG'" class="mt-4px flex flex-col gap-2px text-12px text-[var(--n-text-color-3)]">
          <span v-if="ev.bankInterface">{{ $t('page.payment.lifecycle.bankInterface') }}: {{ ev.bankInterface }}</span>
          <span v-if="ev.returnCode || ev.returnMsg">
            {{ $t('page.payment.lifecycle.returnCode') }}: {{ ev.returnCode || '-' }}
            <span v-if="ev.returnMsg"> · {{ ev.returnMsg }}</span>
          </span>
          <span>{{ $t('page.payment.lifecycle.executionTime') }}: {{ formatExecMs(ev.executionTime) }}</span>
        </div>
        <!-- 行为者操作事件 meta -->
        <div v-else class="mt-4px flex flex-col gap-2px text-12px text-[var(--n-text-color-3)]">
          <span v-if="ev.operatorName">
            {{ $t('page.payment.lifecycle.operator') }}: {{ ev.operatorName
            }}<span v-if="ev.operatorSystem"> ({{ ev.operatorSystem }})</span>
          </span>
          <span v-if="ev.remark">{{ $t('page.payment.lifecycle.remark') }}: {{ ev.remark }}</span>
        </div>
      </NTimelineItem>
    </NTimeline>
  </div>
  <NEmpty v-else :description="$t('page.payment.lifecycle.noEvents')" />
</template>
