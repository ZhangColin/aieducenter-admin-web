<script setup lang="ts">
/** 退款订单（列表 + 详情抽屉 + 退款审核 + 通知重发）。归 T2/T5。 */
import { $t } from '@/locales';

defineOptions({ name: 'PaymentRefund' });
</script>

<template>
  <div class="min-h-500px flex-center">
    <NCard :bordered="false" size="small" class="card-wrapper">
      <NEmpty :description="$t('page.payment.common.comingSoon')" />
    </NCard>
  </div>
</template>

<style scoped></style>
