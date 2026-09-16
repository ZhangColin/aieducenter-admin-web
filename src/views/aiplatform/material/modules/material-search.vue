<script setup lang="ts">
/**
 * AI 平台知识素材筛选条（#63）——三维检索，字段平铺不折叠（照订单筛选条先例）。
 *
 * 契约参数（admin :8081 /v3/api-docs `GET /aiplatform/materials`）：
 * status（Integer code 单选：1=启用 2=停用，缺省全部）/ sunkFrom·sunkTo（首沉淀时间，
 * **闭区间含两端**，ISO-8601 Instant UTC 带 Z——同成本域时间窗口径，tsToUtcInstant 序列化）/
 * projectId（来源项目 id 精确，登记面字符串查无＝空清单 200）。
 */
import { computed, reactive } from 'vue';
import { NButton, NDatePicker, NForm, NFormItemGi, NGrid, NInput, NSelect } from 'naive-ui';
import { materialStatusOptions } from '@/constants/aiplatform';
import { $t } from '@/locales';
import { tsToUtcInstant } from '@/utils/common';

defineOptions({ name: 'AiplatformMaterialSearch' });

const emit = defineEmits<{
  search: [filter: Api.Aiplatform.MaterialFilter];
}>();

interface LocalFilter {
  /** 状态单选（两态；null＝全部） */
  status: Api.Aiplatform.MaterialStatus | null;
  sunkRange: [number, number] | null;
  projectId: string | null;
}

const model = reactive<LocalFilter>({
  status: null,
  sunkRange: null,
  projectId: null
});

/** NSelect 选项渲染时翻译（语言切换可响应；number 值不走 translateOptions）。 */
const statusSelectOptions = computed(() => materialStatusOptions.map(o => ({ ...o, label: $t(o.label) })));

function buildFilter(): Api.Aiplatform.MaterialFilter {
  const filter: Api.Aiplatform.MaterialFilter = {};
  if (model.status !== null) filter.status = model.status;
  if (model.sunkRange) {
    filter.sunkFrom = tsToUtcInstant(model.sunkRange[0]);
    filter.sunkTo = tsToUtcInstant(model.sunkRange[1]);
  }
  if (model.projectId?.trim()) filter.projectId = model.projectId.trim();
  return filter;
}

function handleSubmit() {
  emit('search', buildFilter());
}

function handleReset() {
  model.status = null;
  model.sunkRange = null;
  model.projectId = null;
  emit('search', {});
}
</script>

<template>
  <NCard :title="$t('page.aiplatform.material.title')" :bordered="false" size="small" class="card-wrapper">
    <NForm label-placement="left" :show-feedback="false">
      <NGrid x-gap="12px" y-gap="12px" item-responsive responsive="screen" cols="1 s:2 m:3">
        <NFormItemGi span="1" :label="$t('page.aiplatform.material.status')" path="status">
          <NSelect
            v-model:value="model.status"
            :options="statusSelectOptions"
            :placeholder="$t('page.aiplatform.material.form.statusPlaceholder')"
            clearable
          />
        </NFormItemGi>
        <NFormItemGi span="1" :label="$t('page.aiplatform.material.form.sunkRange')" path="sunkRange">
          <NDatePicker v-model:value="model.sunkRange" type="datetimerange" clearable class="w-full" />
        </NFormItemGi>
        <NFormItemGi span="1" :label="$t('page.aiplatform.material.projectId')" path="projectId">
          <NInput
            v-model:value="model.projectId"
            :placeholder="$t('page.aiplatform.material.form.projectIdPlaceholder')"
            clearable
          />
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
