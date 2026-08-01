<script setup lang="tsx">
import { computed, ref } from 'vue';
import { NButton, NPopconfirm, NSwitch, NTag } from 'naive-ui';
import { useBoolean } from '@sa/hooks';
import { enableStatusRecord, menuTypeRecord } from '@/constants/business';
import { yesOrNoRecord } from '@/constants/common';
import { fetchDeleteMenu, fetchGetMenuList, fetchUpdateMenu } from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { useAuth } from '@/hooks/business/auth';
import { defaultTransform, useNaivePaginatedTable, useTableOperate } from '@/hooks/common/table';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';
import MenuOperateModal, { type OperateType } from './modules/menu-operate-modal.vue';

defineOptions({
  name: 'MenuManage'
});

const appStore = useAppStore();
const { hasAuth } = useAuth();

/** 写操作权限：hasAuth 已对超管（isStaticSuper）放行 */
const canWrite = computed(() => hasAuth('admin:menu:write'));

const { bool: visible, setTrue: openModal } = useBoolean();

const searchParams = ref<Api.SystemManage.MenuSearchParams>({
  page: 0,
  size: 10
});

/** 清洗分页参数（请求 page 保持 0-based）；过滤器位预留 */
function buildParams(p: Api.SystemManage.MenuSearchParams) {
  const { page, size } = p;
  return { page, size };
}

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination } = useNaivePaginatedTable({
  api: () => fetchGetMenuList(buildParams(searchParams.value)),
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
      width: 48
    },
    {
      key: 'menuType',
      title: '类型',
      align: 'center',
      width: 80,
      render: row => {
        const rec = menuTypeRecord[row.menuType];
        return (
          <NTag type={rec?.tagType ?? 'default'} bordered={false}>
            {rec?.label ?? row.menuType}
          </NTag>
        );
      }
    },
    {
      key: 'menuName',
      title: '菜单名称',
      align: 'center',
      minWidth: 140,
      render: row => <span>{row.menuName}</span>
    },
    {
      key: 'icon',
      title: '图标',
      align: 'center',
      width: 60,
      render: row => {
        if (!row.icon) return <span class="text-disabled">-</span>;
        const icon = row.iconType === 1 ? row.icon : undefined;
        const localIcon = row.iconType === 2 ? row.icon : undefined;
        return (
          <div class="flex-center">
            <SvgIcon icon={icon} localIcon={localIcon} class="text-icon" />
          </div>
        );
      }
    },
    {
      key: 'routeName',
      title: '路由名称',
      align: 'center',
      minWidth: 140,
      render: row => row.routeName || <span class="text-disabled">-</span>
    },
    {
      key: 'routePath',
      title: '路由路径',
      align: 'center',
      minWidth: 140,
      render: row => row.routePath || <span class="text-disabled">-</span>
    },
    {
      key: 'status',
      title: '状态',
      align: 'center',
      width: 90,
      render: row => {
        const rec = enableStatusRecord[row.status];
        return (
          <NSwitch
            value={row.status}
            checked-value={1}
            unchecked-value={0}
            disabled={!canWrite.value}
            onChange={(val: string | number | boolean) => handleToggleStatus(row, Number(val))}
          >
            {{ checked: () => rec?.label ?? '启用', unchecked: () => rec?.label ?? '禁用' }}
          </NSwitch>
        );
      }
    },
    {
      key: 'hideInMenu',
      title: '隐藏',
      align: 'center',
      width: 80,
      render: row => {
        const hide: CommonType.YesOrNo = row.hideInMenu ? 'Y' : 'N';
        return (
          <NTag type={row.hideInMenu ? 'error' : 'default'} bordered={false}>
            {$t(yesOrNoRecord[hide])}
          </NTag>
        );
      }
    },
    {
      key: 'parentId',
      title: '父级',
      align: 'center',
      width: 110,
      render: row => (row.parentId ? row.parentId : <span class="text-disabled">-</span>)
    },
    {
      key: 'sortOrder',
      title: '排序',
      align: 'center',
      width: 70,
      render: row => row.sortOrder ?? 0
    },
    {
      key: 'operate',
      title: $t('common.operate'),
      align: 'center',
      width: 240,
      fixed: 'right',
      render: row => (
        <div class="flex-center justify-end gap-8px">
          {row.menuType === 1 && (
            <NButton type="primary" ghost size="small" disabled={!canWrite.value} onClick={() => handleAddChild(row)}>
              新增子菜单
            </NButton>
          )}
          <NButton type="primary" ghost size="small" disabled={!canWrite.value} onClick={() => handleEdit(row)}>
            {$t('common.edit')}
          </NButton>
          <NPopconfirm disabled={!canWrite.value} onPositiveClick={() => handleDelete(row.id)}>
            {{
              default: () => $t('common.confirmDelete'),
              trigger: () => (
                <NButton type="error" ghost size="small" disabled={!canWrite.value}>
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

const { checkedRowKeys, onDeleted } = useTableOperate(data, 'id', getData);

const operateType = ref<OperateType>('add');
/** 编辑行数据，或新增子菜单时的父节点 */
const editingData = ref<Api.SystemManage.Menu | null>(null);

function getRowKey(row: Api.SystemManage.Menu) {
  return row.id;
}

function handleAdd() {
  operateType.value = 'add';
  editingData.value = null;
  openModal();
}

function handleEdit(row: Api.SystemManage.Menu) {
  operateType.value = 'edit';
  editingData.value = { ...row };
  openModal();
}

function handleAddChild(row: Api.SystemManage.Menu) {
  operateType.value = 'addChild';
  editingData.value = { ...row };
  openModal();
}

/**
 * 可选 page 清单由弹窗自行从菜单树派生（REQ-8「前端自派生」，覆盖全量菜单），
 * 见 menu-operate-modal.vue 的 loadTreePages——故本页不再传 allPages prop。
 */

/** 行 → 提交命令（菜单无独立启停端点，status 经全量 PUT 切换，故需整行重建命令） */
function menuToCommand(menu: Api.SystemManage.Menu, overrides: Partial<Api.SystemManage.MenuCommand> = {}) {
  return {
    menuName: menu.menuName,
    routeName: menu.routeName,
    routePath: menu.routePath,
    component: menu.component,
    icon: menu.icon,
    iconType: menu.iconType,
    parentId: menu.parentId,
    sortOrder: menu.sortOrder,
    menuType: menu.menuType,
    i18nKey: menu.i18nKey,
    keepAlive: menu.keepAlive,
    constant: menu.constant,
    multiTab: menu.multiTab,
    hideInMenu: menu.hideInMenu,
    activeMenu: menu.activeMenu,
    href: menu.href,
    fixedIndexInTab: menu.fixedIndexInTab,
    query: menu.query,
    status: menu.status,
    ...overrides
  };
}

async function handleToggleStatus(row: Api.SystemManage.Menu, next: number) {
  const { error } = await fetchUpdateMenu(row.id, menuToCommand(row, { status: next }));
  if (!error) {
    window.$message?.success?.(next === 1 ? '已启用' : '已禁用');
  }
  // 成功/失败都刷新：成功持久化、失败回滚开关
  await getData();
}

async function handleDelete(id: string) {
  const { error } = await fetchDeleteMenu(id);
  if (!error) {
    await onDeleted(); // 弹"删除成功" + getData
  }
}

async function handleBatchDelete() {
  const ids = [...checkedRowKeys.value];
  let failed = 0;

  for (const id of ids) {
    const { error } = await fetchDeleteMenu(String(id));
    if (error) failed += 1;
  }

  checkedRowKeys.value = [];

  if (failed === 0) {
    window.$message?.success?.(`已删除 ${ids.length} 个菜单`);
  } else {
    window.$message?.warning?.(`${ids.length - failed} 个成功、${failed} 个失败（可能存在子菜单）`);
  }

  await getData();
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <NCard title="菜单管理" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
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
        :scroll-x="1280"
        :loading="loading"
        remote
        :row-key="getRowKey"
        :pagination="mobilePagination"
      />
      <MenuOperateModal
        v-model:visible="visible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getDataByPage"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
