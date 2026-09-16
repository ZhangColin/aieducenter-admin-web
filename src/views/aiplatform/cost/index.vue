<script setup lang="tsx">
/**
 * AI 平台成本中心 dashboard（#61，#56 六域 T5）——单页四段（复用 payment/stats 的 widget + echarts 范式）：
 * 时间窗 → token 五档 tile → byModel/byAgentKind 双柱状 → unpriced 警示卡 → 项目成本表 + 行点击下钻抽屉。
 *
 * 时间窗契约（BFF #67 拍板）：from/to **必填**（半开 [from,to)、ISO-8601 Instant UTC 带 Z）、
 * BFF 不设默认窗口——前端显式传窗（默认最近 30 自然日，变更即重查）；缺任一侧不发起任何请求
 * （windowQuery 归 null，四段全部停查、整页出「请选择时间窗」提示）。
 * 五档 token 为 primitive long → JSON 数字（formatCount 千分位）；「按币种成本」（cost{}）
 * 暂缓渲染留位（REQ-20 #75），不因空对象报错。
 * 项目成本表排序服务端定死成本降序（全未配价排后 allUnpriced=true 标注）——前端不重排、
 * 分页 1-based 直传零 ±1；行点击下钻与总览同窗。
 */
import { computed, onMounted, ref, watch } from 'vue';
import dayjs from 'dayjs';
import { NTag } from 'naive-ui';
import { fetchGetAiplatformCostOverview, fetchGetAiplatformCostUnpriced, fetchGetAiplatformProjectCostList } from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { defaultTransform, useNaivePaginatedTable } from '@/hooks/common/table';
import { $t } from '@/locales';
import { TOKEN_TIER_KEYS, tokenTierLabel } from '@/constants/aiplatform';
import { formatCount, tsToUtcInstant } from '@/utils/common';
import { agentKindUsageRows, modelUsageRows } from './modules/breakdown';
import TokenUsageTiles from './modules/token-usage-tiles.vue';
import BreakdownChart from './modules/breakdown-chart.vue';
import UnpricedAlert from './modules/unpriced-alert.vue';
import ProjectCostDrawer from './modules/project-cost-drawer.vue';

defineOptions({ name: 'AiplatformCost' });

const appStore = useAppStore();

/* ---- 时间窗（唯一查询驱动源：变更即重查全部四口） ---- */

/** 默认窗：最近 30 自然日（构造即成对非空——searchParams/currentWindow 初值由它派生，杜绝空窗兜底分支）。 */
const defaultRange: [number, number] = [dayjs().subtract(29, 'day').startOf('day').valueOf(), dayjs().endOf('day').valueOf()];

const windowRange = ref<[number, number] | null>(defaultRange);

function serializeWindow(range: [number, number]): Api.Aiplatform.CostWindowParams {
  return { from: tsToUtcInstant(range[0]), to: tsToUtcInstant(range[1]) };
}

/** 序列化时间窗；缺任一侧 → null（不发起任何请求）。 */
const windowQuery = computed<Api.Aiplatform.CostWindowParams | null>(() => {
  const range = windowRange.value;
  if (!range || range[0] == null || range[1] == null) return null;
  return serializeWindow(range);
});

/** 当前生效窗（非空不变式：初值=默认窗，watch 仅在非空时更新；行可点必有窗——抽屉取此值，无兜底分支）。 */
const currentWindow = ref<Api.Aiplatform.CostWindowParams>(serializeWindow(defaultRange));

/** 总览 + unpriced（图表/警示两段；表在 useNaivePaginatedTable 内自管理）。 */
const overview = ref<Api.Aiplatform.CostOverview | null>(null);
const overviewLoading = ref(false);
const overviewError = ref(false);
const unpricedItems = ref<Api.Aiplatform.UnpricedTierUsage[]>([]);
const unpricedLoading = ref(false);
const unpricedError = ref(false);

