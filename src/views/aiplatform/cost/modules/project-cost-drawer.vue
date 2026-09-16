<script setup lang="ts">
/**
 * 项目成本下钻抽屉（#61）——行点击打开，按当前时间窗拉单项目分解：
 * 五档 tile + byModel/byAgentKind 双柱状（复用总览同款组件）+ 未配价档位清单（无 token 计数——
 * bySubject 口径，档位用量汇总走全局 unpriced 端点）。查无此号/无用量 = 全零 total + 空结构
 * （明确空态非 404），如实渲染零值即「该窗口无此项目用量」。
 *
 * 「按币种成本」（cost{}）暂缓渲染（REQ-20 #75）——留位不建 UI，空对象不报错。
 */
import { computed, ref, watch } from 'vue';
import { fetchGetAiplatformProjectCostDetail } from '@/service/api';
import { $t } from '@/locales';
import { formatDateTime } from '@/utils/common';
import { agentKindUsageRows, modelUsageRows } from './breakdown';
import TokenUsageTiles from './token-usage-tiles.vue';
import BreakdownChart from './breakdown-chart.vue';

defineOptions({ name: 'AiplatformProjectCostDrawer' });

const props = defineProps<{
  projectId: string;
  /** 当前时间窗（与总览同窗下钻；序列化后的 from/to Instant UTC 串） */
  window: Api.Aiplatform.CostWindowParams;
}>();

const visible = defineModel<boolean>('visible', { default: false });

const detail = ref<Api.Aiplatform.ProjectCostDetail | null>(null);
const loading = ref(false);
const loadError = ref(false);

async function loadDetail() {
  loading.value = true;
  loadError.value = false;
  const { data, error } = await fetchGetAiplatformProjectCostDetail(props.projectId, props.window);
  loading.value = false;
  if (!error) detail.value = data;
  else loadError.value = true;
}

watch(visible, val => {
  if (val) {
    detail.value = null;
    loadDetail();
  }
});

/** 双分解图表行（口径标签合成单点 breakdown.ts，与总览页共用）。 */
const byModelRows = computed(() => modelUsageRows(detail.value?.byModel ?? []));
const byAgentKindRows = computed(() => agentKindUsageRows(detail.value?.byAgentKind ?? []));
</script>

<template>
  <NDrawer v-model:show="visible" :width="760">
    <NDrawerContent :title="$t('page.aiplatform.cost.drawer.detailTitle')" closable>
      <div class="flex-col-stretch gap-16px">
        <!-- 项目标识 + 窗口回显（from/to 原样回显契约串） -->
        <div class="grid grid-cols-[90px_1fr] gap-x-16px gap-y-10px text-14px">
          <span class="text-right text-#999">{{ $t('page.aiplatform.cost.projects.projectId') }}</span>
          <span class="font-mono">{{ projectId }}</span>
          <span class="text-right text-#999">{{ $t('page.aiplatform.cost.window') }}</span>
          <span class="font-mono">{{ formatDateTime(props.window.from) }} ~ {{ formatDateTime(props.window.to) }}</span>
        </div>

        <!-- 五档 tile（加载中 spin / 失败 toast 后零值空态如实呈现） -->
        <div>
          <div class="mb-8px font-600">{{ $t('page.aiplatform.cost.overview') }}</div>
          <TokenUsageTiles :total="detail?.total ?? null" :loading="loading" />
        </div>

        <!-- 未配价档位（无 token 计数口径；空=构成完整） -->
        <div>
          <div class="mb-8px font-600">{{ $t('page.aiplatform.cost.drawer.unpricedTitle') }}</div>
          <div v-if="loading" class="flex-center h-40px">
            <NSpin />
          </div>
          <NEmpty v-else-if="loadError" size="small" :description="$t('page.aiplatform.cost.states.loadFailed')" />
          <NEmpty
            v-else-if="(detail?.unpriced ?? []).length === 0"
            size="small"
            :description="$t('page.aiplatform.cost.drawer.unpricedEmpty')"
          />
          <div v-else class="flex flex-wrap gap-8px">
            <NTag v-for="(item, i) in detail?.unpriced" :key="i" type="warning" size="small">
              <span class="font-mono">{{ item.provider }}/{{ item.model }}</span>
              <span class="ml-4px">{{ item.tokenKindName }}</span>
            </NTag>
          </div>
        </div>

        <!-- 双柱状（复用总览同款组件） -->
        <BreakdownChart
          :title="$t('page.aiplatform.cost.byModel')"
          :rows="byModelRows"
          :loading="loading"
          :error="loadError"
        />
        <BreakdownChart
          :title="$t('page.aiplatform.cost.byAgentKind')"
          :rows="byAgentKindRows"
          :loading="loading"
          :error="loadError"
        />
      </div>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped></style>
