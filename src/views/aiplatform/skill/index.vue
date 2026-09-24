<script setup lang="tsx">
/**
 * AI 平台技能管理页（#67，#65 技能域 T1）。
 *
 * 治理工作面：列表 NDataTable **无分页**（有界目录，服务端排序内置在前、如实呈现）——
 * 内置与安装同权，来源/来源包/版本/状态/最近操作/可更新标记逐列直读。行操作＝「操作」下拉
 * （workspace 范式）：停用⇄启用互斥切换（按 status；对内置行照给——契约无「内置不可停」码，
 * provider 裁决透传）＋ 更新/卸载/留痕仅安装行（source=2——内置无 sourcePackage 且契约明示
 * 不可卸）；五写 hasAuth 逐码门控，留痕是读动作不门控。
 *
 * 回执分型（Q7）：启停/卸载＝toast＋刷新（卸载回执＝删除前终态不消费，素材删除先例）；安装/
 * 显式更新＝回执态 modal（信息量大——install 装入条目表、update from→to＋移除名单＋终态行集，
 * from==to 显式幂等呈现）。更新留痕＝行级动作 → NDrawer 时间线（主体是来源包不是技能）。
 * id 为 opaque 串两形制（builtin: 前缀 / TSID 十进制串）透传，禁止数值化。
 */
import { ref } from 'vue';
import { NButton, NDropdown, NTag } from 'naive-ui';
import type { DropdownOption } from 'naive-ui';
import { skillStatusTagColor, skillWriteAuth } from '@/constants/aiplatform';
import {
  fetchDisableAiplatformSkill,
  fetchEnableAiplatformSkill,
  fetchGetAiplatformSkillList,
  fetchUninstallAiplatformSkill,
  fetchUpdateAiplatformSkill
} from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { useAuth } from '@/hooks/business/auth';
import { useNaiveTable } from '@/hooks/common/table';
import { $t } from '@/locales';
import SkillDetailDrawer from './modules/skill-detail-drawer.vue';
import SkillInstallModal from './modules/skill-install-modal.vue';
import SkillTracesDrawer from './modules/skill-traces-drawer.vue';
import SkillUpdateReceiptModal from './modules/skill-update-receipt-modal.vue';

defineOptions({ name: 'AiplatformSkill' });

const appStore = useAppStore();
const { hasAuth } = useAuth();

/**
 * 行内三写动作（$dialog 确认 + toast 收口的子集——install 在 modal、update 走回执态 modal，
 * 均不进 WRITE_FETCH）。三处共用单点（映射键 / 守卫 / 形参）。
 */
type RowWriteAction = Extract<Api.Aiplatform.SkillAction, 'disable' | 'enable' | 'uninstall'>;

/** 操作下拉全部键（三写 + 更新 + 留痕——后两者仅安装行）。 */
type RowAction = RowWriteAction | 'update' | 'traces';

/** 行内三写请求映射（确认/toast 文案走 i18n `action.*` 同键；收口单点）。 */
const WRITE_FETCH: Record<RowWriteAction, (id: string) => ReturnType<typeof fetchDisableAiplatformSkill>> = {
  disable: fetchDisableAiplatformSkill,
  enable: fetchEnableAiplatformSkill,
  uninstall: fetchUninstallAiplatformSkill
};

