<script setup lang="ts">
/**
 * 平台账号筛选条（#50）——UI 原型拍板「A 的筛选」：字段平铺不折叠。
 *
 * 契约参数：email/phone（模糊）/ userId（TSID 精确）/ status（Integer 1|0）/
 * locked（Boolean——NSelect 不吃 boolean，用 1/0 承载、提交时转换）/
 * createdFrom·createdTo（LocalDateTime ISO 本地串）。
 * 注册时间仅筛选——响应无注册时间字段（identity 不回），列表不做时间列。
 */
import { computed, reactive } from 'vue';
import { NButton, NDatePicker, NForm, NFormItemGi, NGrid, NInput, NSelect } from 'naive-ui';
import dayjs from 'dayjs';
import { accountLockedOptions, accountStatusOptions } from '@/constants/account';
import { $t } from '@/locales';

defineOptions({ name: 'AccountSearch' });

const emit = defineEmits<{
  search: [filter: Api.Account.AccountFilter];
}>();

interface LocalFilter {
  email: string | null;
  phone: string | null;
  userId: string | null;
  status: number | null;
  /** 1=已锁定 / 0=未锁定（提交转 boolean） */
  locked: number | null;
  createdRange: [number, number] | null;
}

const model = reactive<LocalFilter>({
  email: null,
  phone: null,
  userId: null,
  status: null,
  locked: null,
  createdRange: null
});

/** NSelect 选项渲染时翻译（语言切换可响应；number 值不走 translateOptions）。 */
const statusOptions = computed(() => accountStatusOptions.map(o => ({ ...o, label: $t(o.label) })));
const lockedOptions = computed(() => accountLockedOptions.map(o => ({ ...o, label: $t(o.label) })));

/** 与 payment 域 tsToIso 同形：时间戳 → LocalDateTime ISO 本地串。 */
function tsToIso(ts: number): string {
  return dayjs(ts).format('YYYY-MM-DDTHH:mm:ss');
}

function buildFilter(): Api.Account.AccountFilter {
  const filter: Api.Account.AccountFilter = {};
  if (model.email?.trim()) filter.email = model.email.trim();
  if (model.phone?.trim()) filter.phone = model.phone.trim();
  if (model.userId?.trim()) filter.userId = model.userId.trim();
  if (model.status !== null) filter.status = model.status as Api.Account.AccountStatus;
  if (model.locked !== null) filter.locked = model.locked === 1;
  if (model.createdRange) {
    filter.createdFrom = tsToIso(model.createdRange[0]);
    filter.createdTo = tsToIso(model.createdRange[1]);
  }
  return filter;
}

function handleSubmit() {
  emit('search', buildFilter());
}

function handleReset() {
  model.email = null;
  model.phone = null;
  model.userId = null;
  model.status = null;
  model.locked = null;
  model.createdRange = null;
  emit('search', {});
}
</script>

<template>
  <NCard :title="$t('page.account.title')" :bordered="false" size="small" class="card-wrapper">
    <NForm label-placement="left" :show-feedback="false">
      <NGrid x-gap="12px" y-gap="12px" item-responsive responsive="screen" cols="1 s:2 m:3">
        <NFormItemGi span="1" :label="$t('page.account.email')" path="email">
          <NInput v-model:value="model.email" :placeholder="$t('page.account.form.email')" clearable />
        </NFormItemGi>
        <NFormItemGi span="1" :label="$t('page.account.phone')" path="phone">
          <NInput v-model:value="model.phone" :placeholder="$t('page.account.form.phone')" clearable />
        </NFormItemGi>
        <NFormItemGi span="1" :label="$t('page.account.userId')" path="userId">
          <NInput v-model:value="model.userId" :placeholder="$t('page.account.form.userId')" clearable />
        </NFormItemGi>
        <NFormItemGi span="1" :label="$t('page.account.status')" path="status">
          <NSelect v-model:value="model.status" :options="statusOptions" :placeholder="$t('page.account.form.status')" clearable />
        </NFormItemGi>
        <NFormItemGi span="1" :label="$t('page.account.locked')" path="locked">
          <NSelect v-model:value="model.locked" :options="lockedOptions" :placeholder="$t('page.account.form.locked')" clearable />
        </NFormItemGi>
        <NFormItemGi span="1" :label="$t('page.account.form.createdRange')" path="createdRange">
          <NDatePicker v-model:value="model.createdRange" type="datetimerange" clearable class="w-full" />
        </NFormItemGi>
        <NFormItemGi span="1" class="flex justify-end">
          <NButton type="primary" ghost @click="handleSubmit">
            {{ $t('common.search') }}
          </NButton>
          <NButton quaternary class="ml-12px" @click="handleReset">
            {{ $t('common.reset') }}
          </NButton>
        </NFormItemGi>
      </NGrid>
    </NForm>
  </NCard>
</template>
