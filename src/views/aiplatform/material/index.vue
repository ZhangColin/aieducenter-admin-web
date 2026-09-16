<script setup lang="tsx">
/**
 * AI 平台知识素材列表页（#63，#56 六域 T7）。
 *
 * 治理工作面：列表 NDataTable（flex-height + sm:h-full）+ 筛选平铺（status 单选/沉淀时间闭区间/
 * 来源项目 id 精确）。停用⇄启用按状态门控切换（启用态行只给停用、停用态行只给启用——可逆开关；
 * 重复操作幂等由服务端兜底）+ 删除（不可逆治理移除，$dialog 二次确认）。写回执是 summary——
 * 开着抽屉时 reload 二次回读（区别于沙箱域回执直填）；删除成功若抽屉正开在同目标则随行关闭
 * （素材已不可见，详情 404）。分页全链 1-based 直传零 ±1。
 */
import { ref } from 'vue';
import { NButton, NTag } from 'naive-ui';
import { materialStatusTagColor, materialWriteAuth } from '@/constants/aiplatform';
import {
  fetchDeleteAiplatformMaterial,
  fetchDisableAiplatformMaterial,
  fetchEnableAiplatformMaterial,
  fetchGetAiplatformMaterialList
} from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { useAuth } from '@/hooks/business/auth';
import { defaultTransform, useNaivePaginatedTable } from '@/hooks/common/table';
import { $t } from '@/locales';
import { formatDateTime } from '@/utils/common';
import AiplatformMaterialSearch from './modules/material-search.vue';
import MaterialDetailDrawer from './modules/material-detail-drawer.vue';

defineOptions({ name: 'AiplatformMaterial' });

const appStore = useAppStore();
const { hasAuth } = useAuth();

/** 三写请求映射（收口单点；确认文案/成功文案走 i18n `action.*` 同键）。 */
const WRITE_FETCH: Record<Api.Aiplatform.MaterialAction, (id: string) => ReturnType<typeof fetchDisableAiplatformMaterial>> = {
  disable: fetchDisableAiplatformMaterial,
  enable: fetchEnableAiplatformMaterial,
  delete: fetchDeleteAiplatformMaterial
};

/** 搜索参数 = 分页 + 当前筛选（MaterialSearch 清洗后并入）。 */
const searchParams = ref<Api.Aiplatform.MaterialSearchParams>({ page: 1, size: 10 });

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination, scrollX } =
  useNaivePaginatedTable({
    api: () => fetchGetAiplatformMaterialList(searchParams.value),
    transform: response => defaultTransform(response),
    onPaginationParamsChange: params => {
      searchParams.value.page = params.page ?? 1;
      searchParams.value.size = params.pageSize ?? 10;
    },
    columns: () => [
      {
        key: 'id',
        title: $t('page.aiplatform.material.id'),
        align: 'center',
        width: 170,
        render: row => <span class="font-mono">{row.id}</span>
      },
      {
        key: 'kind',
        title: $t('page.aiplatform.material.kind'),
        align: 'center',
        width: 80,
        render: row => row.kind
      },
      {
        key: 'title',
        title: $t('page.aiplatform.material.materialTitle'),
        align: 'center',
        minWidth: 160,
        render: row => row.title
      },
      {
        key: 'project',
        title: $t('page.aiplatform.material.project'),
        align: 'center',
        minWidth: 150,
        render: row => (
          <div class="flex flex-col">
            <span>{row.projectName}</span>
            <span class="font-mono text-12px text-gray-400">{row.projectId}</span>
          </div>
        )
      },
      {
        key: 'status',
        title: $t('page.aiplatform.material.status'),
        align: 'center',
        width: 90,
        render: row => (
          <NTag type={materialStatusTagColor[row.status]} size="small">
            {row.statusName}
          </NTag>
        )
      },
      {
        key: 'sunkAt',
        title: $t('page.aiplatform.material.sunkAt'),
        align: 'center',
        width: 160,
        render: row => formatDateTime(row.sunkAt)
      },
      {
        key: 'operator',
        title: $t('page.aiplatform.material.operator'),
        align: 'center',
        width: 150,
        render: row =>
          row.operatorName ? (
            <div class="flex flex-col">
              <span>{row.operatorName}</span>
              <span class="font-mono text-12px text-gray-400">{row.operatorId}</span>
            </div>
          ) : (
            '-'
          )
      },
      {
        key: 'operate',
        title: $t('common.operate'),
        align: 'center',
        width: 210,
        fixed: 'right',
        render: row => {
          // 停用⇄启用按状态门控切换：启用态行给停用、停用态行给启用（不可达一侧不出现）
          const toggle: Api.Aiplatform.MaterialAction = row.status === 1 ? 'disable' : 'enable';
          const canToggle = hasAuth(materialWriteAuth[toggle]);
          const canDelete = hasAuth(materialWriteAuth.delete);
          return (
            <div class="flex-center gap-8px whitespace-nowrap">
              <NButton type="primary" ghost size="small" onClick={() => openDetail(row.id)}>
                {$t('page.aiplatform.material.detail')}
              </NButton>
              {canToggle && (
                <NButton type={toggle === 'disable' ? 'warning' : 'primary'} ghost size="small" onClick={() => handleAction(toggle, row.id, row.title)}>
                  {$t(`page.aiplatform.material.action.${toggle}`)}
                </NButton>
              )}
              {canDelete && (
                <NButton type="error" ghost size="small" onClick={() => handleAction('delete', row.id, row.title)}>
                  {$t('page.aiplatform.material.action.delete')}
                </NButton>
              )}
            </div>
          );
        }
      }
    ]
  });

