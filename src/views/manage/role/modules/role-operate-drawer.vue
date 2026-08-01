<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { jsonClone } from '@sa/utils';
import { SUPER_ADMIN_ROLE_CODE } from '@/constants/business';
import { fetchCreateRole, fetchUpdateRole } from '@/service/api';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';
import MenuAuthModal from './menu-auth-modal.vue';
import PermissionAuthModal from './permission-auth-modal.vue';

defineOptions({
  name: 'RoleOperateDrawer'
});

interface Props {
  /** 操作类型 */
  operateType: NaiveUI.TableOperateType;
  /** 编辑行数据 */
  rowData?: Api.SystemManage.Role | null;
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

const title = computed(() => (props.operateType === 'add' ? '新增角色' : '编辑角色'));
const isEdit = computed(() => props.operateType === 'edit');
/** 超管角色 code 不可改（后端亦保护，UI 先兜底） */
const isSuperAdmin = computed(() => props.rowData?.code === SUPER_ADMIN_ROLE_CODE);

interface RoleModel {
  name: string;
  code: string;
  description: string | null;
  sortOrder: number;
}

function createDefaultModel(): RoleModel {
  return { name: '', code: '', description: null, sortOrder: 0 };
}

const model = ref<RoleModel>(createDefaultModel());
const submitting = ref(false);

/**
 * 角色工作副本（仅持有分配弹窗关心的 menuIds/permissionCodes）。
 * 用本地副本而非直接改 props.rowData——分配后同步副本，避免不关抽屉再次打开看到旧值，
 * 且不触发 vue/no-mutating-props。
 */
const localRole = ref<Api.SystemManage.Role | null>(null);

const rules = computed<Record<string, App.Global.FormRule | App.Global.FormRule[]>>(() => ({
  name: [defaultRequiredRule, { max: 50, message: '名称长度不能超过 50', trigger: 'input' }],
  code: [
    defaultRequiredRule,
    {
      pattern: /^[A-Za-z][A-Za-z0-9_]{0,49}$/,
      message: '编码须以字母开头，仅含字母、数字、下划线（≤50）',
      trigger: 'change'
    }
  ]
}));

function handleInitModel() {
  model.value = createDefaultModel();

  if (isEdit.value && props.rowData) {
    Object.assign(model.value, jsonClone(props.rowData));
    localRole.value = jsonClone(props.rowData);
  } else {
    localRole.value = null;
  }
}

function closeDrawer() {
  visible.value = false;
}

async function handleSubmit() {
  await validate();

  submitting.value = true;
  try {
    const { name, code, description, sortOrder } = model.value;
    if (isEdit.value && props.rowData) {
      const { error } = await fetchUpdateRole(props.rowData.id, {
        name,
        code,
        description,
        sortOrder,
        // home 经「分配菜单」弹窗修改；后端 update 为全量替换，省略即清空 home，
        // 故须回传当前值（localRole 已随弹窗同步）。
        home: localRole.value?.home ?? null
      });
      if (!error) {
        window.$message?.success?.($t('common.updateSuccess'));
        closeDrawer();
        emit('submitted');
      }
    } else {
      const { error } = await fetchCreateRole({ name, code, description, sortOrder });
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

/** 两个分配弹窗（仅编辑态） */
const menuAuthVisible = ref(false);
const buttonAuthVisible = ref(false);

function openMenuAuth() {
  menuAuthVisible.value = true;
}

function openButtonAuth() {
  buttonAuthVisible.value = true;
}

/** 分配成功：同步本地副本（避免不关抽屉再次打开看到旧值），并上抛刷新列表 */
function handleMenusAssigned(payload: { menuIds: string[]; home: string | null }) {
  if (localRole.value) {
    localRole.value.menuIds = payload.menuIds;
    localRole.value.home = payload.home;
  }
  emit('submitted');
}

function handlePermissionsAssigned(permissionCodes: string[]) {
  if (localRole.value) localRole.value.permissionCodes = permissionCodes;
  emit('submitted');
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
        <NFormItem label="角色名称" path="name">
          <NInput v-model:value="model.name" :maxlength="50" placeholder="请输入角色名称" />
        </NFormItem>
        <NFormItem label="角色编码" path="code">
          <NInput
            v-model:value="model.code"
            :maxlength="50"
            :disabled="isEdit && isSuperAdmin"
            :placeholder="isEdit && isSuperAdmin ? '超管编码不可修改' : '如 OPERATION_ADMIN'"
          />
        </NFormItem>
        <NFormItem label="排序" path="sortOrder">
          <NInputNumber v-model:value="model.sortOrder" :min="0" class="w-full" placeholder="数字越小越靠前" />
        </NFormItem>
        <NFormItem label="描述" path="description">
          <NInput
            v-model:value="model.description"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 4 }"
            :maxlength="255"
            placeholder="请输入描述（选填）"
          />
        </NFormItem>
      </NForm>
      <NSpace v-if="isEdit" :size="12" class="mt-8px">
        <NButton @click="openMenuAuth">分配菜单</NButton>
        <NButton @click="openButtonAuth">分配权限</NButton>
      </NSpace>
      <template #footer>
        <NSpace :size="16">
          <NButton @click="closeDrawer">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" :loading="submitting" @click="handleSubmit">{{ $t('common.confirm') }}</NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>

  <MenuAuthModal
    v-if="localRole"
    v-model:visible="menuAuthVisible"
    :role="localRole"
    @assigned="handleMenusAssigned"
  />
  <PermissionAuthModal
    v-if="localRole"
    v-model:visible="buttonAuthVisible"
    :role="localRole"
    @assigned="handlePermissionsAssigned"
  />
</template>

<style scoped></style>
