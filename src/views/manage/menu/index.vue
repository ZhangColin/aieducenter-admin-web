<script setup lang="tsx">
import { computed, ref, watch } from 'vue';
import { NButton, NPopconfirm, NTag } from 'naive-ui';
import { useBoolean } from '@sa/hooks';
import { menuTypeRecord } from '@/constants/business';
import { yesOrNoRecord } from '@/constants/common';
import { fetchDeleteMenu, fetchGetMenuTree, fetchUpdateMenu } from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { useAuth } from '@/hooks/business/auth';
import { useNaiveTable, useTableOperate } from '@/hooks/common/table';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';
import StatusSwitch from '../components/status-switch.vue';
import MenuOperateModal, { type OperateType } from './modules/menu-operate-modal.vue';

defineOptions({
  name: 'MenuManage'
});

const appStore = useAppStore();
const { hasAuth } = useAuth();

/** 写操作权限：hasAuth 已对超管（isStaticSuper）放行 */
const canWrite = computed(() => hasAuth('admin:menu:write'));

const { bool: visible, setTrue: openModal } = useBoolean();

/**
 * 菜单为树形表格（不再分页——树不分页）：数据取 `/menus/tree`（后端已返回完整两级树，
 * 含 children）。与 Soybean example 的扁平分页菜单有意不同（产品决策）。
 * `BackendMenu` 与 `Api.SystemManage.Menu` 同构（REQ-8），此处按 Menu 渲染。
 */
const { columns, columnChecks, data, getData, loading, scrollX } = useNaiveTable({
  api: () => fetchGetMenuTree(),
  transform: response => (response.data ?? []) as Api.SystemManage.Menu[],
  columns: () => [
    {
      type: 'selection',
      align: 'center',
      width: 48
    },
    {
      key: 'menuName',
      title: $t('page.manage.menu.menuName'),
      align: 'left',
      minWidth: 140,
      render: row => <span>{row.menuName}</span>
    },
    {
      key: 'menuType',
      title: $t('page.manage.menu.menuType'),
      align: 'center',
      width: 80,
      render: row => {
        const tagMap: Record<number, NaiveUI.ThemeColor> = { 1: 'default', 2: 'primary' };
        const label = $t(menuTypeRecord[row.menuType]);
        return (
          <NTag type={tagMap[row.menuType] ?? 'default'} bordered={false}>
            {label}
          </NTag>
        );
      }
    },
    {
      key: 'icon',
      title: $t('page.manage.menu.icon'),
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
      title: $t('page.manage.menu.routeName'),
      align: 'center',
      minWidth: 140,
      render: row => row.routeName || <span class="text-disabled">-</span>
    },
    {
      key: 'routePath',
      title: $t('page.manage.menu.routePath'),
      align: 'center',
      minWidth: 140,
      render: row => row.routePath || <span class="text-disabled">-</span>
    },
    {
      key: 'status',
      title: $t('page.manage.menu.menuStatus'),
      align: 'center',
      width: 90,
      render: row => (
        <StatusSwitch value={row.status} disabled={!canWrite.value} onConfirm={(next: number) => handleToggleStatus(row, next)} />
      )
    },
    {
      key: 'hideInMenu',
      title: $t('page.manage.menu.hideInMenu'),
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
      key: 'sortOrder',
      title: $t('page.manage.menu.order'),
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
              {$t('page.manage.menu.addChildMenu')}
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

/** 树形表：首次拿到树后默认全展开（便于总览），之后用户可自由折叠/展开（v-model 受控，不再强制全展）。
 *  `default-expand-all` 对异步加载数据不生效，故用 ref + 一次性 watch 初始化。 */
const expandedRowKeys = ref<string[]>([]);
const stopExpandInit = watch(
  data,
  nodes => {
    if (!nodes?.length) return;
    const keys: string[] = [];
    const walk = (ns: Api.SystemManage.Menu[]) => {
      for (const n of ns) {
        if (n.children?.length) {
          keys.push(n.id);
          walk(n.children);
        }
      }
    };
    walk(nodes);
    expandedRowKeys.value = keys;
    stopExpandInit();
  },
  { immediate: true }
);

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
    window.$message?.success?.(next === 1 ? $t('page.manage.common.enableSuccess') : $t('page.manage.common.disableSuccess'));
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
    window.$message?.success?.($t('page.manage.common.batchDeleteSuccess', { count: ids.length }));
  } else {
    window.$message?.warning?.($t('page.manage.common.batchDeletePartial', { success: ids.length - failed, fail: failed }));
  }

  await getData();
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <NCard :title="$t('page.manage.menu.title')" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
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
        v-model:expanded-row-keys="expandedRowKeys"
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        class="sm:h-full"
        :scroll-x="scrollX"
        :loading="loading"
        :row-key="getRowKey"
        :indent="24"
      />
      <MenuOperateModal
        v-model:visible="visible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getData"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
