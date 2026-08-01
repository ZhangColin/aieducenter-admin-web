<script setup lang="tsx">
import { computed, ref, watch } from 'vue';
import type { SelectOption } from 'naive-ui';
import { enableStatusOptions, menuIconTypeOptions, menuTypeOptions } from '@/constants/business';
import { fetchCreateMenu, fetchGetMenuTree, fetchUpdateMenu } from '@/service/api';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { getLocalIcons } from '@/utils/icon';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';
import {
  getLayoutAndPage,
  getPathParamFromRoutePath,
  getRoutePathByRouteName,
  getRoutePathWithParam,
  transformLayoutAndPageToComponent
} from './shared';

defineOptions({
  name: 'MenuOperateModal'
});

export type OperateType = NaiveUI.TableOperateType | 'addChild';

interface Props {
  /** 操作类型 */
  operateType: OperateType;
  /** 编辑行数据，或新增子菜单时的父节点 */
  rowData?: Api.SystemManage.Menu | null;
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

const title = computed(() => {
  const titles: Record<OperateType, string> = {
    add: $t('page.manage.menu.addMenu'),
    addChild: $t('page.manage.menu.addChildMenu'),
    edit: $t('page.manage.menu.editMenu')
  };
  return titles[props.operateType];
});

interface MenuModel {
  menuType: Api.SystemManage.MenuType;
  menuName: string;
  routeName: string;
  routePath: string;
  /** UI-only：routePath 尾部 `/:param` 段 */
  pathParam: string;
  /** UI-only：component 拆出的 layout / page 两段 */
  layout: string;
  page: string;
  i18nKey: string | null;
  icon: string;
  iconType: Api.SystemManage.MenuIconType;
  parentId: string | null;
  status: number;
  keepAlive: boolean;
  constant: boolean;
  sortOrder: number;
  href: string | null;
  hideInMenu: boolean;
  activeMenu: string | null;
  multiTab: boolean;
  fixedIndexInTab: number | null;
  query: Api.SystemManage.MenuQueryParam[];
}

function createDefaultModel(): MenuModel {
  return {
    menuType: 1,
    menuName: '',
    routeName: '',
    routePath: '',
    pathParam: '',
    layout: '',
    page: '',
    i18nKey: null,
    icon: '',
    iconType: 1,
    parentId: null,
    status: 1,
    keepAlive: false,
    constant: false,
    sortOrder: 0,
    href: null,
    hideInMenu: false,
    activeMenu: null,
    multiTab: false,
    fixedIndexInTab: null,
    query: []
  };
}

const model = ref<MenuModel>(createDefaultModel());
const submitting = ref(false);

/** routePath 仅 menu 类型必填（directory 类型禁填，后端透传无不变量——前端兜底） */
const rules = computed<Record<string, App.Global.FormRule | App.Global.FormRule[]>>(() => ({
  menuName: defaultRequiredRule,
  routeName: defaultRequiredRule,
  status: defaultRequiredRule,
  routePath: model.value.menuType === 2 ? defaultRequiredRule : { required: false, trigger: 'change' }
}));

/** 编辑时类型不可改（子菜单结构依赖类型，Soybean 行为） */
const disabledMenuType = computed(() => props.operateType === 'edit');

const localIcons = getLocalIcons();
const localIconOptions = localIcons.map<SelectOption>(item => ({
  label: () => (
    <div class="flex-y-center gap-16px">
      <SvgIcon localIcon={item} class="text-icon" />
      <span>{item}</span>
    </div>
  ),
  value: item
}));

/** layout 选择仅顶级（parentId 为空）节点出现 */
const showLayout = computed(() => !model.value.parentId);

/** page 选择仅 menu 类型出现 */
const showPage = computed(() => model.value.menuType === 2);

/**
 * 可选 page（view route name）清单。
 *
 * 本仓无 Soybean `/getAllPages` 端点，REQ-8 决策「前端自派生」：弹窗打开时拉一次菜单树，
 * 取全量 menuType=2（叶子菜单）节点的 routeName（directory 无视图，不可作落地页）——
 * 同角色分配弹窗 homeOptions 的派生方式，覆盖全量菜单而非仅当前分页页。
 */
const treePages = ref<string[]>([]);

async function loadTreePages() {
  const { error, data } = await fetchGetMenuTree();
  if (error) return;

  const names: string[] = [];
  const walk = (nodes: Api.Auth.BackendMenu[]) => {
    nodes.forEach(n => {
      if (n.menuType === 2 && n.routeName) names.push(n.routeName);
      if (n.children?.length) walk(n.children);
    });
  };
  walk(data);
  treePages.value = names;
}

const pageOptions = computed<CommonType.Option<string>[]>(() => {
  const allPages = [...treePages.value];

  if (model.value.routeName && !allPages.includes(model.value.routeName)) {
    allPages.unshift(model.value.routeName);
  }

  return allPages.map(page => ({ label: page, value: page }));
});

const layoutOptions: CommonType.Option<string>[] = [
  { label: 'base', value: 'base' },
  { label: 'blank', value: 'blank' }
];

function handleInitModel() {
  model.value = createDefaultModel();

  if (!props.rowData) return;

  if (props.operateType === 'addChild') {
    model.value.parentId = props.rowData.id;
  }

  if (props.operateType === 'edit') {
    const row = props.rowData;
    const { layout, page } = getLayoutAndPage(row.component);
    const { path, param } = getPathParamFromRoutePath(row.routePath ?? '');

    Object.assign(model.value, {
      menuType: row.menuType,
      menuName: row.menuName,
      routeName: row.routeName,
      routePath: path,
      pathParam: param,
      i18nKey: row.i18nKey,
      icon: row.icon ?? '',
      iconType: row.iconType,
      parentId: row.parentId,
      status: row.status,
      keepAlive: row.keepAlive,
      constant: row.constant,
      sortOrder: row.sortOrder ?? 0,
      href: row.href,
      hideInMenu: row.hideInMenu,
      activeMenu: row.activeMenu,
      multiTab: row.multiTab,
      fixedIndexInTab: row.fixedIndexInTab,
      query: row.query?.length ? [...row.query] : [],
      layout,
      page
    });
  }
}

function closeModal() {
  visible.value = false;
}

/**
 * path 不变量（前端兜底）：directory 类型禁 path；menu 类型由 routeName 派生 path。
 * routeName / menuType 变更均触发重算。
 */
function syncRouteByType() {
  if (model.value.menuType === 1) {
    model.value.routePath = '';
  } else if (model.value.routeName) {
    model.value.routePath = getRoutePathByRouteName(model.value.routeName);
  } else {
    model.value.routePath = '';
  }
}

/** 组装干净的提交参数（剔除 UI-only 字段，目录强制 routePath=null） */
function getSubmitParams(): Api.SystemManage.MenuCommand {
  const m = model.value;
  const component = transformLayoutAndPageToComponent(m.layout, m.page);
  const routePath = m.menuType === 2 ? getRoutePathWithParam(m.routePath, m.pathParam) : null;

  return {
    menuName: m.menuName,
    routeName: m.routeName,
    routePath,
    component,
    icon: m.icon || null,
    iconType: m.iconType,
    parentId: m.parentId || null,
    sortOrder: m.sortOrder ?? 0,
    menuType: m.menuType,
    i18nKey: m.i18nKey || null,
    keepAlive: m.keepAlive,
    constant: m.constant,
    multiTab: m.multiTab,
    hideInMenu: m.hideInMenu,
    activeMenu: m.activeMenu || null,
    href: m.href || null,
    fixedIndexInTab: m.fixedIndexInTab ?? null,
    query: m.query ?? [],
    status: m.status
  };
}

async function handleSubmit() {
  await validate();

  const params = getSubmitParams();
  submitting.value = true;
  try {
    if (props.operateType === 'edit' && props.rowData) {
      const { error } = await fetchUpdateMenu(props.rowData.id, params);
      if (!error) {
        window.$message?.success?.($t('common.updateSuccess'));
        closeModal();
        emit('submitted');
      }
    } else {
      const { error } = await fetchCreateMenu(params);
      if (!error) {
        window.$message?.success?.($t('common.addSuccess'));
        closeModal();
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
    loadTreePages();
  }
});

watch(() => model.value.routeName, () => {
  syncRouteByType();
  // i18nKey 随 routeName 派生（本仓 route name → route.<name> 约定）
  model.value.i18nKey = model.value.routeName ? `route.${model.value.routeName}` : null;
});

watch(() => model.value.menuType, syncRouteByType);
</script>

<template>
  <NModal v-model:show="visible" :title="title" preset="card" class="w-800px">
    <NScrollbar class="h-480px pr-20px">
      <NForm ref="formRef" :model="model" :rules="rules" label-placement="left" :label-width="100">
        <NGrid responsive="screen" item-responsive>
          <NFormItemGi span="24 m:12" :label="$t('page.manage.menu.menuType')" path="menuType">
            <NRadioGroup v-model:value="model.menuType" :disabled="disabledMenuType">
              <NRadio v-for="item in menuTypeOptions" :key="item.value" :value="item.value" :label="$t(item.label)" />
            </NRadioGroup>
          </NFormItemGi>
          <NFormItemGi span="24 m:12" :label="$t('page.manage.menu.menuName')" path="menuName">
            <NInput v-model:value="model.menuName" :maxlength="100" :placeholder="$t('page.manage.menu.form.menuName')" />
          </NFormItemGi>
          <NFormItemGi span="24 m:12" :label="$t('page.manage.menu.routeName')" path="routeName">
            <NInput
              v-model:value="model.routeName"
              :maxlength="100"
              :disabled="disabledMenuType"
              :placeholder="$t('page.manage.menu.form.routeName')"
            />
          </NFormItemGi>
          <NFormItemGi span="24 m:12" :label="$t('page.manage.menu.routePath')" path="routePath">
            <NInput v-model:value="model.routePath" disabled :placeholder="$t('page.manage.menu.routePathAuto')" />
          </NFormItemGi>
          <NFormItemGi v-if="model.menuType === 2" span="24 m:12" :label="$t('page.manage.menu.pathParam')" path="pathParam">
            <NInput v-model:value="model.pathParam" :placeholder="$t('page.manage.menu.form.pathParam')" />
          </NFormItemGi>
          <NFormItemGi v-if="showLayout" span="24 m:12" :label="$t('page.manage.menu.layout')" path="layout">
            <NSelect v-model:value="model.layout" :options="layoutOptions" :placeholder="$t('page.manage.menu.form.layout')" />
          </NFormItemGi>
          <NFormItemGi v-if="showPage" span="24 m:12" :label="$t('page.manage.menu.page')" path="page">
            <NSelect
              v-model:value="model.page"
              :options="pageOptions"
              filterable
              tag
              :placeholder="$t('page.manage.menu.form.page')"
            />
          </NFormItemGi>
          <NFormItemGi span="24 m:12" :label="$t('page.manage.menu.i18nKey')" path="i18nKey">
            <NInput v-model:value="model.i18nKey" :maxlength="100" :placeholder="$t('page.manage.menu.i18nKeyAuto')" />
          </NFormItemGi>
          <NFormItemGi span="24 m:12" :label="$t('page.manage.menu.order')" path="sortOrder">
            <NInputNumber v-model:value="model.sortOrder" :min="0" class="w-full" :placeholder="$t('page.manage.menu.form.order')" />
          </NFormItemGi>
          <NFormItemGi span="24 m:12" :label="$t('page.manage.menu.iconTypeTitle')" path="iconType">
            <NRadioGroup v-model:value="model.iconType">
              <NRadio v-for="item in menuIconTypeOptions" :key="item.value" :value="item.value" :label="$t(item.label)" />
            </NRadioGroup>
          </NFormItemGi>
          <NFormItemGi span="24 m:12" :label="$t('page.manage.menu.icon')" path="icon">
            <template v-if="model.iconType === 1">
              <NInput v-model:value="model.icon" :maxlength="100" :placeholder="$t('page.manage.menu.form.icon')" class="flex-1">
                <template #suffix>
                  <SvgIcon v-if="model.icon" :icon="model.icon" class="text-icon" />
                </template>
              </NInput>
            </template>
            <template v-if="model.iconType === 2">
              <NSelect
                v-model:value="model.icon"
                filterable
                :placeholder="$t('page.manage.menu.form.localIcon')"
                :options="localIconOptions"
              />
            </template>
          </NFormItemGi>
          <NFormItemGi span="24 m:12" :label="$t('page.manage.menu.menuStatus')" path="status">
            <NRadioGroup v-model:value="model.status">
              <NRadio v-for="item in enableStatusOptions" :key="item.value" :value="item.value" :label="$t(item.label)" />
            </NRadioGroup>
          </NFormItemGi>
          <NFormItemGi span="24 m:12" :label="$t('page.manage.menu.keepAlive')" path="keepAlive">
            <NRadioGroup v-model:value="model.keepAlive">
              <NRadio :value="true" :label="$t('common.yesOrNo.yes')" />
              <NRadio :value="false" :label="$t('common.yesOrNo.no')" />
            </NRadioGroup>
          </NFormItemGi>
          <NFormItemGi span="24 m:12" :label="$t('page.manage.menu.constant')" path="constant">
            <NRadioGroup v-model:value="model.constant">
              <NRadio :value="true" :label="$t('common.yesOrNo.yes')" />
              <NRadio :value="false" :label="$t('common.yesOrNo.no')" />
            </NRadioGroup>
          </NFormItemGi>
          <NFormItemGi span="24 m:12" :label="$t('page.manage.menu.href')" path="href">
            <NInput v-model:value="model.href" :maxlength="255" :placeholder="$t('page.manage.menu.form.href')" />
          </NFormItemGi>
          <NFormItemGi span="24 m:12" :label="$t('page.manage.menu.hideInMenu')" path="hideInMenu">
            <NRadioGroup v-model:value="model.hideInMenu">
              <NRadio :value="true" :label="$t('common.yesOrNo.yes')" />
              <NRadio :value="false" :label="$t('common.yesOrNo.no')" />
            </NRadioGroup>
          </NFormItemGi>
          <NFormItemGi v-if="model.hideInMenu" span="24 m:12" :label="$t('page.manage.menu.activeMenu')" path="activeMenu">
            <NSelect
              v-model:value="model.activeMenu"
              :options="pageOptions"
              clearable
              filterable
              tag
              :placeholder="$t('page.manage.menu.form.activeMenu')"
            />
          </NFormItemGi>
          <NFormItemGi span="24 m:12" :label="$t('page.manage.menu.multiTab')" path="multiTab">
            <NRadioGroup v-model:value="model.multiTab">
              <NRadio :value="true" :label="$t('common.yesOrNo.yes')" />
              <NRadio :value="false" :label="$t('common.yesOrNo.no')" />
            </NRadioGroup>
          </NFormItemGi>
          <NFormItemGi span="24 m:12" :label="$t('page.manage.menu.fixedIndexInTab')" path="fixedIndexInTab">
            <NInputNumber
              v-model:value="model.fixedIndexInTab"
              class="w-full"
              clearable
              :min="0"
              :placeholder="$t('page.manage.menu.form.fixedIndexInTab')"
            />
          </NFormItemGi>
          <NFormItemGi span="24" :label="$t('page.manage.menu.query')">
            <NDynamicInput
              v-model:value="model.query"
              preset="pair"
              :key-placeholder="$t('page.manage.menu.form.queryKey')"
              :value-placeholder="$t('page.manage.menu.form.queryValue')"
            >
              <template #action="{ index, create, remove }">
                <NSpace class="ml-12px">
                  <NButton size="medium" @click="() => create(index)">
                    <icon-ic-round-plus class="text-icon" />
                  </NButton>
                  <NButton size="medium" @click="() => remove(index)">
                    <icon-ic-round-remove class="text-icon" />
                  </NButton>
                </NSpace>
              </template>
            </NDynamicInput>
          </NFormItemGi>
        </NGrid>
      </NForm>
    </NScrollbar>
    <template #footer>
      <NSpace justify="end" :size="16">
        <NButton @click="closeModal">{{ $t('common.cancel') }}</NButton>
        <NButton type="primary" :loading="submitting" @click="handleSubmit">{{ $t('common.confirm') }}</NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped></style>
