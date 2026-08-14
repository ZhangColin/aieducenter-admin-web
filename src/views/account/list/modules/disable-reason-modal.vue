<script setup lang="ts">
/**
 * 封号 reason 弹窗（#50）——契约：reason 必填、≤500（后端 @NotBlank @Size(max=500)）。
 * 文案不带省略号（UI 原型拍板）。
 */
import { ref, watch } from 'vue';
import { NButton, NInput, NModal } from 'naive-ui';
import { $t } from '@/locales';

defineOptions({ name: 'DisableReasonModal' });

const visible = defineModel<boolean>('visible', { default: false });

const props = defineProps<{
  /** 目标账号昵称（可空）与 userId，仅用于提示文案。 */
  nickname: string | null;
  userId: string;
}>();

const emit = defineEmits<{
  confirm: [reason: string];
}>();

const reason = ref('');

watch(visible, val => {
  if (val) reason.value = '';
});

function handleConfirm() {
  if (!reason.value.trim()) return;
  emit('confirm', reason.value.trim());
  visible.value = false;
}
</script>

<template>
  <NModal v-model:show="visible" preset="card" class="w-480px" :title="$t('page.account.disableModal.title')" :bordered="false">
    <div class="flex flex-col gap-12px">
      <div class="text-14px text-#666">
        {{ $t('page.account.disableModal.tip', { name: props.nickname ?? props.userId }) }}
      </div>
      <NInput
        v-model:value="reason"
        type="textarea"
        :placeholder="$t('page.account.disableModal.reasonPlaceholder')"
        :autosize="{ minRows: 3, maxRows: 6 }"
        maxlength="500"
        show-count
      />
      <div class="flex justify-end gap-12px">
        <NButton size="small" @click="visible = false">{{ $t('common.cancel') }}</NButton>
        <NButton type="error" size="small" :disabled="!reason.trim()" @click="handleConfirm">
          {{ $t('page.account.disableModal.confirm') }}
        </NButton>
      </div>
    </div>
  </NModal>
</template>
