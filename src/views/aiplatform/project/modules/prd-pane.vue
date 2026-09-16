<script setup lang="ts">
/**
 * 项目详情抽屉·PRD pane（#58）——PRD 全文（工作区 docs/PRD.md 直读，v1 无版本链只最新版）。
 *
 * 未产出（404 PRJ_015）走 @sa/axios onError 透传 toast 兜底，pane 内 NEmpty——
 * 与订单域「错误态不写防御性处理」先例一致（#56 grilling：不按 provider 业务码分支）。
 */
import { onMounted, ref } from 'vue';
import { fetchGetAiplatformProjectPrd } from '@/service/api';
import { $t } from '@/locales';
import { formatDateTime } from '@/utils/common';

defineOptions({ name: 'ProjectPrdPane' });

const props = defineProps<{
  projectId: string;
}>();

const prd = ref<Api.Aiplatform.PrdContent | null>(null);
const loading = ref(false);

async function load() {
  loading.value = true;
  const { data, error } = await fetchGetAiplatformProjectPrd(props.projectId);
  loading.value = false;
  if (!error) prd.value = data;
}

onMounted(load);
</script>

<template>
  <div v-if="loading" class="flex-center min-h-300px">
    <NSpin />
  </div>
  <template v-else-if="prd">
    <div class="mb-8px text-12px text-#999">
      {{ $t('page.aiplatform.project.drawer.prdUpdatedAt') }}：{{ formatDateTime(prd.updatedAt) }}
    </div>
    <pre class="max-h-60vh overflow-auto whitespace-pre-wrap rounded-8px bg-#f5f5f5 p-12px text-13px leading-6">{{ prd.content }}</pre>
  </template>
  <NEmpty v-else :description="$t('page.aiplatform.project.drawer.prdEmpty')" />
</template>
