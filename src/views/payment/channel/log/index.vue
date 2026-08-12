<script setup lang="ts">
/** 通道交互日志（PaymentLog：与银行/通道网关的机机交互留痕）—— 纯筛选只读列表。归 T3。 */
import { $t } from '@/locales';

defineOptions({ name: 'PaymentChannelLog' });
</script>

<template>
  <div class="min-h-500px flex-center">
    <NCard :bordered="false" size="small" class="card-wrapper">
      <NEmpty :description="$t('page.payment.common.comingSoon')" />
    </NCard>
  </div>
</template>

<style scoped></style>
