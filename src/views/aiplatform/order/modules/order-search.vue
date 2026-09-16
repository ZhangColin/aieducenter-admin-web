<script setup lang="ts">
/**
 * AI 平台订单筛选条（#57）——四维检索，字段平铺不折叠（照平台账号页 A 形态先例）。
 *
 * 契约参数（admin :8081 /v3/api-docs `GET /aiplatform/orders`）：
 * status（Integer code 多选，提交拼逗号单值 status=1,5）/ createdFrom·createdTo
 * （ISO-8601 本地串，含两端）/ externalId（下单账号精确）/ orderId（订单号精确）。
 */
import { computed, reactive } from 'vue';
import { NButton, NDatePicker, NForm, NFormItemGi, NGrid, NInput, NSelect } from 'naive-ui';
import dayjs from 'dayjs';
import { orderStatusOptions } from '@/constants/aiplatform';
import { $t } from '@/locales';

defineOptions({ name: 'AiplatformOrderSearch' });

const emit = defineEmits<{
  search: [filter: Api.Aiplatform.OrderFilter];
}>();

interface LocalFilter {
  /** 状态多选（NSelect multiple） */
  status: Api.Aiplatform.OrderStatus[] | null;
  createdRange: [number, number] | null;
  externalId: string | null;
  orderId: string | null;
}

const model = reactive<LocalFilter>({
  status: null,
  createdRange: null,
  externalId: null,
  orderId: null
});

/** NSelect 选项渲染时翻译（语言切换可响应；number 值不走 translateOptions）。 */
const statusSelectOptions = computed(() => orderStatusOptions.map(o => ({ ...o, label: $t(o.label) })));

/** 与 account/payment 域 tsToIso 同形：时间戳 → ISO-8601 本地串。 */
function tsToIso(ts: number): string {
  return dayjs(ts).format('YYYY-MM-DDTHH:mm:ss');
}

function buildFilter(): Api.Aiplatform.OrderFilter {
  const filter: Api.Aiplatform.OrderFilter = {};
  if (model.status?.length) filter.status = model.status;
  if (model.createdRange) {
    filter.createdFrom = tsToIso(model.createdRange[0]);
    filter.createdTo = tsToIso(model.createdRange[1]);
  }
  if (model.externalId?.trim()) filter.externalId = model.externalId.trim();
  if (model.orderId?.trim()) filter.orderId = model.orderId.trim();
  return filter;
}

function handleSubmit() {
  emit('search', buildFilter());
}

function handleReset() {
  model.status = null;
  model.createdRange = null;
  model.externalId = null;
  model.orderId = null;
  emit('search', {});
}
</script>

<template>
  <NCard :title="$t('page.aiplatform.order.title')" :bordered="false" size="small" class="card-wrapper">
    <NForm label-placement="left" :show-feedback="false">
      <NGrid x-gap="12px" y-gap="12px" item-responsive responsive="screen" cols="1 s:2 m:3">
        <NFormItemGi span="1" :label="$t('page.aiplatform.order.status')" path="status">
          <NSelect
            v-model:value="model.status"
            multiple
            :options="statusSelectOptions"
            :placeholder="$t('page.aiplatform.order.form.status')"
            clearable
          />
        </NFormItemGi>
        <NFormItemGi span="1" :label="$t('page.aiplatform.order.form.createdRange')" path="createdRange">
          <NDatePicker v-model:value="model.createdRange" type="datetimerange" clearable class="w-full" />
        </NFormItemGi>
        <NFormItemGi span="1" :label="$t('page.aiplatform.order.form.externalId')" path="externalId">
          <NInput v-model:value="model.externalId" :placeholder="$t('page.aiplatform.order.form.externalId')" clearable />
        </NFormItemGi>
        <NFormItemGi span="1" :label="$t('page.aiplatform.order.orderId')" path="orderId">
          <NInput v-model:value="model.orderId" :placeholder="$t('page.aiplatform.order.form.orderId')" clearable />
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
