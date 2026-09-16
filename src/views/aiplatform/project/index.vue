<script setup lang="tsx">
/**
 * AI 平台项目列表页（#58，#56 六域 T2）。
 *
 * 列表 NDataTable（flex-height + sm:h-full）+ 筛选平铺（status 三档单选/创建区间/externalId/projectId 精确）+
 * 行内「详情」开抽屉四 tab（基本信息/对话史/PRD/版本）。项目域纯读——无写操作；
 * 归档项目照读（archived 布尔列直出，不特殊处理）。分页全链 1-based 直传零 ±1。
 */
import { ref } from 'vue';
import { NButton, NTag } from 'naive-ui';
import { projectStatusTagColor } from '@/constants/aiplatform';
import { fetchGetAiplatformProjectList } from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { defaultTransform, useNaivePaginatedTable } from '@/hooks/common/table';
import { $t } from '@/locales';
import { formatDateTime } from '@/utils/common';
import AiplatformProjectSearch from './modules/project-search.vue';
import ProjectDetailDrawer from './modules/project-detail-drawer.vue';

defineOptions({ name: 'AiplatformProject' });

const appStore = useAppStore();

/** 搜索参数 = 分页 + 当前筛选（ProjectSearch 清洗后并入）。 */
const searchParams = ref<Api.Aiplatform.ProjectSearchParams>({ page: 1, size: 10 });

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination, scrollX } =
  useNaivePaginatedTable({
    api: () => fetchGetAiplatformProjectList(searchParams.value),
    transform: response => defaultTransform(response),
    onPaginationParamsChange: params => {
      searchParams.value.page = params.page ?? 1;
      searchParams.value.size = params.pageSize ?? 10;
    },
    columns: () => [
      {
        key: 'id',
        title: $t('page.aiplatform.project.projectId'),
        align: 'center',
        width: 170,
        render: row => <span class="font-mono">{row.id}</span>
      },
      {
        key: 'name',
        title: $t('page.aiplatform.project.name'),
        align: 'center',
        minWidth: 150,
        render: row => row.name ?? '-'
      },
      {
        key: 'ownerDisplayName',
        title: $t('page.aiplatform.project.owner'),
        align: 'center',
        width: 110,
        render: row => row.ownerDisplayName ?? '-'
      },
      {
        key: 'type',
        title: $t('page.aiplatform.project.type'),
        align: 'center',
        width: 90,
        render: row => row.typeName
      },
      {
        key: 'status',
        title: $t('page.aiplatform.project.status'),
        align: 'center',
        width: 100,
        render: row => (
          <NTag type={projectStatusTagColor[row.status]} size="small">
            {row.statusName}
          </NTag>
        )
      },
      {
        key: 'archived',
        title: $t('page.aiplatform.project.archived'),
        align: 'center',
        width: 80,
        render: row => (row.archived ? $t('page.aiplatform.project.archivedYes') : $t('page.aiplatform.project.archivedNo'))
      },
      {
        key: 'createdAt',
        title: $t('page.aiplatform.project.createdAt'),
        align: 'center',
        width: 160,
        render: row => formatDateTime(row.createdAt)
      },
      {
        key: 'updatedAt',
        title: $t('page.aiplatform.project.updatedAt'),
        align: 'center',
        width: 160,
        render: row => formatDateTime(row.updatedAt)
      },
      {
        key: 'operate',
        title: $t('common.operate'),
        align: 'center',
        width: 100,
        fixed: 'right',
        render: row => (
          <NButton type="primary" ghost size="small" onClick={() => openDetail(row.id)}>
            {$t('page.aiplatform.project.detail')}
          </NButton>
        )
      }
    ]
  });

function getRowKey(row: Api.Aiplatform.ProjectSummary) {
  return row.id;
}

/** 接筛选条提交：重置筛选字段（保留分页）、并入新筛选，回到第一页。 */
function handleSearch(filter: Api.Aiplatform.ProjectFilter) {
  searchParams.value = { page: searchParams.value.page, size: searchParams.value.size, ...filter };
  getDataByPage(1);
}

/* ---- 详情抽屉（四 tab：基本信息/对话史/PRD/版本） ---- */
const drawerVisible = ref(false);
const selectedProjectId = ref('');

function openDetail(projectId: string) {
  selectedProjectId.value = projectId;
  drawerVisible.value = true;
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <AiplatformProjectSearch @search="handleSearch" />
    <NCard :title="$t('page.aiplatform.project.title')" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
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
        :flex-height="!appStore.isMobile"
        class="sm:h-full"
        :scroll-x="scrollX"
        :loading="loading"
        remote
        :row-key="getRowKey"
        :pagination="mobilePagination"
      />
    </NCard>

    <!-- 详情抽屉：基本信息（订单引用/成本指针/工作区引用）+ 对话史 + PRD + 版本 -->
    <ProjectDetailDrawer v-model:visible="drawerVisible" :project-id="selectedProjectId" />
  </div>
</template>
