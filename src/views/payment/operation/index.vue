<script setup lang="ts">
/** 订单操作记录（OperationLog：行为者对订单的操作留痕）—— 纯筛选只读列表。归 T4。 */
import { $t } from '@/locales';

defineOptions({ name: 'PaymentOperation' });
</script>

<template>
  <div class="min-h-500px flex-center">
    <NCard :bordered="false" size="small" class="card-wrapper">
      <NEmpty :description="$t('page.payment.common.comingSoon')" />
    </NCard>
  </div>
</template>

<style scoped></style>
