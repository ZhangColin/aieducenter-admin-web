<script setup lang="tsx">
import { ref, watch } from 'vue';
import { NButton } from 'naive-ui';
import { enableStatusRecord } from '@/constants/business';
import { fetchDisableApp, fetchEnableApp, fetchGetAppList } from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { defaultTransform, useNaivePaginatedTable } from '@/hooks/common/table';
import { $t } from '@/locales';
import { formatDateTime } from '@/utils/common';
import StatusSwitch from '@/views/manage/components/status-switch.vue';
import AppCreateModal from './modules/app-create-modal.vue';
import AppDetailModal from './modules/app-detail-modal.vue';

defineOptions({
  name: 'AppList'
});

const appStore = useAppStore();

const searchParams = ref<Api.SystemManage.AppSearchParams>({
  keyword: null,
  status: null,
  page: 0,
  size: 10
});

/** 清洗搜索参数：剔除空值、保留分页；请求 page 保持 0-based */
function buildParams(p: Api.SystemManage.AppSearchParams) {
  const { keyword, status, page, size } = p;

  return {
    page,
    size,
    ...(keyword ? { keyword } : {}),
    ...(status != null ? { status } : {})
  };
}

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination, scrollX } = useNaivePaginatedTable({
  api: () => fetchGetAppList(buildParams(searchParams.value)),
  transform: response => defaultTransform(response),
  onPaginationParamsChange: params => {
    searchParams.value.page = (params.page ?? 1) - 1;
    searchParams.value.size = params.pageSize ?? 10;
  },
  columns: () => [
    {
      key: 'appCode',
      title: $t('page.manage.app.appCode'),
      align: 'center',
      minWidth: 140
    },
    {
      key: 'name',
      title: $t('page.manage.app.appName'),
      align: 'center',
      minWidth: 140
    },
    {
      key: 'description',
      title: $t('page.manage.app.description'),
      align: 'center',
      minWidth: 180,
      render: row => row.description || '-'
    },
    {
      key: 'status',
      title: $t('page.manage.app.status'),
      align: 'center',
      width: 90,
      render: row => (
        <StatusSwitch value={row.status} onConfirm={(next: number) => handleToggleStatus(row, next)} />
      )
    },
    {
      key: 'createdAt',
      title: $t('page.manage.app.createdAt'),
      align: 'center',
      width: 170,
      render: row => formatDateTime(row.createdAt)
    },
    {
      key: 'operate',
      title: $t('common.operate'),
      align: 'center',
      width: 100,
      fixed: 'right',
      render: row => (
        <div class="flex-center gap-8px">
          <NButton type="primary" ghost size="small" onClick={() => toDetail(row.id)}>
            {$t('page.manage.app.detail')}
          </NButton>
        </div>
      )
    }
  ]
});

/** create modal */
const createVisible = ref(false);

function openCreate() {
  createVisible.value = true;
}

function getRowKey(row: Api.SystemManage.AppSummary) {
  return row.id;
}

/** detail modal */
const detailModalVisible = ref(false);
const selectedAppId = ref('');
/** 创建流程注入的详情种子（与 GET /apps/{id} 同构），复用创建响应省一次请求；弹窗关闭即清，避免串到其它应用 */
const pendingDetail = ref<Api.SystemManage.AppDetail | null>(null);

function toDetail(id: string) {
  selectedAppId.value = id;
  detailModalVisible.value = true;
}

function onAppCreated(detail: Api.SystemManage.AppDetail) {
  selectedAppId.value = detail.id;
  pendingDetail.value = detail;
  detailModalVisible.value = true;
  getData();
}

/** 弹窗关闭即清种子——下次「详情」入口打开（无种子）走 GET，避免残留种子串到其它应用 */
watch(detailModalVisible, val => {
  if (!val) pendingDetail.value = null;
});

function onDetailSaved() {
  getData();
}

async function handleToggleStatus(row: Api.SystemManage.AppSummary, next: number) {
  const { error } = await (next === 1 ? fetchEnableApp : fetchDisableApp)(row.id);

  if (!error) {
    window.$message?.success?.(next === 1 ? $t('page.manage.common.enableSuccess') : $t('page.manage.common.disableSuccess'));
  }

  await getData();
}

/** search bar */
const searchKeyword = ref(searchParams.value.keyword ?? '');
const searchStatus = ref<number | null>(searchParams.value.status ?? null);

function handleSearch() {
  searchParams.value.keyword = searchKeyword.value || null;
  searchParams.value.status = searchStatus.value;
  getDataByPage(1);
}

function handleReset() {
  searchKeyword.value = '';
  searchStatus.value = null;
  searchParams.value.keyword = null;
  searchParams.value.status = null;
  getDataByPage(1);
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <NCard :bordered="false" size="small" class="card-wrapper">
      <NForm label-placement="left" :label-width="70">
        <NGrid responsive="screen" item-responsive>
          <NFormItemGi span="24 s:12 m:8" :label="$t('page.manage.app.keyword')" class="pr-24px">
            <NInput v-model:value="searchKeyword" :placeholder="$t('page.manage.app.form.keyword')" clearable />
          </NFormItemGi>
          <NFormItemGi span="24 s:12 m:8" :label="$t('page.manage.app.status')" class="pr-24px">
            <NSelect
              v-model:value="searchStatus"
              :options="[
                { label: $t(enableStatusRecord[1]), value: 1 },
                { label: $t(enableStatusRecord[0]), value: 0 }
              ]"
              :placeholder="$t('page.manage.app.status')"
              clearable
            />
          </NFormItemGi>
          <NFormItemGi span="24 m:8" class="pr-24px">
            <NSpace class="w-full" justify="end">
              <NButton @click="handleReset">
                <template #icon>
                  <icon-ic-round-refresh class="text-icon" />
                </template>
                {{ $t('common.reset') }}
              </NButton>
              <NButton type="primary" ghost @click="handleSearch">
                <template #icon>
                  <icon-ic-round-search class="text-icon" />
                </template>
                {{ $t('common.search') }}
              </NButton>
            </NSpace>
          </NFormItemGi>
        </NGrid>
      </NForm>
    </NCard>
    <NCard :title="$t('page.manage.app.title')" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :hide-delete="true"
          :loading="loading"
          @add="openCreate"
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
    <AppCreateModal v-model:visible="createVisible" @created="onAppCreated" />
    <AppDetailModal v-model:visible="detailModalVisible" :app-id="selectedAppId" :initial-detail="pendingDetail" @saved="onDetailSaved" />
  </div>
</template>

<style scoped></style>
