<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { fetchAssignRoleMenus, fetchGetMenuTree, fetchUpdateRole } from '@/service/api';
import { filterAssignableMenuTree } from './menu-tree';
import { $t } from '@/locales';

defineOptions({
  name: 'RoleMenuAuthModal'
});

interface Props {
  /** 目标角色（含当前 menuIds / home 用于回显） */
  role: Api.SystemManage.Role;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'assigned', payload: { menuIds: string[]; home: string | null }): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', {
  default: false
});

const title = computed(() => `${$t('page.manage.role.assignMenu')} — ${props.role.name}`);

const tree = ref<Api.Auth.BackendMenu[]>([]);
const checks = ref<string[]>([]);
const home = ref<string | null>(null);
const loading = ref(false);
const submitting = ref(false);

/**
 * 默认首页候选 = 可落地页的 route name。
 *
 * Soybean `fetchGetAllPages` 在本仓无对应后端端点——route name 是 `@elegant-router`
 * 前端构建期产物，REQ-8 决策「前端自派生」。此处直接从已加载的菜单树展平取
 * `menuType=2`（menu/叶子）节点的 `routeName`（directory 无视图，不可作落地页）。
 */
const homeOptions = computed<CommonType.Option<string>[]>(() => {
  const opts: CommonType.Option<string>[] = [];
  const walk = (nodes: Api.Auth.BackendMenu[]) => {
    nodes.forEach(n => {
      if (n.menuType === 2 && n.routeName) {
        opts.push({ label: n.menuName, value: n.routeName });
      }
      if (n.children?.length) walk(n.children);
    });
  };
  walk(tree.value);
  return opts;
});

async function loadTree() {
  loading.value = true;
  try {
    const { error, data } = await fetchGetMenuTree();
    if (!error) {
      tree.value = filterAssignableMenuTree(data);
    }
  } finally {
    loading.value = false;
  }
}

function init() {
  // 回显当前已分配菜单。用默认 checkStrategy="all"（非 permission 弹窗的 "child"）：菜单
  // directory 是后端**真实实体**（进 menuIds 存储/回显，非 permission 那种 UI-only 分组），"all"
  // 让 checked-keys 含 directory+menu，与后端 menuIds 精确往返、不丢父 id。
  // 安全性：本 UI 经 cascade 勾选只会产生「整棵子树」（父+全子），回显恒自洽；半选子树只会
  // 出现在外部/种子数据，本系统不存在（SUPER_ADMIN 为 []）。
  checks.value = [...(props.role.menuIds ?? [])];
  home.value = props.role.home ?? null;
  loadTree();
}

async function handleSubmit() {
  submitting.value = true;
  try {
    // 1. 菜单：全量替换（REQ-10 已去 AssignMenusCommand @NotEmpty，空集=清空）
    const { error } = await fetchAssignRoleMenus(props.role.id, { menuIds: checks.value });
    if (error) return;

    // 2. 默认首页：仅在变化时经 UpdateRoleCommand 提交（home 不在分配菜单端点，属角色字段）
    const homeChanged = (home.value ?? null) !== (props.role.home ?? null);
    if (homeChanged) {
      const { error: homeError } = await fetchUpdateRole(props.role.id, {
        name: props.role.name,
        code: props.role.code,
        description: props.role.description,
        sortOrder: props.role.sortOrder,
        home: home.value
      });
      if (homeError) return;
    }

    window.$message?.success?.($t('common.updateSuccess'));
    emit('assigned', { menuIds: checks.value, home: home.value });
    visible.value = false;
  } finally {
    submitting.value = false;
  }
}

watch(visible, val => {
  if (val) init();
});
</script>

<template>
  <NModal v-model:show="visible" preset="card" :title="title" class="w-520px" :mask-closable="false">
    <div class="flex-y-center gap-12px pb-12px">
      <span class="whitespace-nowrap">{{ $t('page.manage.role.defaultHome') }}</span>
      <NSelect
        v-model:value="home"
        :options="homeOptions"
        :loading="loading"
        :placeholder="$t('page.manage.role.homePlaceholder')"
        clearable
        filterable
        class="flex-1"
      />
    </div>
    <NEmpty v-if="!loading && tree.length === 0" :description="$t('page.manage.role.noMenuToAssign')" />
    <NTree
      v-else
      v-model:checked-keys="checks"
      :data="tree"
      :loading="loading"
      key-field="id"
      label-field="menuName"
      checkable
      cascade
      block-line
      expand-on-click
      virtual-scroll
      class="h-320px"
    />
    <template #footer>
      <NSpace justify="end" :size="16">
        <NButton @click="visible = false">{{ $t('common.cancel') }}</NButton>
        <NButton type="primary" :loading="submitting" @click="handleSubmit">
          {{ $t('common.confirm') }}
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped></style>
