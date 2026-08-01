<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { jsonClone } from '@sa/utils';
import { userGenderOptions } from '@/constants/business';
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

const title = computed(() => (props.operateType === 'add' ? $t('page.manage.user.addUser') : $t('page.manage.user.editUser')));
const isEdit = computed(() => props.operateType === 'edit');

interface UserModel {
  username: string;
  password: string;
  nickname: string;
  email: string | null;
  phone: string | null;
  gender: number | null;
}

function createDefaultModel(): UserModel {
  return { username: '', password: '', nickname: '', email: null, phone: null, gender: null };
}

const model = ref<UserModel>(createDefaultModel());
const submitting = ref(false);

const rules = computed<Record<string, App.Global.FormRule | App.Global.FormRule[]>>(() => ({
  username: [
    defaultRequiredRule,
    { pattern: /^[a-zA-Z0-9_]{4,20}$/, message: $t('page.manage.user.userNameRule'), trigger: 'change' }
  ],
  // 编辑态无密码字段，规则置空（validate() 会校验所有规则，故编辑态不能保留密码必填）
  password: isEdit.value ? [] : [defaultRequiredRule, { pattern: REG_PWD, message: $t('page.manage.user.pwdRule'), trigger: 'change' }],
  nickname: [defaultRequiredRule],
  email: {
    trigger: ['blur', 'input'],
    message: $t('form.email.invalid'),
    validator: (_rule, value: string) => !value || REG_EMAIL.test(value)
  },
  phone: {
    trigger: ['blur', 'input'],
    message: $t('form.phone.invalid'),
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

/** 分配成功：上抛刷新列表（列表含「角色」列，刷新后即时回显新角色） */
function handleRolesAssigned() {
  emit('submitted');
}

async function handleSubmit() {
  await validate();

  submitting.value = true;
  try {
    if (isEdit.value && props.rowData) {
      const { nickname, email, phone, gender } = model.value;
      const { error } = await fetchUpdateUser(props.rowData.id, {
        nickname,
        email,
        phone,
        gender,
        avatar: props.rowData.avatar
      });
      if (!error) {
        window.$message?.success?.($t('common.updateSuccess'));
        closeDrawer();
        emit('submitted');
      }
    } else {
      const { username, password, nickname, email, phone, gender } = model.value;
      const { error } = await fetchCreateUser({ username, password, nickname, email, phone, gender });
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
        <NFormItem :label="$t('page.manage.user.userName')" path="username">
          <NInput
            v-model:value="model.username"
            :placeholder="isEdit ? '' : $t('page.manage.user.userNameRule')"
            :disabled="isEdit"
          />
        </NFormItem>
        <NFormItem v-if="!isEdit" :label="$t('page.manage.user.password')" path="password">
          <NInput
            v-model:value="model.password"
            type="password"
            show-password-on="click"
            :placeholder="$t('page.manage.user.form.password')"
          />
        </NFormItem>
        <NFormItem :label="$t('page.manage.user.nickName')" path="nickname">
          <NInput v-model:value="model.nickname" :placeholder="$t('page.manage.user.form.nickName')" />
        </NFormItem>
        <NFormItem :label="$t('page.manage.user.userEmail')" path="email">
          <NInput v-model:value="model.email" :placeholder="$t('page.manage.user.form.userEmail')" />
        </NFormItem>
        <NFormItem :label="$t('page.manage.user.userPhone')" path="phone">
          <NInput v-model:value="model.phone" :placeholder="$t('page.manage.user.form.userPhone')" />
        </NFormItem>
        <NFormItem :label="$t('page.manage.user.userGender')" path="gender">
          <NRadioGroup v-model:value="model.gender">
            <NRadio v-for="item in userGenderOptions" :key="item.value" :value="item.value" :label="$t(item.label)" />
          </NRadioGroup>
        </NFormItem>
      </NForm>
      <NSpace v-if="isEdit" :size="12" class="mt-8px">
        <NButton @click="openRoleAuth">{{ $t('page.manage.user.assignRole') }}</NButton>
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
