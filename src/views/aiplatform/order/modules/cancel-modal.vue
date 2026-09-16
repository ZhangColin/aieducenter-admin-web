<script setup lang="ts">
/**
 * 订单取消弹窗（#57）——限未支付态（1|2），reason 必填（空禁用确认）。
 *
 * 后端聚合守卫：reason blank 拒绝；失败（如已支付态 409 ORD_007）走 onError 透传 toast。
 */
import { computed, ref, watch } from 'vue';
import { NInput, NModal } from 'naive-ui';
import { fetchCancelAiplatformOrder } from '@/service/api';
import { $t } from '@/locales';

defineOptions({ name: 'OrderCancelModal' });

const props = defineProps<{
  orderId: string;
}>();

const emit = defineEmits<{
  /** 取消成功（父页 toast 后回读详情 + 刷列表） */
  success: [];
}>();

const visible = defineModel<boolean>('visible', { default: false });

const reason = ref('');
const submitting = ref(false);

watch(visible, val => {
  if (val) reason.value = '';
});

const isValid = computed(() => reason.value.trim().length > 0);

async function handleConfirm() {
  if (!isValid.value) return false;
  submitting.value = true;
  const { error } = await fetchCancelAiplatformOrder(props.orderId, { reason: reason.value.trim() });
  submitting.value = false;
  if (!error) {
    visible.value = false;
    emit('success');
    return true;
  }
  // 失败保持弹窗（同 quote-modal：preset dialog 返回 false 阻止自动关闭）
  return false;
}
</script>

<template>
  <NModal
    v-model:show="visible"
    :title="$t('page.aiplatform.order.cancelModal.title')"
    preset="dialog"
    type="warning"
    :positive-text="$t('page.aiplatform.order.cancelModal.confirm')"
    :negative-text="$t('common.cancel')"
    :positive-button-props="{ disabled: !isValid, loading: submitting, type: 'warning' }"
    @positive-click="handleConfirm"
  >
    <p class="py-8px">{{ $t('page.aiplatform.order.cancelModal.tip', { orderId }) }}</p>
    <NInput
      v-model:value="reason"
      type="textarea"
      :rows="3"
      :placeholder="$t('page.aiplatform.order.cancelModal.reasonPlaceholder')"
    />
  </NModal>
</template>
