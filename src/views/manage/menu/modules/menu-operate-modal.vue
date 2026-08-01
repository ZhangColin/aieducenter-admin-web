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
    add: '新增菜单',
    addChild: '新增子菜单',
    edit: '编辑菜单'
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
          <NFormItemGi span="24 m:12" label="菜单类型" path="menuType">
            <NRadioGroup v-model:value="model.menuType" :disabled="disabledMenuType">
              <NRadio v-for="item in menuTypeOptions" :key="item.value" :value="item.value" :label="item.label" />
            </NRadioGroup>
          </NFormItemGi>
          <NFormItemGi span="24 m:12" label="菜单名称" path="menuName">
            <NInput v-model:value="model.menuName" :maxlength="100" placeholder="请输入菜单名称" />
          </NFormItemGi>
          <NFormItemGi span="24 m:12" label="路由名称" path="routeName">
            <NInput
              v-model:value="model.routeName"
              :maxlength="100"
              :disabled="disabledMenuType"
              placeholder="如 manage_user（view route name）"
            />
          </NFormItemGi>
          <NFormItemGi span="24 m:12" label="路由路径" path="routePath">
            <NInput v-model:value="model.routePath" disabled placeholder="由路由名称自动生成" />
          </NFormItemGi>
          <NFormItemGi v-if="model.menuType === 2" span="24 m:12" label="路径参数" path="pathParam">
            <NInput v-model:value="model.pathParam" placeholder="如 id（生成 /:id，选填）" />
          </NFormItemGi>
          <NFormItemGi v-if="showLayout" span="24 m:12" label="布局" path="layout">
            <NSelect v-model:value="model.layout" :options="layoutOptions" placeholder="选择布局" />
          </NFormItemGi>
          <NFormItemGi v-if="showPage" span="24 m:12" label="页面" path="page">
            <NSelect
              v-model:value="model.page"
              :options="pageOptions"
              filterable
              tag
              placeholder="选择或输入页面 route name"
            />
          </NFormItemGi>
          <NFormItemGi span="24 m:12" label="i18nKey" path="i18nKey">
            <NInput v-model:value="model.i18nKey" :maxlength="100" placeholder="由路由名称自动生成" />
          </NFormItemGi>
          <NFormItemGi span="24 m:12" label="排序" path="sortOrder">
            <NInputNumber v-model:value="model.sortOrder" :min="0" class="w-full" placeholder="数字越小越靠前" />
          </NFormItemGi>
          <NFormItemGi span="24 m:12" label="图标类型" path="iconType">
            <NRadioGroup v-model:value="model.iconType">
              <NRadio v-for="item in menuIconTypeOptions" :key="item.value" :value="item.value" :label="item.label" />
            </NRadioGroup>
          </NFormItemGi>
          <NFormItemGi span="24 m:12" label="图标" path="icon">
            <template v-if="model.iconType === 1">
              <NInput v-model:value="model.icon" :maxlength="100" placeholder="如 mdi:menu" class="flex-1">
                <template #suffix>
                  <SvgIcon v-if="model.icon" :icon="model.icon" class="text-icon" />
                </template>
              </NInput>
            </template>
            <template v-if="model.iconType === 2">
              <NSelect
                v-model:value="model.icon"
                filterable
                placeholder="选择本地图标"
                :options="localIconOptions"
              />
            </template>
          </NFormItemGi>
          <NFormItemGi span="24 m:12" label="状态" path="status">
            <NRadioGroup v-model:value="model.status">
              <NRadio v-for="item in enableStatusOptions" :key="item.value" :value="item.value" :label="item.label" />
            </NRadioGroup>
          </NFormItemGi>
          <NFormItemGi span="24 m:12" label="缓存" path="keepAlive">
            <NRadioGroup v-model:value="model.keepAlive">
              <NRadio :value="true" label="是" />
              <NRadio :value="false" label="否" />
            </NRadioGroup>
          </NFormItemGi>
          <NFormItemGi span="24 m:12" label="常驻" path="constant">
            <NRadioGroup v-model:value="model.constant">
              <NRadio :value="true" label="是" />
              <NRadio :value="false" label="否" />
            </NRadioGroup>
          </NFormItemGi>
          <NFormItemGi span="24 m:12" label="外链" path="href">
            <NInput v-model:value="model.href" :maxlength="255" placeholder="https://...（选填）" />
          </NFormItemGi>
          <NFormItemGi span="24 m:12" label="隐藏菜单" path="hideInMenu">
            <NRadioGroup v-model:value="model.hideInMenu">
              <NRadio :value="true" label="是" />
              <NRadio :value="false" label="否" />
            </NRadioGroup>
          </NFormItemGi>
          <NFormItemGi v-if="model.hideInMenu" span="24 m:12" label="高亮菜单" path="activeMenu">
            <NSelect
              v-model:value="model.activeMenu"
              :options="pageOptions"
              clearable
              filterable
              tag
              placeholder="隐藏时高亮的 route name（选填）"
            />
          </NFormItemGi>
          <NFormItemGi span="24 m:12" label="多标签" path="multiTab">
            <NRadioGroup v-model:value="model.multiTab">
              <NRadio :value="true" label="是" />
              <NRadio :value="false" label="否" />
            </NRadioGroup>
          </NFormItemGi>
          <NFormItemGi span="24 m:12" label="固定标签" path="fixedIndexInTab">
            <NInputNumber
              v-model:value="model.fixedIndexInTab"
              class="w-full"
              clearable
              :min="0"
              placeholder="固定在标签栏的位置（选填）"
            />
          </NFormItemGi>
          <NFormItemGi span="24" label="路由参数">
            <NDynamicInput
              v-model:value="model.query"
              preset="pair"
              key-placeholder="参数名 key"
              value-placeholder="参数值 value"
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
