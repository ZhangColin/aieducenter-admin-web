<script setup lang="ts">
/**
 * 订单生命周期（T4 / #48 从 T2 抽出，支付/退款详情抽屉共用）。
 *
 * 渲染 `GET /orders/{orderNo}/lifecycle`（payment 已合并 PaymentLog + OperationLog 按 createdAt 排序）：
 * 响应为**语义 9 字段事件的扁平数组**（#54 对齐 admin ADR-0011——无 orderNo 包装、无旧平表 union）。
 * - 两类来源共用同一渲染：GATEWAY（机机通道，performer=网关接口）vs OPERATION（行为者操作，
 *   performer=操作人）**分图标**；标题直读后端 `actionName`；
 * - 结果可辨：`outcome` token（SUCCESS/FAILED…）着色 dot + tag（复用 `operationResultTagType` 启发式，
 *   与操作记录列表 result 列同源）；
 * - meta：执行方（performer + performerSystem）与补充说明（detail）。
 *
 * 按需首次加载：父级以 `active` 标识当前是否切到生命周期 tab，首次激活时拉取一次（`loaded` 守卫防重拉）。
 * 支付/退款抽屉各传自己的 no——payment `/orders/{no}/lifecycle` 同取 paymentOrderNo / refundOrderNo。
 */
import { ref, watch } from 'vue';
import { fetchGetOrderLifecycle } from '@/service/api';
import { operationResultTagType } from '@/constants/payment';
import { $t } from '@/locales';
import { formatDateTime } from '@/utils/common';

defineOptions({ name: 'PaymentOrderLifecycle' });

const props = defineProps<{
  /** 订单号（支付订单号 / 退款订单号——payment 同端点兼容） */
  orderNo: string;
  /** 当前是否处于生命周期 tab——首次为 true 时拉取（懒加载，等同 T2 handleTabChange 行为） */
  active: boolean;
}>();

const events = ref<Api.Payment.LifecycleEvent[]>([]);
const loading = ref(false);
const loaded = ref(false);

async function load() {
  if (!props.orderNo || loaded.value) return;
  loading.value = true;
  const { data, error } = await fetchGetOrderLifecycle(props.orderNo);
  if (!error && data) {
    events.value = data;
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

/**
 * NTimeline dot 类型：outcome 着色复用 `operationResultTagType`（与操作记录 result 列同源）。
 * ThemeColor 含 'primary' 而 NTimelineItem 无该值——归一为 info。
 */
function timelineType(outcome: string | null): 'success' | 'error' | 'warning' | 'info' | 'default' {
  const color = operationResultTagType(outcome);
  return color === 'primary' ? 'info' : color;
}

/** 父级重置（抽屉重开时换号）：暴露给父级清状态 */
defineExpose({
  reset() {
    events.value = [];
    loaded.value = false;
  }
});
</script>

<template>
  <div v-if="loading" class="flex-center min-h-300px">
    <NSpin />
  </div>
  <div v-else-if="events.length" class="pt-8px">
    <NTimeline size="large">
      <NTimelineItem
        v-for="(ev, i) in events"
        :key="ev.id || `${ev.createdAt}-${i}`"
        :type="timelineType(ev.outcome)"
        :time="formatDateTime(ev.createdAt)"
      >
        <div class="flex flex-wrap items-center gap-8px">
          <!-- 分图标：机机通道=payment，行为者=person -->
          <icon-ic-round-payment v-if="ev.source === 'GATEWAY'" class="text-16px" />
          <icon-ic-round-person v-else class="text-16px" />
          <!-- 标题：后端已给中文名 actionName（GATEWAY 事件可能即 token 本身） -->
          <span class="font-500">{{ ev.actionName || ev.action }}</span>
          <!-- 结果 token 原值展示（SUCCESS/FAILED…），着色与操作记录 result 列同源 -->
          <NTag v-if="ev.outcome" size="tiny" :type="operationResultTagType(ev.outcome)">
            {{ ev.outcome }}
          </NTag>
        </div>
        <!-- 事件 meta：执行方（OPERATION=操作人/来源系统，GATEWAY=网关接口/银行 code）+ 补充说明 -->
        <div class="mt-4px flex flex-col gap-2px text-12px text-[var(--n-text-color-3)]">
          <span v-if="ev.performer">
            {{ $t('page.payment.lifecycle.performer') }}: {{ ev.performer
            }}<span v-if="ev.performerSystem"> ({{ ev.performerSystem }})</span>
          </span>
          <span v-if="ev.detail">{{ $t('page.payment.lifecycle.detail') }}: {{ ev.detail }}</span>
        </div>
      </NTimelineItem>
    </NTimeline>
  </div>
  <NEmpty v-else :description="$t('page.payment.lifecycle.noEvents')" />
</template>
