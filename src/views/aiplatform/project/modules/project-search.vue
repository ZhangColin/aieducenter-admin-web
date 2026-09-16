<script setup lang="ts">
/**
 * AI 平台项目筛选条（#58）——四维检索，字段平铺不折叠（照订单域先例）。
 *
 * 契约参数（admin :8081 /v3/api-docs `GET /aiplatform/projects`）：
 * status（Integer code **三档单选**单值直传——全部=缺省不传，与订单多选逗号串有意不同）/
 * createdFrom·createdTo（ISO-8601 本地串，含两端）/ externalId（归属账号精确）/
 * projectId（项目 id 精确）。
 */
import { computed, reactive } from 'vue';
import { NButton, NDatePicker, NForm, NFormItemGi, NGrid, NInput, NRadioButton, NRadioGroup } from 'naive-ui';
import dayjs from 'dayjs';
import { projectStatusRadioOptions } from '@/constants/aiplatform';
import { $t } from '@/locales';

defineOptions({ name: 'AiplatformProjectSearch' });

const emit = defineEmits<{
  search: [filter: Api.Aiplatform.ProjectFilter];
}>();

interface LocalFilter {
  /** 状态三档单选（'all'=全部，缺省不传参） */
  status: 'all' | Api.Aiplatform.ProjectStatus;
  createdRange: [number, number] | null;
  externalId: string | null;
  projectId: string | null;
}

const model = reactive<LocalFilter>({
  status: 'all',
  createdRange: null,
  externalId: null,
  projectId: null
});

/** NRadio 选项渲染时翻译（语言切换可响应；number 值不走 translateOptions）。 */
const statusRadioOptions = computed(() =>
  projectStatusRadioOptions.map(o => ({ ...o, label: $t(o.label) }))
);

/** 与 account/payment 域 tsToIso 同形：时间戳 → ISO-8601 本地串。 */
function tsToIso(ts: number): string {
  return dayjs(ts).format('YYYY-MM-DDTHH:mm:ss');
}

function buildFilter(): Api.Aiplatform.ProjectFilter {
  const filter: Api.Aiplatform.ProjectFilter = {};
  if (model.status !== 'all') filter.status = model.status;
  if (model.createdRange) {
    filter.createdFrom = tsToIso(model.createdRange[0]);
    filter.createdTo = tsToIso(model.createdRange[1]);
  }
  if (model.externalId?.trim()) filter.externalId = model.externalId.trim();
  if (model.projectId?.trim()) filter.projectId = model.projectId.trim();
  return filter;
}

function handleSubmit() {
  emit('search', buildFilter());
}

function handleReset() {
  model.status = 'all';
  model.createdRange = null;
  model.externalId = null;
  model.projectId = null;
  emit('search', {});
}
</script>

<template>
  <NCard :title="$t('page.aiplatform.project.title')" :bordered="false" size="small" class="card-wrapper">
    <NForm label-placement="left" :show-feedback="false">
      <NGrid x-gap="12px" y-gap="12px" item-responsive responsive="screen" cols="1 s:2 m:3">
        <NFormItemGi span="1" :label="$t('page.aiplatform.project.status')" path="status">
          <NRadioGroup v-model:value="model.status">
            <NRadioButton v-for="opt in statusRadioOptions" :key="String(opt.value)" :value="opt.value">
              {{ opt.label }}
            </NRadioButton>
          </NRadioGroup>
        </NFormItemGi>
        <NFormItemGi span="1" :label="$t('page.aiplatform.project.form.createdRange')" path="createdRange">
          <NDatePicker v-model:value="model.createdRange" type="datetimerange" clearable class="w-full" />
        </NFormItemGi>
        <NFormItemGi span="1" :label="$t('page.aiplatform.project.form.externalId')" path="externalId">
          <NInput v-model:value="model.externalId" :placeholder="$t('page.aiplatform.project.form.externalId')" clearable />
        </NFormItemGi>
        <NFormItemGi span="1" :label="$t('page.aiplatform.project.projectId')" path="projectId">
          <NInput v-model:value="model.projectId" :placeholder="$t('page.aiplatform.project.form.projectId')" clearable />
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