/** 清单无分页（有界目录）——useNaiveTable 非分页形：全量数组直灌，flex-height + sm:h-full。 */
const { columns, columnChecks, data, getData, loading, scrollX } = useNaiveTable({
  api: () => fetchGetAiplatformSkillList(),
  transform: response => (response.error ? [] : response.data),
  columns: () => [
    {
      key: 'name',
      title: $t('page.aiplatform.skill.name'),
      align: 'center',
      minWidth: 140,
      render: row => <span class="font-500">{row.name}</span>
    },
    {
      key: 'description',
      title: $t('page.aiplatform.skill.description'),
      align: 'center',
      minWidth: 220,
      ellipsis: { tooltip: true },
      render: row => row.description
    },
    {
      key: 'source',
      title: $t('page.aiplatform.skill.source'),
      align: 'center',
      width: 80,
      render: row => row.sourceName
    },
    {
      key: 'sourcePackage',
      title: $t('page.aiplatform.skill.sourcePackage'),
      align: 'center',
      minWidth: 220,
      ellipsis: { tooltip: true },
      render: row => (row.sourcePackage ? <span class="font-mono">{row.sourcePackage}</span> : '-')
    },
    {
      key: 'version',
      title: $t('page.aiplatform.skill.version'),
      align: 'center',
      width: 140,
      ellipsis: { tooltip: true },
      render: row => (row.version ? <span class="font-mono">{row.version}</span> : '-')
    },
    {
      key: 'status',
      title: $t('page.aiplatform.skill.status'),
      align: 'center',
      width: 80,
      render: row => (
        <NTag type={skillStatusTagColor[row.status]} size="small">
          {row.statusName}
        </NTag>
      )
    },
    {
      key: 'operator',
      title: $t('page.aiplatform.skill.operator'),
      align: 'center',
      width: 110,
      render: row => row.operatorName ?? '-'
    },
    {
      // 可更新标记：true→tag；false/null→'-'。展示性标记，不门控更新动作（provider 不保证检查过）
      key: 'updateAvailable',
      title: $t('page.aiplatform.skill.updateAvailable'),
      align: 'center',
      width: 90,
      render: row =>
        row.updateAvailable === true ? (
          <NTag type="warning" size="small">
            {$t('page.aiplatform.skill.updatable')}
          </NTag>
        ) : (
          '-'
        )
    },
    {
      key: 'operate',
      title: $t('common.operate'),
      align: 'center',
      width: 170,
      fixed: 'right',
      render: row => {
        const opts = rowOptions(row);
        return (
          <div class="flex-center gap-8px whitespace-nowrap">
            <NButton type="primary" ghost size="small" onClick={() => openDetail(row.id)}>
              {$t('page.aiplatform.skill.detail')}
            </NButton>
            {/* 无可用动作（无写权限且非安装行）时不渲染下拉触发器——不可达操作不出现（沙箱域先例） */}
            {opts.length > 0 && (
              <NDropdown trigger="click" options={opts} onSelect={key => onRowAction(row, key as RowAction)}>
                <NButton size="small">{$t('page.aiplatform.skill.more')}</NButton>
              </NDropdown>
            )}
          </div>
        );
      }
    }
  ]
});

function getRowKey(row: Api.Aiplatform.SkillSummary) {
  return row.id;
}

/**
 * 行下拉选项矩阵：停用⇄启用互斥（按 status）＋ 更新/卸载/留痕仅安装行（source=2）；
 * 四写逐码 hasAuth（留痕是读动作不门控）。
 */
function rowOptions(row: Api.Aiplatform.SkillSummary): DropdownOption[] {
  const opts: DropdownOption[] = [];
  const toggle: 'disable' | 'enable' = row.status === 1 ? 'disable' : 'enable';
  if (hasAuth(skillWriteAuth[toggle])) {
    opts.push({ key: toggle, label: $t(`page.aiplatform.skill.action.${toggle}`) });
  }
  if (row.source === 2 && row.sourcePackage) {
    if (hasAuth(skillWriteAuth.update)) {
      opts.push({ key: 'update', label: $t('page.aiplatform.skill.action.update') });
    }
    if (hasAuth(skillWriteAuth.uninstall)) {
      opts.push({ key: 'uninstall', label: $t('page.aiplatform.skill.action.uninstall') });
    }
    opts.push({ key: 'traces', label: $t('page.aiplatform.skill.action.traces') });
  }
  return opts;
}

/* ---- 详情抽屉（安装审核面：基本信息 + frontmatter + 正文全文） ---- */
const drawerVisible = ref(false);
const selectedSkillId = ref('');

function openDetail(skillId: string) {
  selectedSkillId.value = skillId;
  drawerVisible.value = true;
}

/* ---- 安装 modal（回执态：装入条目表） ---- */
const installVisible = ref(false);

/* ---- 更新留痕抽屉（按来源包） ---- */
const tracesVisible = ref(false);
const tracesSourcePackage = ref('');

function openTraces(sourcePackage: string) {
  tracesSourcePackage.value = sourcePackage;
  tracesVisible.value = true;
}

