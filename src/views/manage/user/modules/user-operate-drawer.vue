<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { jsonClone } from '@sa/utils';
import { REG_EMAIL, REG_PHONE, REG_PWD } from '@/constants/reg';
import { fetchCreateUser, fetchUpdateUser } from '@/service/api';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';
import RoleAuthModal from './role-auth-modal.vue';

defineOptions({
  name: 'UserOperateDrawer'
});

interface Props {
  /** 操作类型 */
  operateType: NaiveUI.TableOperateType;
  /** 编辑行数据 */
  rowData?: Api.SystemManage.User | null;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', {
  default: false
});

const { formRef, validate, restoreValidation } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();

const title = computed(() => (props.operateType === 'add' ? '新增用户' : '编辑用户'));
const isEdit = computed(() => props.operateType === 'edit');

interface UserModel {
  username: string;
  password: string;
  nickname: string;
  email: string | null;
  phone: string | null;
}

function createDefaultModel(): UserModel {
  return { username: '', password: '', nickname: '', email: null, phone: null };
}

const model = ref<UserModel>(createDefaultModel());
const submitting = ref(false);

const rules = computed<Record<string, App.Global.FormRule | App.Global.FormRule[]>>(() => ({
  username: [
    defaultRequiredRule,
    { pattern: /^[a-zA-Z0-9_]{4,20}$/, message: '4-20 位字母、数字或下划线', trigger: 'change' }
  ],
  // 编辑态无密码字段，规则置空（validate() 会校验所有规则，故编辑态不能保留密码必填）
  password: isEdit.value ? [] : [defaultRequiredRule, { pattern: REG_PWD, message: '8-20 位、须含字母+数字', trigger: 'change' }],
  nickname: [defaultRequiredRule],
  email: {
    trigger: ['blur', 'input'],
    message: '邮箱格式不正确',
    validator: (_rule, value: string) => !value || REG_EMAIL.test(value)
  },
  phone: {
    trigger: ['blur', 'input'],
    message: '手机号格式不正确',
    validator: (_rule, value: string) => !value || REG_PHONE.test(value)
  }
}));

function handleInitModel() {
  model.value = createDefaultModel();

  if (isEdit.value && props.rowData) {
    Object.assign(model.value, jsonClone(props.rowData));
  }
}

function closeDrawer() {
  visible.value = false;
}

/** 分配角色弹窗（仅编辑态；用户角色是独立端点 PUT /users/{id}/roles，与资料保存分离） */
const roleAuthVisible = ref(false);

function openRoleAuth() {
  roleAuthVisible.value = true;
}

/** 分配成功：上抛刷新列表（角色即时生效；列表暂无角色列，刷新为一致性 + 为 REQ-11 角色列预留） */
function handleRolesAssigned() {
  emit('submitted');
}

async function handleSubmit() {
  await validate();

  submitting.value = true;
  try {
    if (isEdit.value && props.rowData) {
      const { nickname, email, phone } = model.value;
      const { error } = await fetchUpdateUser(props.rowData.id, {
        nickname,
        email,
        phone,
        avatar: props.rowData.avatar
      });
      if (!error) {
        window.$message?.success?.($t('common.updateSuccess'));
        closeDrawer();
        emit('submitted');
      }
    } else {
      const { username, password, nickname, email, phone } = model.value;
      const { error } = await fetchCreateUser({ username, password, nickname, email, phone });
      if (!error) {
        window.$message?.success?.($t('common.addSuccess'));
        closeDrawer();
        emit('submitted');
      }
    }
  } finally {
    submitting.value = false;
  }
}

watch(visible, val => {
  if (val) {
    handleInitModel();
    restoreValidation();
  }
});
</script>

<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="420">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NForm ref="formRef" :model="model" :rules="rules" label-placement="top">
        <NFormItem label="用户名" path="username">
          <NInput
            v-model:value="model.username"
            :placeholder="isEdit ? '' : '4-20 位字母、数字或下划线'"
            :disabled="isEdit"
          />
        </NFormItem>
        <NFormItem v-if="!isEdit" label="密码" path="password">
          <NInput
            v-model:value="model.password"
            type="password"
            show-password-on="click"
            placeholder="8-20 位、须含字母+数字"
          />
        </NFormItem>
        <NFormItem label="昵称" path="nickname">
          <NInput v-model:value="model.nickname" placeholder="请输入昵称" />
        </NFormItem>
        <NFormItem label="邮箱" path="email">
          <NInput v-model:value="model.email" placeholder="请输入邮箱（选填）" />
        </NFormItem>
        <NFormItem label="手机号" path="phone">
          <NInput v-model:value="model.phone" placeholder="请输入手机号（选填）" />
        </NFormItem>
      </NForm>
      <NSpace v-if="isEdit" :size="12" class="mt-8px">
        <NButton @click="openRoleAuth">分配角色</NButton>
      </NSpace>
      <template #footer>
        <NSpace :size="16">
          <NButton @click="closeDrawer">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" :loading="submitting" @click="handleSubmit">{{ $t('common.confirm') }}</NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>

  <RoleAuthModal
    v-if="isEdit && rowData"
    v-model:visible="roleAuthVisible"
    :user="rowData"
    @assigned="handleRolesAssigned"
  />
</template>

<style scoped></style>
