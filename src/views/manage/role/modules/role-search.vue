<script setup lang="ts">
import { toRaw } from 'vue';
import { jsonClone } from '@sa/utils';
import { enableStatusOptions } from '@/constants/business';
import { $t } from '@/locales';

defineOptions({
  name: 'RoleSearch'
});

interface Emits {
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();

const model = defineModel<Api.SystemManage.RoleSearchParams>('model', { required: true });

const defaultModel = jsonClone(toRaw(model.value));

function resetModel() {
  Object.assign(model.value, defaultModel);
}

function reset() {
  resetModel();
  emit('search');
}

function search() {
  emit('search');
}
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper">
    <NForm :model="model" label-placement="left" :label-width="70">
      <NGrid responsive="screen" item-responsive>
        <NFormItemGi span="24 s:12 m:6" label="名称" class="pr-24px">
          <NInput v-model:value="model.name" placeholder="请输入角色名称" clearable />
        </NFormItemGi>
        <NFormItemGi span="24 s:12 m:6" label="编码" class="pr-24px">
          <NInput v-model:value="model.code" placeholder="请输入角色编码" clearable />
        </NFormItemGi>
        <NFormItemGi span="24 s:12 m:6" label="关键词" class="pr-24px">
          <NInput v-model:value="model.keyword" placeholder="名称/编码/描述" clearable />
        </NFormItemGi>
        <NFormItemGi span="24 s:12 m:6" label="状态" class="pr-24px">
          <NSelect v-model:value="model.status" :options="enableStatusOptions" placeholder="请选择状态" clearable />
        </NFormItemGi>
        <NFormItemGi span="24 m:6" class="pr-24px">
          <NSpace class="w-full" justify="end">
            <NButton @click="reset">
              <template #icon>
                <icon-ic-round-refresh class="text-icon" />
              </template>
              {{ $t('common.reset') }}
            </NButton>
            <NButton type="primary" ghost @click="search">
              <template #icon>
                <icon-ic-round-search class="text-icon" />
              </template>
              {{ $t('common.search') }}
            </NButton>
          </NSpace>
        </NFormItemGi>
      </NGrid>
    </NForm>
  </NCard>
</template>

<style scoped></style>
