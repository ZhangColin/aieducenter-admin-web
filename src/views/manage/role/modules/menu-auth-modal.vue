<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { fetchAssignRoleMenus, fetchGetMenuTree } from '@/service/api';
import { filterAssignableMenuTree } from './menu-tree';
import { $t } from '@/locales';

defineOptions({
  name: 'RoleMenuAuthModal'
});

interface Props {
  /** 目标角色（含当前 menuIds 用于回显） */
  role: Api.SystemManage.Role;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'assigned', menuIds: string[]): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', {
  default: false
});

const title = computed(() => `分配菜单 — ${props.role.name}`);

const tree = ref<Api.Auth.BackendMenu[]>([]);
const checks = ref<string[]>([]);
const loading = ref(false);
const submitting = ref(false);

async function loadTree() {
  loading.value = true;
  try {
    const { error, data } = await fetchGetMenuTree();
    if (!error) {
      // 决策 B：过滤 DIVIDER（不可分配），再渲染勾选树
      tree.value = filterAssignableMenuTree(data);
    }
  } finally {
    loading.value = false;
  }
}

function init() {
  // 回显当前已分配菜单。用默认 checkStrategy="all"（非 permission 弹窗的 "child"）：菜单
  // GROUP 是后端**真实实体**（进 menuIds 存储/回显，非 permission 那种 UI-only 分组），"all"
  // 让 checked-keys 含 GROUP+MENU，与后端 menuIds 精确往返、不丢父 id。
  // 安全性：本 UI 经 cascade 勾选只会产生「整棵子树」（父+全子），回显恒自洽；半选子树只会
  // 出现在外部/种子数据，本系统不存在（SUPER_ADMIN 为 []）。DIVIDER 已在勾选树剔除。
  checks.value = [...(props.role.menuIds ?? [])];
  loadTree();
}

async function handleSubmit() {
  // 后端 AssignMenusCommand @NotEmpty——空集禁提交（按钮已禁，双保险）
  if (checks.value.length === 0) return;

  submitting.value = true;
  try {
    const { error } = await fetchAssignRoleMenus(props.role.id, { menuIds: checks.value });
    if (!error) {
      window.$message?.success?.('分配菜单成功');
      emit('assigned', checks.value);
      visible.value = false;
    }
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
    <NEmpty v-if="!loading && tree.length === 0" description="暂无可分配菜单" />
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
        <NButton type="primary" :disabled="checks.length === 0" :loading="submitting" @click="handleSubmit">
          {{ $t('common.confirm') }}
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped></style>
