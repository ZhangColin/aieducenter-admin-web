<script setup lang="ts">
/** 统计概览（仪表盘）—— 8 widget（tier-1 ×4 + tier-2 ×4）全 ECharts，经 usePaymentStats store 消费。归 T6/T7。 */
import { $t } from '@/locales';

defineOptions({ name: 'PaymentStats' });
</script>

<template>
  <div class="min-h-500px flex-center">
    <NCard :bordered="false" size="small" class="card-wrapper">
      <NEmpty :description="$t('page.payment.common.comingSoon')" />
    </NCard>
  </div>
</template>

<style scoped></style>
