<script setup lang="tsx">
/**
 * AI 平台沙箱列表页（#60，#56 六域 T4）。
 *
 * 观测面：列表 NDataTable（flex-height + sm:h-full）+ 筛选平铺（desired/actual 单选可组合——
 * 运行+无容器组合即捞漂移清单）。期望态/实态两列如实分示（漂移一眼可见，不做端端比对高亮）。
 * 四写（唤醒/休眠/重建/封存）按态门控（availableWorkspaceActions 单点：非 DEV 全拒；重活三写
 * 拒置备中/封存态）+ hasAuth 逐写码；$dialog 二次确认收口本页单点（行下拉与抽屉共用）；
 * 写响应＝动作后的观测详情——开着即同目标（抽屉 modal 遮罩，行触发时抽屉必关），直填抽屉免二次回读。
 * 分页全链 1-based 直传零 ±1。
 */
import { ref } from 'vue';
import { NButton, NDropdown, NTag } from 'naive-ui';
import type { DropdownOption } from 'naive-ui';
import {
  availableWorkspaceActions,
  containerStateTagColor,
  desiredStateTagColor,
  provisioningStatusTagColor,
  workspaceWriteAuth
} from '@/constants/aiplatform';
import {
  fetchGetAiplatformWorkspaceList,
  fetchHibernateAiplatformWorkspace,
  fetchRebuildAiplatformWorkspace,
  fetchSealAiplatformWorkspace,
  fetchWakeAiplatformWorkspace
} from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { useAuth } from '@/hooks/business/auth';
import { defaultTransform, useNaivePaginatedTable } from '@/hooks/common/table';
import { $t } from '@/locales';
import { formatDateTime, formatFileSize } from '@/utils/common';
import AiplatformWorkspaceSearch from './modules/workspace-search.vue';
import WorkspaceDetailDrawer from './modules/workspace-detail-drawer.vue';

defineOptions({ name: 'AiplatformWorkspace' });

const appStore = useAppStore();
const { hasAuth } = useAuth();

/** 写权限码单点在 constants（与门控 helper 同居）；请求映射本页持有（收口单点）。 */
const WRITE_FETCH: Record<Api.Aiplatform.WorkspaceAction, (id: string) => ReturnType<typeof fetchWakeAiplatformWorkspace>> = {
  wake: fetchWakeAiplatformWorkspace,
  hibernate: fetchHibernateAiplatformWorkspace,
  rebuild: fetchRebuildAiplatformWorkspace,
  seal: fetchSealAiplatformWorkspace
};

/** 搜索参数 = 分页 + 当前筛选（WorkspaceSearch 清洗后并入）。 */
const searchParams = ref<Api.Aiplatform.WorkspaceSearchParams>({ page: 1, size: 10 });

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination, scrollX } =
  useNaivePaginatedTable({
    api: () => fetchGetAiplatformWorkspaceList(searchParams.value),
    transform: response => defaultTransform(response),
    onPaginationParamsChange: params => {
      searchParams.value.page = params.page ?? 1;
      searchParams.value.size = params.pageSize ?? 10;
    },
    columns: () => [
      {
        key: 'workspaceId',
        title: $t('page.aiplatform.workspace.workspaceId'),
        align: 'center',
        width: 170,
        render: row => <span class="font-mono">{row.workspaceId}</span>
      },
      {
        key: 'containerName',
        title: $t('page.aiplatform.workspace.containerName'),
        align: 'center',
        minWidth: 180,
        render: row => <span class="font-mono">{row.containerName}</span>
      },
      {
        key: 'kind',
        title: $t('page.aiplatform.workspace.kind'),
        align: 'center',
        width: 80,
        render: row => row.kindName
      },
      {
        key: 'status',
        title: $t('page.aiplatform.workspace.status'),
        align: 'center',
        width: 90,
        render: row => (
          <NTag type={provisioningStatusTagColor[row.status]} size="small">
            {row.statusName}
          </NTag>
        )
      },
      {
        key: 'desiredState',
        title: $t('page.aiplatform.workspace.desiredState'),
        align: 'center',
        width: 90,
        render: row => (
          <NTag type={desiredStateTagColor[row.desiredState]} size="small">
            {row.desiredStateName}
          </NTag>
        )
      },
      {
        key: 'containerState',
        title: $t('page.aiplatform.workspace.containerState'),
        align: 'center',
        width: 90,
        render: row => (
          <NTag type={containerStateTagColor[row.containerState]} size="small">
            {row.containerStateName}
          </NTag>
        )
      },
      {
        key: 'lastTouchAt',
        title: $t('page.aiplatform.workspace.lastTouchAt'),
        align: 'center',
        width: 160,
        render: row => formatDateTime(row.lastTouchAt)
      },
      {
        key: 'volumeSizeBytes',
        title: $t('page.aiplatform.workspace.volumeSize'),
        align: 'right',
        width: 100,
        render: row => formatFileSize(row.volumeSizeBytes)
      },
      {
        key: 'sealedAt',
        title: $t('page.aiplatform.workspace.sealedAt'),
        align: 'center',
        width: 160,
        render: row => formatDateTime(row.sealedAt)
      },
      {
        key: 'archiveSizeBytes',
        title: $t('page.aiplatform.workspace.archiveSize'),
        align: 'right',
        width: 100,
        render: row => formatFileSize(row.archiveSizeBytes)
      },
      {
        key: 'project',
        title: $t('page.aiplatform.workspace.drawer.project'),
        align: 'center',
        minWidth: 150,
        render: row =>
          row.project ? (
            <span>
              {row.project.name}
              {row.project.archived ? `（${$t('page.aiplatform.workspace.drawer.projectArchived')}）` : ''}
            </span>
          ) : (
            '-'
          )
      },
      {
        key: 'operate',
        title: $t('common.operate'),
        align: 'center',
        width: 170,
        fixed: 'right',
        render: row => {
          const opts = rowOptions(row);
          return (
            <div class="flex-center gap-8px whitespace-nowrap">
              <NButton type="primary" ghost size="small" onClick={() => openDetail(row.workspaceId)}>
                {$t('page.aiplatform.workspace.detail')}
              </NButton>
              {/* 无可用写操作（非 DEV/无写权限）时不渲染下拉触发器——不可达操作不出现（订单域先例） */}
              {opts.length > 0 && (
                <NDropdown trigger="click" options={opts} onSelect={key => onRowAction(row.workspaceId, key as Api.Aiplatform.WorkspaceAction)}>
                  <NButton size="small">{$t('page.aiplatform.workspace.more')}</NButton>
                </NDropdown>
              )}
            </div>
          );
        }
      }
    ]
  });

