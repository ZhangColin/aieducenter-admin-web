<script setup lang="ts">
import { toRaw } from 'vue';
import { jsonClone } from '@sa/utils';
import { enableStatusOptions, userGenderOptions } from '@/constants/business';
import { $t } from '@/locales';

defineOptions({
  name: 'UserSearch'
});

interface Emits {
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();

const model = defineModel<Api.SystemManage.UserSearchParams>('model', { required: true });

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
        <NFormItemGi span="24 s:12 m:6" label="用户名" class="pr-24px">
          <NInput v-model:value="model.username" placeholder="请输入用户名" clearable />
        </NFormItemGi>
        <NFormItemGi span="24 s:12 m:6" label="关键词" class="pr-24px">
          <NInput v-model:value="model.keyword" placeholder="用户名/昵称" clearable />
        </NFormItemGi>
        <NFormItemGi span="24 s:12 m:6" label="手机号" class="pr-24px">
          <NInput v-model:value="model.phone" placeholder="请输入手机号" clearable />
        </NFormItemGi>
        <NFormItemGi span="24 s:12 m:6" label="性别" class="pr-24px">
          <NSelect v-model:value="model.gender" :options="userGenderOptions" placeholder="请选择性别" clearable />
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
