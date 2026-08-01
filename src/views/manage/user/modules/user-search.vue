<script setup lang="ts">
import { computed, toRaw } from 'vue';
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

/** NSelect 选项在渲染时翻译（option.label 为 i18n key；语言切换可响应）。
 *  不复用 translateOptions——其签名要求 string value，本项目 gender/status 为 number。 */
const genderOptions = computed(() => userGenderOptions.map(o => ({ ...o, label: $t(o.label) })));
const statusOptions = computed(() => enableStatusOptions.map(o => ({ ...o, label: $t(o.label) })));

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
        <NFormItemGi span="24 s:12 m:6" :label="$t('page.manage.user.userName')" class="pr-24px">
          <NInput v-model:value="model.username" :placeholder="$t('page.manage.user.form.userName')" clearable />
        </NFormItemGi>
        <NFormItemGi span="24 s:12 m:6" :label="$t('page.manage.user.keyword')" class="pr-24px">
          <NInput v-model:value="model.keyword" :placeholder="$t('page.manage.user.form.keyword')" clearable />
        </NFormItemGi>
        <NFormItemGi span="24 s:12 m:6" :label="$t('page.manage.user.userPhone')" class="pr-24px">
          <NInput v-model:value="model.phone" :placeholder="$t('page.manage.user.form.userPhone')" clearable />
        </NFormItemGi>
        <NFormItemGi span="24 s:12 m:6" :label="$t('page.manage.user.userGender')" class="pr-24px">
          <NSelect v-model:value="model.gender" :options="genderOptions" :placeholder="$t('page.manage.user.form.userGender')" clearable />
        </NFormItemGi>
        <NFormItemGi span="24 s:12 m:6" :label="$t('page.manage.user.userStatus')" class="pr-24px">
          <NSelect v-model:value="model.status" :options="statusOptions" :placeholder="$t('page.manage.user.form.userStatus')" clearable />
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
