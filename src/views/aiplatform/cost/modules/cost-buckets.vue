<script setup lang="ts">
/**
 * 按币种成本 chips（#64，admin#75 契约点亮）——四个成本承载面共用渲染单点：
 * 成本页总览区 / 项目成本表行 / 下钻抽屉 / 项目详情抽屉 costSummary。
 *
 * 契约：键 = ISO 4217 币种码、值 = 金额 swagger number **直读不折算**（区别于订单 Long 分口径，
 * 勿套 formatMoney）；空对象 = 无用量或全未配价——空态文案不伪装 0；桶提取排序走
 * breakdown.ts `costBucketEntries` 单点（与项目成本表列共用，T8 review ① 收编）。
 */
import { computed } from 'vue';
import { $t } from '@/locales';
import { formatCostAmount } from '@/utils/common';
import { costBucketEntries } from './breakdown';

defineOptions({ name: 'AiplatformCostBuckets' });

const props = defineProps<{
  /** 币种桶（加载中为 null → 整体不渲染，避免空态文案闪现；空对象 = 无用量或全未配价） */
  cost?: Record<string, number> | null;
}>();

/** 有效桶按金额降序（单币种 v1 下排序近乎退化，多币种时成本高者在前）。 */
const buckets = computed(() => costBucketEntries(props.cost));
</script>

<template>
  <div v-if="buckets.length" class="flex flex-wrap items-center gap-8px">
    <NTag v-for="[currency, amount] in buckets" :key="currency" size="small" :bordered="false">
      <span class="font-mono">{{ currency }} {{ formatCostAmount(amount) }}</span>
    </NTag>
  </div>
  <span v-else-if="cost" class="text-12px text-#999">{{ $t('page.aiplatform.cost.costBucketsEmpty') }}</span>
</template>

<style scoped></style>
