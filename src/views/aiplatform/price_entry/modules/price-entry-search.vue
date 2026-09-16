<script setup lang="ts">
/**
 * AI 平台单价表筛选条（#62）——provider/model 两维文本过滤，字段平铺不折叠（照四域先例）。
 *
 * 契约参数（admin :8081 /v3/api-docs `GET /aiplatform/price-entries`）：provider/model 均为
 * 匹配键成分＝**精确等值**过滤（非模糊）、均可缺省（缺省=全量行）。两端 trim 后空串不传参。
 */
import { reactive } from 'vue';
import { NButton, NForm, NFormItemGi, NGrid, NInput } from 'naive-ui';
import { $t } from '@/locales';

defineOptions({ name: 'AiplatformPriceEntrySearch' });

const emit = defineEmits<{
  search: [filter: Api.Aiplatform.PriceEntryFilter];
}>();

const model = reactive({ provider: '', model: '' });

function buildFilter(): Api.Aiplatform.PriceEntryFilter {
  const filter: Api.Aiplatform.PriceEntryFilter = {};
  const provider = model.provider.trim();
  const modelText = model.model.trim();
  if (provider) filter.provider = provider;
  if (modelText) filter.model = modelText;
  return filter;
}

function handleSubmit() {
  emit('search', buildFilter());
}

function handleReset() {
  model.provider = '';
  model.model = '';
  emit('search', {});
}
</script>

<template>
  <NCard :title="$t('page.aiplatform.priceEntry.title')" :bordered="false" size="small" class="card-wrapper">
    <NForm label-placement="left" :show-feedback="false">
      <NGrid x-gap="12px" y-gap="12px" item-responsive responsive="screen" cols="1 s:2 m:3">
        <NFormItemGi span="1" :label="$t('page.aiplatform.priceEntry.provider')" path="provider">
          <NInput v-model:value="model.provider" :placeholder="$t('page.aiplatform.priceEntry.form.providerPlaceholder')" clearable />
        </NFormItemGi>
        <NFormItemGi span="1" :label="$t('page.aiplatform.priceEntry.model')" path="model">
          <NInput v-model:value="model.model" :placeholder="$t('page.aiplatform.priceEntry.form.modelPlaceholder')" clearable />
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