function getRowKey(row: Api.Aiplatform.WorkspaceSummary) {
  return row.workspaceId;
}

/** 行下拉选项 = 按态门控（单点 helper）∩ 逐写 hasAuth。 */
function rowOptions(row: Api.Aiplatform.WorkspaceSummary): DropdownOption[] {
  return availableWorkspaceActions(row)
    .filter(action => hasAuth(workspaceWriteAuth[action]))
    .map(action => ({ key: action, label: $t(`page.aiplatform.workspace.action.${action}`) }));
}

/** 接筛选条提交：重置筛选字段（保留分页）、并入新筛选，回到第一页。 */
function handleSearch(filter: Api.Aiplatform.WorkspaceFilter) {
  searchParams.value = { page: searchParams.value.page, size: searchParams.value.size, ...filter };
  getDataByPage(1);
}

/* ---- 详情抽屉 ---- */
const drawerVisible = ref(false);
const selectedWorkspaceId = ref('');
const drawerRef = ref<InstanceType<typeof WorkspaceDetailDrawer> | null>(null);

function openDetail(workspaceId: string) {
  selectedWorkspaceId.value = workspaceId;
  drawerVisible.value = true;
}

function onRowAction(workspaceId: string, action: Api.Aiplatform.WorkspaceAction) {
  const row = data.value.find(item => item.workspaceId === workspaceId);
  if (!row) return;
  handleAction(action, workspaceId, row.containerName);
}

/**
 * 四写单点收口：$dialog 二次确认（确认按钮等请求——深度唤醒/封存分钟级，loading 态诚实）→
 * 成功 toast + 抽屉直填（响应＝动作后观测详情；开着即同目标——抽屉 modal 遮罩，行触发时抽屉必关）+ 列表刷新。
 * 失败走 onError 统一透传 toast，此处不吞。
 */
function handleAction(action: Api.Aiplatform.WorkspaceAction, workspaceId: string, containerName: string) {
  window.$dialog?.warning({
    title: $t(`page.aiplatform.workspace.confirm.${action}`),
    content: `${$t('page.aiplatform.workspace.confirm.target', { containerName })}\n${$t(`page.aiplatform.workspace.confirm.${action}Tip`)}`,
    positiveText: $t('common.confirm'),
    negativeText: $t('common.cancel'),
    onPositiveClick: async () => {
      const { data: after, error } = await WRITE_FETCH[action](workspaceId);
      if (!error && after) {
        window.$message?.success($t(`page.aiplatform.workspace.success.${action}`));
        if (drawerVisible.value && selectedWorkspaceId.value === workspaceId) {
          drawerRef.value?.applyDetail(after);
        }
        getData();
      }
    }
  });
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <AiplatformWorkspaceSearch @search="handleSearch" />
    <NCard :title="$t('page.aiplatform.workspace.title')" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
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

    <!-- 详情抽屉（全量字段 + 中间件资源 + 项目引用 + 按态四写） -->
    <WorkspaceDetailDrawer
      ref="drawerRef"
      v-model:visible="drawerVisible"
      :workspace-id="selectedWorkspaceId"
      @action="handleAction"
    />
  </div>
</template>