function getRowKey(row: Api.Aiplatform.MaterialSummary) {
  return row.id;
}

/** 接筛选条提交：重置筛选字段（保留分页）、并入新筛选，回到第一页。 */
function handleSearch(filter: Api.Aiplatform.MaterialFilter) {
  searchParams.value = { page: searchParams.value.page, size: searchParams.value.size, ...filter };
  getDataByPage(1);
}

/* ---- 详情抽屉 ---- */
const drawerVisible = ref(false);
const selectedMaterialId = ref('');
const drawerRef = ref<InstanceType<typeof MaterialDetailDrawer> | null>(null);

function openDetail(materialId: string) {
  selectedMaterialId.value = materialId;
  drawerVisible.value = true;
}

/**
 * 三写单点收口：$dialog.warning 二次确认（三写共 warning，workspace/price_entry 同型）→ 成功
 * toast + 抽屉回读（回执是 summary 无 content）+ 列表刷新；删除成功且抽屉正开在同目标则关闭
 * （素材已不可见）。失败走 onError 统一透传 toast，此处不吞。
 */
function handleAction(action: Api.Aiplatform.MaterialAction, materialId: string, title: string) {
  window.$dialog?.warning({
    title: $t(`page.aiplatform.material.confirm.${action}`),
    content: `${$t('page.aiplatform.material.confirm.target', { title })}\n${$t(`page.aiplatform.material.confirm.${action}Tip`)}`,
    positiveText: $t('common.confirm'),
    negativeText: $t('common.cancel'),
    onPositiveClick: async () => {
      const { error } = await WRITE_FETCH[action](materialId);
      if (!error) {
        window.$message?.success($t(`page.aiplatform.material.success.${action}`));
        if (drawerVisible.value && selectedMaterialId.value === materialId) {
          if (action === 'delete') {
            drawerVisible.value = false;
          } else {
            drawerRef.value?.reload();
          }
        }
        getData();
      }
    }
  });
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <AiplatformMaterialSearch @search="handleSearch" />
    <NCard :title="$t('page.aiplatform.material.title')" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
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

    <!-- 详情抽屉（元数据 + 素材全文 + 按状态三写） -->
    <MaterialDetailDrawer
      ref="drawerRef"
      v-model:visible="drawerVisible"
      :material-id="selectedMaterialId"
      @action="handleAction"
    />
  </div>
</template>
