<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { REG_PWD } from '@/constants/reg';
import { fetchResetUserPassword } from '@/service/api';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'UserResetPwdModal'
});

interface Props {
  /** 目标用户 */
  rowData?: Api.SystemManage.User | null;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', {
  default: false
});

const { formRef, validate, restoreValidation } = useNaiveForm();
const { defaultRequiredRule, createConfirmPwdRule } = useFormRules();

const model = ref({ newPassword: '', confirmPassword: '' });
const submitting = ref(false);

const title = computed(() => `重置密码${props.rowData?.username ? ` — ${props.rowData.username}` : ''}`);

const newPasswordRef = computed(() => model.value.newPassword);

const rules = {
  newPassword: [defaultRequiredRule, { pattern: REG_PWD, message: '8-20 位、须含字母+数字', trigger: 'change' }],
  confirmPassword: createConfirmPwdRule(newPasswordRef)
} satisfies Record<string, App.Global.FormRule | App.Global.FormRule[]>;

function resetModel() {
  model.value = { newPassword: '', confirmPassword: '' };
}

async function handleSubmit() {
  await validate();

  if (!props.rowData) return;

  submitting.value = true;
  try {
    const { error } = await fetchResetUserPassword(props.rowData.id, { newPassword: model.value.newPassword });
    if (!error) {
      window.$message?.success?.('重置密码成功');
      visible.value = false;
      emit('submitted');
    }
  } finally {
    submitting.value = false;
  }
}

watch(visible, val => {
  if (val) {
    resetModel();
    restoreValidation();
  }
});
</script>

<template>
  <NModal v-model:show="visible" preset="card" :title="title" class="w-420px" :mask-closable="false">
    <NForm ref="formRef" :model="model" :rules="rules" label-placement="top">
      <NFormItem label="新密码" path="newPassword">
        <NInput
          v-model:value="model.newPassword"
          type="password"
          show-password-on="click"
          placeholder="8-20 位、须含字母+数字"
        />
      </NFormItem>
      <NFormItem label="确认新密码" path="confirmPassword">
        <NInput
          v-model:value="model.confirmPassword"
          type="password"
          show-password-on="click"
          placeholder="请再次输入新密码"
        />
      </NFormItem>
    </NForm>
    <template #footer>
      <NSpace justify="end" :size="16">
        <NButton @click="visible = false">{{ $t('common.cancel') }}</NButton>
        <NButton type="primary" :loading="submitting" @click="handleSubmit">{{ $t('common.confirm') }}</NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped></style>
