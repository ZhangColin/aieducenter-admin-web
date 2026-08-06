<script setup lang="tsx">
import { computed, ref } from 'vue';
import { NButton, NPopconfirm, NTag } from 'naive-ui';
import { userGenderRecord } from '@/constants/business';
import { fetchDeleteUser, fetchGetUserList, fetchUpdateUserStatus } from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { useAuthStore } from '@/store/modules/auth';
import { useAuth } from '@/hooks/business/auth';
import { defaultTransform, useNaivePaginatedTable, useTableOperate } from '@/hooks/common/table';
import { $t } from '@/locales';
import { formatDateTime } from '@/utils/common';
import StatusSwitch from '../components/status-switch.vue';
import UserOperateDrawer from './modules/user-operate-drawer.vue';
import UserResetPwdModal from './modules/user-reset-pwd-modal.vue';
import UserSearch from './modules/user-search.vue';

defineOptions({
  name: 'UserManage'
});

const appStore = useAppStore();
const authStore = useAuthStore();
const { hasAuth } = useAuth();

/** 写操作权限：hasAuth 已对超管（isStaticSuper）放行 */
const canWrite = computed(() => hasAuth('admin:user:write'));
const currentUserId = computed(() => authStore.userInfo.userId);

const searchParams = ref<Api.SystemManage.UserSearchParams>({
  username: null,
  status: null,
  keyword: null,
  phone: null,
  gender: null,
  page: 0,
  size: 10
});

/** 清洗搜索参数：剔除空值、保留分页；请求 page 保持 0-based */
function buildParams(p: Api.SystemManage.UserSearchParams) {
  const { username, status, keyword, phone, gender, page, size } = p;

  return {
    page,
    size,
    ...(username ? { username } : {}),
    ...(status != null ? { status } : {}),
    ...(keyword ? { keyword } : {}),
    ...(phone ? { phone } : {}),
    ...(gender != null ? { gender } : {})
  };
}

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination, scrollX } = useNaivePaginatedTable({
  api: () => fetchGetUserList(buildParams(searchParams.value)),
  transform: response => defaultTransform(response),
  onPaginationParamsChange: params => {
    // 后端请求 page 为 0-based（响应 page 才是 1-based）
    searchParams.value.page = (params.page ?? 1) - 1;
    searchParams.value.size = params.pageSize ?? 10;
  },
  columns: () => [
    {
      type: 'selection',
      align: 'center',
      width: 48,
      // 受保护行（内置 admin / 当前登录用户）不可勾选 → 批量操作无法波及
      disabled: (row: Api.SystemManage.User) => row.breakGlass || row.id === currentUserId.value
    },
    {
      key: 'username',
      title: $t('page.manage.user.userName'),
      align: 'center',
      minWidth: 120
    },
    {
      key: 'nickname',
      title: $t('page.manage.user.nickName'),
      align: 'center',
      minWidth: 120
    },
    {
      key: 'gender',
      title: $t('page.manage.user.userGender'),
      align: 'center',
      width: 80,
      render: row => {
        if (row.gender == null) return '-';
        const tagMap: Record<number, NaiveUI.ThemeColor> = { 1: 'primary', 2: 'error' };
        const label = $t(userGenderRecord[row.gender]);

        return <NTag type={tagMap[row.gender] ?? 'default'} size="small">{label}</NTag>;
      }
    },
    {
      key: 'roles',
      title: $t('page.manage.user.userRole'),
      align: 'center',
      minWidth: 160,
      render: row => {
        if (!row.roles?.length) return '-';
        return (
          <div class="flex-center flex-wrap gap-6px">
            {row.roles.map(role => (
              <NTag key={role.id} type="primary" size="small">
                {role.name}
              </NTag>
            ))}
          </div>
        );
      }
    },
    {
      key: 'phone',
      title: $t('page.manage.user.userPhone'),
      align: 'center',
      width: 130,
      render: row => row.phone || '-'
    },
    {
      key: 'email',
      title: $t('page.manage.user.userEmail'),
      align: 'center',
      minWidth: 180,
      render: row => row.email || '-'
    },
    {
      key: 'status',
      title: $t('page.manage.user.userStatus'),
      align: 'center',
      width: 90,
      render: row => (
        <StatusSwitch
          value={row.status}
          disabled={!canWrite.value || row.breakGlass || row.id === currentUserId.value}
          onConfirm={(next: number) => handleToggleStatus(row, next)}
        />
      )
    },
    {
      key: 'createdAt',
      title: $t('page.manage.user.createdAt'),
      align: 'center',
      width: 170,
      render: row => formatDateTime(row.createdAt)
    },
    {
      key: 'operate',
      title: $t('common.operate'),
      align: 'center',
      width: 210,
      fixed: 'right',
      render: row => (
        <div class="flex-center gap-8px">
          <NButton type="primary" ghost size="small" disabled={!canWrite.value} onClick={() => edit(row.id)}>
            {$t('common.edit')}
          </NButton>
          <NButton type="warning" ghost size="small" disabled={!canWrite.value} onClick={() => openResetPwd(row)}>
            {$t('page.manage.user.resetPwd')}
          </NButton>
          <NPopconfirm
            disabled={!canWrite.value || row.breakGlass || row.id === currentUserId.value}
            onPositiveClick={() => handleDelete(row.id)}
          >
            {{
              default: () => $t('common.confirmDelete'),
              trigger: () => (
                <NButton
                  type="error"
                  ghost
                  size="small"
                  disabled={!canWrite.value || row.breakGlass || row.id === currentUserId.value}
                >
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

/** 重置密码弹窗 */
const resetPwdVisible = ref(false);
const resetPwdRow = ref<Api.SystemManage.User | null>(null);

function getRowKey(row: Api.SystemManage.User) {
  return row.id;
}

function edit(id: string) {
  handleEdit(id);
}

function openResetPwd(row: Api.SystemManage.User) {
  resetPwdRow.value = row;
  resetPwdVisible.value = true;
}

async function handleDelete(id: string) {
  const { error } = await fetchDeleteUser(id);

  if (!error) {
    await onDeleted(); // 弹"删除成功" + getData
  }
}

async function handleBatchDelete() {
  const ids = [...checkedRowKeys.value];
  let failed = 0;

  for (const id of ids) {
    const { error } = await fetchDeleteUser(id);
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

async function handleToggleStatus(row: Api.SystemManage.User, next: number) {
  const { error } = await fetchUpdateUserStatus(row.id, next);

  if (!error) {
    window.$message?.success?.(next === 1 ? $t('page.manage.common.enableSuccess') : $t('page.manage.common.disableSuccess'));
  }

  // 成功/失败都刷新：成功持久化、失败回滚开关
  await getData();
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <UserSearch v-model:model="searchParams" @search="getDataByPage(1)" />
    <NCard :title="$t('page.manage.user.title')" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
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
      <UserOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getData"
      />
      <UserResetPwdModal v-model:visible="resetPwdVisible" :row-data="resetPwdRow" />
    </NCard>
  </div>
</template>

<style scoped></style>