async function loadWindowData() {
  const params = windowQuery.value;
  if (!params) return;
  overviewLoading.value = true;
  overviewError.value = false;
  unpricedLoading.value = true;
  unpricedError.value = false;
  const [overviewRes, unpricedRes] = await Promise.all([
    fetchGetAiplatformCostOverview(params),
    fetchGetAiplatformCostUnpriced(params)
  ]);
  overviewLoading.value = false;
  unpricedLoading.value = false;
  if (!overviewRes.error) overview.value = overviewRes.data;
  else overviewError.value = true;
  if (!unpricedRes.error) unpricedItems.value = unpricedRes.data?.items ?? [];
  else unpricedError.value = true;
}

/* ---- 项目成本表（成本降序服务端定死；分页 1-based 直传；行点击下钻） ---- */

/**
 * 表查询参数 = 当前窗 + 分页。初值带默认窗（useNaivePaginatedTable 在 setup 期即首发——
 * 空窗首发必撞 BFF 缺参 400，故窗先就位再建 hook）；窗口变更由 watch 并入。
 */
const searchParams = ref<Api.Aiplatform.CostProjectSearchParams>({ ...currentWindow.value, page: 1, size: 10 });

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination, scrollX } =
  useNaivePaginatedTable({
    api: () => fetchGetAiplatformProjectCostList(searchParams.value),
    transform: response => defaultTransform(response),
    onPaginationParamsChange: params => {
      searchParams.value.page = params.page ?? 1;
      searchParams.value.size = params.pageSize ?? 10;
    },
    columns: () => [
      {
        key: 'projectId',
        title: $t('page.aiplatform.cost.projects.projectId'),
        align: 'center',
        width: 210,
        render: row => <span class="font-mono">{row.projectId}</span>
      },
      ...TOKEN_TIER_KEYS.map(key => ({
        key,
        title: $t(tokenTierLabel[key]),
        align: 'right' as const,
        width: 110,
        render: (row: Api.Aiplatform.ProjectCost) => formatCount(row.total[key])
      })),
      {
        key: 'allUnpriced',
        title: $t('page.aiplatform.cost.projects.pricing'),
        align: 'center',
        width: 100,
        render: row =>
          row.allUnpriced ? (
            <NTag type="warning" size="small">
              {$t('page.aiplatform.cost.projects.allUnpriced')}
            </NTag>
          ) : (
            <NTag type="success" size="small">
              {$t('page.aiplatform.cost.projects.priced')}
            </NTag>
          )
      }
    ]
  });

function getRowKey(row: Api.Aiplatform.ProjectCost) {
  return row.projectId;
}

/** 行点击 → 下钻抽屉（整行可点；与总览同窗）。 */
const rowProps = (row: Api.Aiplatform.ProjectCost) => ({
  style: 'cursor: pointer;',
  onClick: () => openDetail(row.projectId)
});

/* ---- 变更即重查（时间窗唯一驱动）+ 整页刷新 ---- */

/** 初始总览/unpriced（表由 hook setup 期自带首发，不重触发）。 */
onMounted(() => {
  loadWindowData();
});

/** 窗口变更 → 四口全查（缺任一侧：停查 + 整页提示态接管）。 */
watch(windowQuery, params => {
  if (!params) return;
  currentWindow.value = params;
  searchParams.value = { ...params, page: searchParams.value.page, size: searchParams.value.size };
  loadWindowData();
  getDataByPage(1);
});

function handleRefresh() {
  if (!windowQuery.value) return;
  loadWindowData();
  getData();
}

/* ---- 下钻抽屉 ---- */

const drawerVisible = ref(false);
const selectedProjectId = ref('');

function openDetail(projectId: string) {
  selectedProjectId.value = projectId;
  drawerVisible.value = true;
}

/** 总览两分解图表行（口径标签合成单点 breakdown.ts：byModel 拼 provider/model、byAgentKind null 落「—」桶）。 */
const byModelRows = computed(() => modelUsageRows(overview.value?.byModel ?? []));
const byAgentKindRows = computed(() => agentKindUsageRows(overview.value?.byAgentKind ?? []));