/* ---- 更新回执 modal（from→to + 移除名单 + 终态行集） ---- */
const updateReceiptVisible = ref(false);
const updateReceipt = ref<Api.Aiplatform.SkillUpdateReceipt | null>(null);

function onRowAction(row: Api.Aiplatform.SkillSummary, key: RowAction) {
  switch (key) {
    case 'traces':
      if (row.sourcePackage) openTraces(row.sourcePackage);
      return;
    case 'update':
      if (row.sourcePackage) handleUpdate(row.sourcePackage);
      return;
    default:
      handleAction(key, row);
  }
}

/**
 * 行内三写单点收口：$dialog.warning 二次确认 → 成功 toast＋刷新（回执 summary 不消费——
 * 素材删除先例）。抽屉是纯读面且 modal 遮罩挡住行操作——写动作触发时抽屉必关，无同目标
 * 联动分支（区别于素材抽屉内置写按钮的 reload 范式）。失败走 onError 统一透传 toast
 * （409 SKL_008 等），此处不吞。
 */
function handleAction(action: RowWriteAction, row: Api.Aiplatform.SkillSummary) {
  window.$dialog?.warning({
    title: $t(`page.aiplatform.skill.confirm.${action}`),
    content: `${$t('page.aiplatform.skill.confirm.target', { name: row.name })}\n${$t(`page.aiplatform.skill.confirm.${action}Tip`)}`,
    positiveText: $t('common.confirm'),
    negativeText: $t('common.cancel'),
    onPositiveClick: async () => {
      const { error } = await WRITE_FETCH[action](row.id);
      if (!error) {
        window.$message?.success($t(`page.aiplatform.skill.success.${action}`));
        getData();
      }
    }
  });
}

/**
 * 显式更新：$dialog.warning 确认（来源包对账＋「远端已删且被指派的技能会令更新整体拒绝」提示）
 * → 回执态 modal（from→to；from==to 显式幂等；removedSkillNames；终态行集）＋ 列表刷新。
 * 409 SKL_013 走 onError 透传 toast，不至此。
 */
function handleUpdate(sourcePackage: string) {
  window.$dialog?.warning({
    title: $t('page.aiplatform.skill.confirm.update'),
    content: `${$t('page.aiplatform.skill.confirm.updateTarget', { sourcePackage })}\n${$t('page.aiplatform.skill.confirm.updateTip')}`,
    positiveText: $t('common.confirm'),
    negativeText: $t('common.cancel'),
    onPositiveClick: async () => {
      const { data: receipt, error } = await fetchUpdateAiplatformSkill({ sourcePackage });
      if (!error && receipt) {
        updateReceipt.value = receipt;
        updateReceiptVisible.value = true;
        getData();
      }
    }
  });
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <NCard :title="$t('page.aiplatform.skill.title')" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <div class="flex items-center gap-8px">
          <!-- 安装入口（hasAuth install 门控；清单无检索面——契约无过滤参数） -->
          <NButton v-if="hasAuth(skillWriteAuth.install)" type="primary" size="small" @click="installVisible = true">
            {{ $t('page.aiplatform.skill.install') }}
          </NButton>
          <TableHeaderOperation
            v-model:columns="columnChecks"
            :hide-add="true"
            :hide-delete="true"
            :loading="loading"
            @refresh="getData"
          />
        </div>
      </template>
      <NDataTable
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        class="sm:h-full"
        :scroll-x="scrollX"
        :loading="loading"
        :row-key="getRowKey"
      />
    </NCard>

    <!-- 详情抽屉（安装审核面：基本信息全字段 + frontmatter 键值 + 正文全文） -->
    <SkillDetailDrawer v-model:visible="drawerVisible" :skill-id="selectedSkillId" />

    <!-- 安装 modal（单步表单；成功不关窗切回执态） -->
    <SkillInstallModal v-model:visible="installVisible" @success="getData" />

    <!-- 更新回执 modal（from→to + 移除名单 + 终态行集） -->
    <SkillUpdateReceiptModal v-model:visible="updateReceiptVisible" :receipt="updateReceipt" />

    <!-- 更新留痕抽屉（按来源包时间线，倒序） -->
    <SkillTracesDrawer v-model:visible="tracesVisible" :source-package="tracesSourcePackage" />
  </div>
</template>
