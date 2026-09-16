<script setup lang="ts">
/**
 * AI 平台沙箱筛选条（#60）——两维单选过滤，字段平铺不折叠（照订单/项目域先例）。
 *
 * 契约参数（admin :8081 /v3/api-docs `GET /aiplatform/workspaces`）：
 * desired（期望态单选 Integer code：1=运行 2=休眠 3=封存）/ actual（容器实态单选：
 * 1=运行中 2=已停止 3=无容器 4=未知）——均可缺省（缺省=全量）、可组合；
 * 「desired=运行 + actual=无容器」即捞漂移清单（期望≠实态收敛缺口）。
 */
import { computed, reactive } from 'vue';
import { NButton, NForm, NFormItemGi, NGrid, NSelect } from 'naive-ui';
import { containerStateOptions, desiredStateOptions } from '@/constants/aiplatform';
import { $t } from '@/locales';

defineOptions({ name: 'AiplatformWorkspaceSearch' });

const emit = defineEmits<{
  search: [filter: Api.Aiplatform.WorkspaceFilter];
}>();

interface LocalFilter {
  /** 期望态单选（null=全部不传参） */
  desired: Api.Aiplatform.WorkspaceDesiredState | null;
  /** 容器实态单选（null=全部不传参） */
  actual: Api.Aiplatform.WorkspaceContainerState | null;
}

const model = reactive<LocalFilter>({ desired: null, actual: null });

/** NSelect 选项渲染时翻译（语言切换可响应；number 值不走 translateOptions）。 */
const desiredSelectOptions = computed(() => desiredStateOptions.map(o => ({ ...o, label: $t(o.label) })));
const actualSelectOptions = computed(() => containerStateOptions.map(o => ({ ...o, label: $t(o.label) })));

function buildFilter(): Api.Aiplatform.WorkspaceFilter {
  const filter: Api.Aiplatform.WorkspaceFilter = {};
  if (model.desired !== null) filter.desired = model.desired;
  if (model.actual !== null) filter.actual = model.actual;
  return filter;
}

function handleSubmit() {
  emit('search', buildFilter());
}

function handleReset() {
  model.desired = null;
  model.actual = null;
  emit('search', {});
}
</script>

<template>
  <NCard :title="$t('page.aiplatform.workspace.title')" :bordered="false" size="small" class="card-wrapper">
    <NForm label-placement="left" :show-feedback="false">
      <NGrid x-gap="12px" y-gap="12px" item-responsive responsive="screen" cols="1 s:2 m:3">
        <NFormItemGi span="1" :label="$t('page.aiplatform.workspace.desiredState')" path="desired">
          <NSelect
            v-model:value="model.desired"
            :options="desiredSelectOptions"
            :placeholder="$t('page.aiplatform.workspace.form.desiredPlaceholder')"
            clearable
          />
        </NFormItemGi>
        <NFormItemGi span="1" :label="$t('page.aiplatform.workspace.containerState')" path="actual">
          <NSelect
            v-model:value="model.actual"
            :options="actualSelectOptions"
            :placeholder="$t('page.aiplatform.workspace.form.actualPlaceholder')"
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