const gap = computed(() => (appStore.isMobile ? 0 : 16));
</script>

<template>
  <!-- 高度自然增长的滚动 dashboard（home 先例：不做 fit-viewport 截断——四段总高必超一屏，overflow-hidden 会剪掉项目表分页） -->
  <div class="flex-col-stretch gap-16px">
    <!-- 顶部时间窗（必填；变更即重查）+ 整页刷新 -->
    <NCard :title="$t('page.aiplatform.cost.title')" :bordered="false" size="small" class="card-wrapper">
      <template #header-extra>
        <NButton size="small" :loading="overviewLoading || loading" :disabled="!windowQuery" @click="handleRefresh">
          {{ $t('common.refresh') }}
        </NButton>
      </template>
      <NForm label-placement="left" inline :show-feedback="false">
        <NFormItem :label="$t('page.aiplatform.cost.window')" path="windowRange">
          <NDatePicker v-model:value="windowRange" type="datetimerange" clearable class="w-380px" />
        </NFormItem>
      </NForm>
    </NCard>

    <template v-if="windowQuery">
      <!-- token 五档 tile -->
      <NCard :bordered="false" size="small" class="card-wrapper">
        <template #header>
          <span class="font-500">{{ $t('page.aiplatform.cost.overview') }}</span>
        </template>
        <div v-if="overviewError" class="flex-center h-80px">
          <NEmpty :description="$t('page.aiplatform.cost.states.loadFailed')" />
        </div>
        <TokenUsageTiles v-else :total="overview?.total ?? null" :loading="overviewLoading" />
      </NCard>

      <!-- 双柱状（byModel / byAgentKind） -->
      <NGrid :x-gap="gap" :y-gap="16" responsive="screen" item-responsive>
        <NGi span="24 m:12">
          <BreakdownChart
            :title="$t('page.aiplatform.cost.byModel')"
            :rows="byModelRows"
            :loading="overviewLoading"
            :error="overviewError"
          />
        </NGi>
        <NGi span="24 m:12">
          <BreakdownChart
            :title="$t('page.aiplatform.cost.byAgentKind')"
            :rows="byAgentKindRows"
            :loading="overviewLoading"
            :error="overviewError"
          />
        </NGi>
      </NGrid>

      <!-- unpriced 警示卡（有则高亮/无则收起） -->
      <UnpricedAlert :items="unpricedItems" :loading="unpricedLoading" :error="unpricedError" />

      <!-- 项目成本表（成本降序 + 行点击下钻；自然高度随页滚——不 fit-viewport） -->
      <NCard :bordered="false" size="small" class="card-wrapper">
        <template #header>
          <span class="font-500">{{ $t('page.aiplatform.cost.projects.title') }}</span>
        </template>
        <template #header-extra>
          <TableHeaderOperation
            v-model:columns="columnChecks"
            :hide-add="true"
            :hide-delete="true"
            :loading="loading"
            @refresh="getData"
          />
        </template>
        <NDataTable
          :columns="columns"
          :data="data"
          size="small"
          :scroll-x="scrollX"
          :loading="loading"
          remote
          :row-key="getRowKey"
          :row-props="rowProps"
          :pagination="mobilePagination"
        />
      </NCard>

      <!-- 项目成本下钻抽屉（五档 + 双柱状 + 未配价档位；窗=当前生效窗 currentWindow） -->
      <ProjectCostDrawer v-model:visible="drawerVisible" :project-id="selectedProjectId" :window="currentWindow" />
    </template>

    <!-- 时间窗缺任一侧：四段全部停查，出整页提示态 -->
    <NCard v-else :bordered="false" size="small" class="card-wrapper">
      <div class="flex-center h-200px">
        <NEmpty :description="$t('page.aiplatform.cost.windowRequired')" />
      </div>
    </NCard>
  </div>
</template>

<style scoped></style>
