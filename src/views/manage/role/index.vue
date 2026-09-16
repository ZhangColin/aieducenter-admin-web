<script setup lang="tsx">
import { computed, ref } from 'vue';
import { NButton, NPopconfirm, NTag } from 'naive-ui';
import { SUPER_ADMIN_ROLE_CODE } from '@/constants/business';
import { fetchDeleteRole, fetchGetRoleList, fetchUpdateRoleStatus } from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { useAuth } from '@/hooks/business/auth';
import { defaultTransform, useNaivePaginatedTable, useTableOperate } from '@/hooks/common/table';
import { $t } from '@/locales';
import StatusSwitch from '../components/status-switch.vue';
import RoleOperateDrawer from './modules/role-operate-drawer.vue';
import RoleSearch from './modules/role-search.vue';

defineOptions({
  name: 'RoleManage'
});

const appStore = useAppStore();
const { hasAuth } = useAuth();

/** 写操作权限：hasAuth 已对超管（isStaticSuper）放行 */
const canWrite = computed(() => hasAuth('admin:role:write'));

/** 超管角色受保护：不可删（选择/删除禁用） */
function isProtected(row: Api.SystemManage.Role) {
  return row.code === SUPER_ADMIN_ROLE_CODE;
}

const searchParams = ref<Api.SystemManage.RoleSearchParams>({
  name: null,
  code: null,
  keyword: null,
  status: null,
  page: 1,
  size: 10
});

/** 清洗搜索参数：剔除空值、保留分页；请求 page 保持 1-based */
function buildParams(p: Api.SystemManage.RoleSearchParams) {
  const { name, code, keyword, status, page, size } = p;

  return {
    page,
    size,
    ...(name ? { name } : {}),
    ...(code ? { code } : {}),
    ...(keyword ? { keyword } : {}),
    ...(status != null ? { status } : {})
  };
}

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination, scrollX } = useNaivePaginatedTable({
  api: () => fetchGetRoleList(buildParams(searchParams.value)),
  transform: response => defaultTransform(response),
  onPaginationParamsChange: params => {
    searchParams.value.page = params.page ?? 1;
    searchParams.value.size = params.pageSize ?? 10;
  },
  columns: () => [
    {
      type: 'selection',
      align: 'center',
      width: 48,
      // 超管角色不可勾选 → 批量删除无法波及
      disabled: (row: Api.SystemManage.Role) => isProtected(row)
    },
    {
      key: 'name',
      title: $t('page.manage.role.roleName'),
      align: 'center',
      minWidth: 120
    },
    {
      key: 'code',
      title: $t('page.manage.role.roleCode'),
      align: 'center',
      minWidth: 160,
      render: row => (
        <NTag type={isProtected(row) ? 'error' : 'info'} bordered={false}>
          {row.code}
        </NTag>
      )
    },
    {
      key: 'description',
      title: $t('page.manage.role.roleDesc'),
      minWidth: 180,
      render: row => row.description || '-'
    },
    {
      key: 'sortOrder',
      title: $t('page.manage.role.order'),
      align: 'center',
      width: 80,
      render: row => row.sortOrder
    },
    {
      key: 'status',
      title: $t('page.manage.role.roleStatus'),
      align: 'center',
      width: 90,
      // SUPER_ADMIN 角色后端不可禁（守卫在 AdminRole.disable()），UI 锁定启用
      render: row => (
        <StatusSwitch
          value={row.status}
          disabled={!canWrite.value || isProtected(row)}
          onConfirm={(next: number) => handleToggleStatus(row, next)}
        />
      )
    },
    {
      key: 'operate',
      title: $t('common.operate'),
      align: 'center',
      width: 140,
      fixed: 'right',
      render: row => (
        <div class="flex-center gap-8px">
          <NButton type="primary" ghost size="small" disabled={!canWrite.value} onClick={() => edit(row.id)}>
            {$t('common.edit')}
          </NButton>
          <NPopconfirm disabled={!canWrite.value || isProtected(row)} onPositiveClick={() => handleDelete(row.id)}>
            {{
              default: () => $t('common.confirmDelete'),
              trigger: () => (
                <NButton type="error" ghost size="small" disabled={!canWrite.value || isProtected(row)}>
                  {$t('common.delete')}
                </NButton>
              )
            }}
          </NPopconfirm>
        </div>
      )
    }
  ]
});

const { drawerVisible, operateType, editingData, handleAdd, handleEdit, checkedRowKeys, onDeleted } = useTableOperate(
  data,
  'id',
  getData
);

function getRowKey(row: Api.SystemManage.Role) {
  return row.id;
}

function edit(id: string) {
  handleEdit(id);
}

async function handleToggleStatus(row: Api.SystemManage.Role, next: number) {
  const { error } = await fetchUpdateRoleStatus(row.id, next);

  if (!error) {
    window.$message?.success?.(next === 1 ? $t('page.manage.common.enableSuccess') : $t('page.manage.common.disableSuccess'));
  }

  // 成功/失败都刷新：成功持久化、失败回滚开关
  await getData();
}

async function handleDelete(id: string) {
  const { error } = await fetchDeleteRole(id);

  if (!error) {
    await onDeleted(); // 弹"删除成功" + getData
  }
}

async function handleBatchDelete() {
  const ids = [...checkedRowKeys.value];
  let failed = 0;

  for (const id of ids) {
    const { error } = await fetchDeleteRole(id);
    if (error) failed += 1;
  }

  // 清空选择，避免残留已删 id 让按钮保持可用 / 重复点击重试（对齐 useTableOperate.onBatchDeleted）
  checkedRowKeys.value = [];

  if (failed === 0) {
    window.$message?.success?.($t('page.manage.common.batchDeleteSuccess', { count: ids.length }));
  } else {
    window.$message?.warning?.($t('page.manage.common.batchDeletePartial', { success: ids.length - failed, fail: failed }));
  }

  await getData();
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <RoleSearch v-model:model="searchParams" @search="getDataByPage(1)" />
    <NCard :title="$t('page.manage.role.title')" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :disabled-add="!canWrite"
          :disabled-delete="!canWrite || checkedRowKeys.length === 0"
          :loading="loading"
          @add="handleAdd"
          @delete="handleBatchDelete"
          @refresh="getData"
        />
      </template>
      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
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
      <RoleOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getData"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
