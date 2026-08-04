<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { fetchCreateApp } from '@/service/api';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { useTabStore } from '@/store/modules/tab';
import { $t } from '@/locales';

defineOptions({
  name: 'AppCreateModal'
});

const visible = defineModel<boolean>('visible', {
  default: false
});

const { formRef: createFormRef, validate: validateCreate, restoreValidation } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();
const tabStore = useTabStore();

interface CreateModel {
  appCode: string;
  name: string;
  description: string | null;
}

function createDefaultModel(): CreateModel {
  return { appCode: '', name: '', description: null };
}

const model = ref<CreateModel>(createDefaultModel());
const submitting = ref(false);

const rules = computed<Record<string, App.Global.FormRule | App.Global.FormRule[]>>(() => ({
  appCode: [
    defaultRequiredRule,
    { pattern: /^[a-z0-9-]{4,64}$/, message: $t('page.manage.app.appCodeRule'), trigger: 'change' }
  ],
  name: [
    defaultRequiredRule,
    { max: 128, message: $t('page.manage.app.appNameLengthRule'), trigger: 'input' }
  ],
  description: {
    max: 512,
    message: $t('page.manage.app.appDescriptionLengthRule'),
    trigger: 'input'
  }
}));

function handleInitModel() {
  model.value = createDefaultModel();
}

function close() {
  visible.value = false;
}

async function handleSubmit() {
  await validateCreate();

  submitting.value = true;
  try {
    const { data, error } = await fetchCreateApp({
      appCode: model.value.appCode,
      name: model.value.name,
      description: model.value.description || null
    });
    if (!error && data) {
      window.$message?.success?.($t('common.addSuccess'));
      close();
      // 创建成功后替换当前 Tab 到详情页
      tabStore.replaceTab('app_detail', { params: { id: data } });
    }
  } finally {
    submitting.value = false;
  }
}

watch(visible, val => {
  if (val) {
    handleInitModel();
    restoreValidation();
  }
});
</script>

<template>
  <NModal v-model:show="visible" :title="$t('page.manage.app.createApp')" preset="card" style="width: 480px">
    <NForm ref="createFormRef" :model="model" :rules="rules" label-placement="top">
      <NFormItem :label="$t('page.manage.app.appCode')" path="appCode">
        <NInput v-model:value="model.appCode" :placeholder="$t('page.manage.app.form.appCode')" />
      </NFormItem>
      <NFormItem :label="$t('page.manage.app.appName')" path="name">
        <NInput v-model:value="model.name" :placeholder="$t('page.manage.app.form.appName')" />
      </NFormItem>
      <NFormItem :label="$t('page.manage.app.description')" path="description">
        <NInput v-model:value="model.description" type="textarea" :placeholder="$t('page.manage.app.form.description')" />
      </NFormItem>
    </NForm>
    <template #footer>
      <NSpace :size="16" justify="end">
        <NButton @click="close">{{ $t('common.cancel') }}</NButton>
        <NButton type="primary" :loading="submitting" @click="handleSubmit">{{ $t('common.confirm') }}</NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped></style>
