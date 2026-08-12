<script setup lang="ts">
/**
 * 仪表盘 widget 占位态：loading / error / empty 三态统一展示。
 * widget 有数据时走默认插槽渲染图表/表格。
 */
import { $t } from '@/locales';

defineOptions({ name: 'PaymentWidgetPlaceholder' });

withDefaults(defineProps<{ loading: boolean; error: boolean; hasData: boolean; minHeight?: string }>(), {
  minHeight: 'h-300px'
});
</script>

<template>
  <div v-if="loading" class="flex-center" :class="minHeight">
    <NSpin />
  </div>
  <div v-else-if="error" class="flex-center" :class="minHeight">
    <NEmpty :description="$t('page.payment.stats.states.loadFailed')" />
  </div>
  <div v-else-if="!hasData" class="flex-center" :class="minHeight">
    <NEmpty :description="$t('page.payment.stats.states.noData')" />
  </div>
  <slot v-else />
</template>

<style scoped></style>
