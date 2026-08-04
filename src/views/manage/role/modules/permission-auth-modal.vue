<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { fetchAssignRolePermissions, fetchGetAllPermissions } from '@/service/api';
import { $t } from '@/locales';

defineOptions({
  name: 'RolePermissionAuthModal'
});

interface Props {
  /** 目标角色（含当前 permissionCodes 用于回显） */
  role: Api.SystemManage.Role;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'assigned', permissionCodes: string[]): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', {
  default: false
});

const title = computed(() => `${$t('page.manage.role.assignPermission')} — ${props.role.name}`);

/** NTree 节点：分组 key 加前缀避免与权限 code 冲突 */
interface PermTreeNode {
  key: string;
  label: string;
  children?: PermTreeNode[];
}

/** 权限资源段 → i18n key（未知资源原样展示） */
const RESOURCE_LABEL_KEY: Record<string, App.I18n.I18nKey> = {
  user: 'page.manage.permission.module.user',
  role: 'page.manage.permission.module.role',
  menu: 'page.manage.permission.module.menu',
  permission: 'page.manage.permission.module.permission'
};

/** 把扁平权限按 `admin:<resource>:<action>` 的 resource 段分组成两级树 */
function buildPermissionTree(perms: Api.SystemManage.Permission[]): PermTreeNode[] {
  const groups = new Map<string, Api.SystemManage.Permission[]>();

  for (const p of perms) {
    const parts = p.code.split(':');
    const resource = parts.length >= 3 ? parts[1] : '__other__';
    const bucket = groups.get(resource);
    if (bucket) bucket.push(p);
    else groups.set(resource, [p]);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([resource, items]) => ({
      key: `__group__:${resource}`,
      label: RESOURCE_LABEL_KEY[resource] ? $t(RESOURCE_LABEL_KEY[resource]) : resource,
      children: items
        .sort((a, b) => a.code.localeCompare(b.code))
        .map(p => ({ key: p.code, label: p.name || p.code }))
    }));
}

const tree = ref<PermTreeNode[]>([]);
const checks = ref<string[]>([]);
const loading = ref(false);
const submitting = ref(false);

async function loadPermissions() {
  loading.value = true;
  try {
    const { error, data } = await fetchGetAllPermissions();
    if (!error) tree.value = buildPermissionTree(data);
  } finally {
    loading.value = false;
  }
}

function init() {
  // 回显当前已分配权限。checkStrategy="child"：checked-keys 只含叶子（权限 code），
  // 分组 key 是 UI-only，提交只发 code——与后端 permissionCodes 精确往返
  checks.value = [...(props.role.permissionCodes ?? [])];
  loadPermissions();
}

async function handleSubmit() {
  // 空集 = 清空该角色全部权限（后端 AssignPermissionsCommand 已去 @NotEmpty，服务层 clear-then-add，同菜单分配）
  submitting.value = true;
  try {
    const { error } = await fetchAssignRolePermissions(props.role.id, { permissionCodes: checks.value });
    if (!error) {
      window.$message?.success?.($t('common.updateSuccess'));
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
  <NModal v-model:show="visible" preset="card" :title="title" class="w-520px" :mask-closable="false" :close-on-esc="false">
    <NEmpty v-if="!loading && tree.length === 0" :description="$t('page.manage.permission.noPermissionToAssign')" />
    <NTree
      v-else
      v-model:checked-keys="checks"
      :data="tree"
      :loading="loading"
      key-field="key"
      label-field="label"
      checkable
      cascade
      check-strategy="child"
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
