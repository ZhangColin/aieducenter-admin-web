<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { SUPER_ADMIN_ROLE_CODE } from '@/constants/business';
import { fetchAssignUserRoles, fetchGetAllRoles, fetchGetUserDetail } from '@/service/api';
import { $t } from '@/locales';

defineOptions({
  name: 'UserRoleAuthModal'
});

interface Props {
  /** 目标用户：id 用于取详情/提交；breakGlass 决定是否锁定 SUPER_ADMIN；昵称/用户名用于标题 */
  user: Api.SystemManage.User;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'assigned', roleIds: string[]): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', {
  default: false
});

const title = computed(() => `分配角色 — ${props.user.nickname || props.user.username}`);

/** 全量角色（选项源；角色无 status 字段，列表即启用角色） */
const roleList = ref<Api.SystemManage.Role[]>([]);
/** 已选 role id（提交体 roleIds） */
const checks = ref<string[]>([]);
const loading = ref(false);
const submitting = ref(false);

/**
 * NSelect 选项。
 * break-glass 用户的 SUPER_ADMIN 标 `disabled`：NaiveUI 多选下 `closable: !option.disabled`，
 * 禁用项的已选 tag 不可关闭、下拉里亦不可勾/取消——实现「不可移除」。
 */
const options = computed(() =>
  roleList.value.map(r => ({
    label: `${r.name}（${r.code}）`,
    value: r.id,
    disabled: props.user.breakGlass && r.code === SUPER_ADMIN_ROLE_CODE
  }))
);

async function load() {
  loading.value = true;
  try {
    // 详情（roles 回显，列表不含）与选项源并行拉取
    const [detailRes, rolesRes] = await Promise.all([fetchGetUserDetail(props.user.id), fetchGetAllRoles()]);

    // 详情拉取失败：全局 onError 已弹后端 message。回显不可得则不安全继续
    // （全量替换语义下，误以空集/残集提交会清掉用户既有角色）——关闭弹窗。
    if (detailRes.error) {
      visible.value = false;
      return;
    }

    if (!rolesRes.error) roleList.value = rolesRes.data;

    let ids = (detailRes.data?.roles ?? []).map(r => r.id);

    // break-glass：强制补回 SUPER_ADMIN（即使详情漏了也保底）；其选项标 disabled 使 tag 不可移除
    if (props.user.breakGlass) {
      const superRole = roleList.value.find(r => r.code === SUPER_ADMIN_ROLE_CODE);
      if (superRole && !ids.includes(superRole.id)) ids = [superRole.id, ...ids];
    }

    checks.value = ids;
  } finally {
    loading.value = false;
  }
}

async function handleSubmit() {
  // 后端 AssignRolesCommand.roleIds @NotEmpty——空集禁提交（按钮已禁，双保险）
  if (checks.value.length === 0) return;

  submitting.value = true;
  try {
    const { error } = await fetchAssignUserRoles(props.user.id, { roleIds: checks.value });
    if (!error) {
      window.$message?.success?.('分配角色成功');
      emit('assigned', checks.value);
      visible.value = false;
    }
  } finally {
    submitting.value = false;
  }
}

function init() {
  checks.value = [];
  load();
}

watch(visible, val => {
  if (val) init();
});
</script>

<template>
  <NModal v-model:show="visible" preset="card" :title="title" class="w-520px" :mask-closable="false">
    <NEmpty v-if="!loading && roleList.length === 0" description="暂无可分配角色" />
    <NSelect
      v-else
      v-model:value="checks"
      multiple
      :options="options"
      :loading="loading"
      placeholder="请选择角色"
      max-tag-count="responsive"
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
