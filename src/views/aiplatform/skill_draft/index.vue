<script setup lang="tsx">
/**
 * AI 平台草稿审核页（#71，技能线 drafts 4 端点）——自产技能草稿的人审队列。
 *
 * 在途清单 NDataTable **无分页**（跨项目全部在途、自荐倒序——有界人审队列不造分页）：
 * 名称/简介/血统三件（项目、run、槽位）/扫描判定（NTag 安全·注意）/自荐时刻。整页恒在途
 * ——**不列 status 列**（零信息量）；终态（已晋升/已拒绝）不列活跃面，终态呈现归拒绝回执。
 * 审核动作**双入口**（行下拉＋抽屉动作条，矩阵收 constants 单点）：晋升/拒绝两码分别
 * hasAuth 门控 `v-if`；审读是判定主体（skill-audit-guide 四要素——人审职责，前端仅呈现材料）。
 *
 * 晋升＝$dialog.warning（技能名对账＋不可逆）→ 回执态 modal（新技能行 id mono）；
 * 拒绝＝NModal reason 必填（前端拦截、SKL_018 兜底）→ 成功不关窗切回执态（终态详情留痕
 * 三件——唯一终态留痕呈现面）。错误**不判业务码**（#56 standing 决策）：写失败透传
 * message toast（onError 统一）＋**无条件刷新在途清单**（不判码也解 SKL_017 他端审结 stale）。
 */
import { ref } from 'vue';
import { NButton, NDropdown, NTag } from 'naive-ui';
import type { DropdownOption } from 'naive-ui';
import { skillDraftScanVerdictLabel, skillDraftScanVerdictTagColor, skillDraftWriteAuth, skillSlotLabel } from '@/constants/aiplatform';
import {
  fetchGetAiplatformSkillDraftList,
  fetchPromoteAiplatformSkillDraft
} from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { useAuth } from '@/hooks/business/auth';
import { useNaiveTable } from '@/hooks/common/table';
import { $t } from '@/locales';
import { formatDateTime } from '@/utils/common';
import SkillDraftDetailDrawer from './modules/skill-draft-detail-drawer.vue';
import SkillDraftPromoteReceiptModal from './modules/skill-draft-promote-receipt-modal.vue';
import SkillDraftRejectModal from './modules/skill-draft-reject-modal.vue';

defineOptions({ name: 'AiplatformSkillDraft' });

const appStore = useAppStore();
const { hasAuth } = useAuth();

/** 草稿两审核写动作（与 constants 权限码 Record 同键；行下拉与抽屉动作条双入口共用）。 */
type DraftAction = Api.Aiplatform.SkillDraftAction;

/**
 * 行下拉选项矩阵：晋升/拒绝两写逐码 hasAuth（分别 `v-if`——审阅只读无码则空矩阵不渲染
 * 下拉触发器，沙箱域先例）。整页恒在途，无按态互斥分支。
 */
function rowOptions(): DropdownOption[] {
  const opts: DropdownOption[] = [];
  if (hasAuth(skillDraftWriteAuth.promote)) {
    opts.push({ key: 'promote', label: $t('page.aiplatform.skillDraft.action.promote') });
  }
  if (hasAuth(skillDraftWriteAuth.reject)) {
    opts.push({ key: 'reject', label: $t('page.aiplatform.skillDraft.action.reject') });
  }
  return opts;
}

/** 在途清单无分页（有界队列）——useNaiveTable 非分页形：全量数组直灌，flex-height + sm:h-full。 */
const { columns, columnChecks, data, getData, loading, scrollX } = useNaiveTable({
  api: () => fetchGetAiplatformSkillDraftList(),
  transform: response => (response.error ? [] : response.data),
  columns: () => [
    {
      key: 'name',
      title: $t('page.aiplatform.skillDraft.name'),
      align: 'center',
      minWidth: 140,
      render: row => <span class="font-500">{row.name}</span>
    },
    {
      key: 'description',
      title: $t('page.aiplatform.skillDraft.description'),
      align: 'center',
      minWidth: 220,
      ellipsis: { tooltip: true },
      render: row => row.description
    },
    {
      // 血统三件之一（审核溯源锚）
      key: 'projectId',
      title: $t('page.aiplatform.skillDraft.projectId'),
      align: 'center',
      minWidth: 160,
      ellipsis: { tooltip: true },
      render: row => <span class="font-mono">{row.projectId}</span>
    },
    {
      // 血统三件之一（外部资料接触史等 run 级溯源——审核必查项）
      key: 'runId',
      title: $t('page.aiplatform.skillDraft.runId'),
      align: 'center',
      minWidth: 180,
      ellipsis: { tooltip: true },
      render: row => <span class="font-mono">{row.runId}</span>
    },
    {
      // 血统三件之一（槽位稳定键端侧映射——复用 skillSlotLabel 单点）
      key: 'slot',
      title: $t('page.aiplatform.skillDraft.slot'),
      align: 'center',
      width: 110,
      render: row => $t(skillSlotLabel[row.slot])
    },
    {
      // 扫描判定：SAFE 安全 / CAUTION 注意（DANGEROUS 写入口拒收不可达）
      key: 'scanVerdict',
      title: $t('page.aiplatform.skillDraft.scanVerdict'),
      align: 'center',
      width: 90,
      render: row => (
        <NTag type={skillDraftScanVerdictTagColor[row.scanVerdict]} size="small">
          {$t(skillDraftScanVerdictLabel[row.scanVerdict])}
        </NTag>
      )
    },
    {
      key: 'createdAt',
      title: $t('page.aiplatform.skillDraft.createdAt'),
      align: 'center',
      width: 160,
      render: row => formatDateTime(row.createdAt)
    },
    {
      key: 'operate',
      title: $t('common.operate'),
      align: 'center',
      width: 170,
      fixed: 'right',
      render: row => {
        const opts = rowOptions();
        return (
          <div class="flex-center gap-8px whitespace-nowrap">
            <NButton type="primary" ghost size="small" onClick={() => openDetail(row.id)}>
              {$t('page.aiplatform.skillDraft.detail')}
            </NButton>
            {/* 无任一写权限时不渲染下拉触发器——不可达操作不出现（沙箱域先例） */}
            {opts.length > 0 && (
              <NDropdown trigger="click" options={opts} onSelect={key => handleAction(key as DraftAction, row)}>
                <NButton size="small">{$t('page.aiplatform.skillDraft.more')}</NButton>
              </NDropdown>
            )}
          </div>
        );
      }
    }
  ]
});

function getRowKey(row: Api.Aiplatform.SkillDraftSummary) {
  return row.id;
}

/* ---- 详情抽屉（人审判读面三节：基本信息＋血统 → scanFindings → 正文全文；动作条 emit 回本页收口） ---- */
const drawerVisible = ref(false);
const selectedDraftId = ref('');

function openDetail(draftId: string) {
  selectedDraftId.value = draftId;
  drawerVisible.value = true;
}

/* ---- 晋升回执 modal（回执态：新技能行 id mono） ---- */
const promoteReceiptVisible = ref(false);
const promoteReceipt = ref<Api.Aiplatform.SkillSummary | null>(null);

/* ---- 拒绝 modal（表单态 reason 必填 → 成功不关窗切回执态＝终态详情留痕三件） ---- */
const rejectVisible = ref(false);
const rejectTarget = ref<Api.Aiplatform.SkillDraftSummary | null>(null);

function openReject(draft: Api.Aiplatform.SkillDraftSummary) {
  rejectTarget.value = draft;
  rejectVisible.value = true;
}

/**
 * 双入口动作收口（行下拉＋抽屉动作条）：晋升走 $dialog 确认；拒绝开 modal。
 * 两个分支的写请求各归其触发面（dialog 回调 / modal 提交），错误均不判码。
 */
function handleAction(action: DraftAction, draft: Api.Aiplatform.SkillDraftSummary) {
  if (action === 'promote') handlePromote(draft);
  else openReject(draft);
}

/**
 * 晋升：$dialog.warning（技能名对账＋不可逆提示）→ 回执态 modal（新技能行）。
 * 写后无条件刷新（成功收行、失败解他端审结 stale——不判码）；成功时同目标抽屉随行关闭
 * （草稿已终态、活跃面不可见——素材删除随行关闭先例）。
 */
function handlePromote(draft: Api.Aiplatform.SkillDraftSummary) {
  window.$dialog?.warning({
    title: $t('page.aiplatform.skillDraft.confirm.promote'),
    content: `${$t('page.aiplatform.skillDraft.confirm.target', { name: draft.name })}\n${$t('page.aiplatform.skillDraft.confirm.promoteTip')}`,
    positiveText: $t('common.confirm'),
    negativeText: $t('common.cancel'),
    onPositiveClick: async () => {
      const { data: receipt, error } = await fetchPromoteAiplatformSkillDraft(draft.id);
      getData();
      if (!error && receipt) {
        closeDrawerIfSame(draft.id);
        promoteReceipt.value = receipt;
        promoteReceiptVisible.value = true;
      }
    }
  });
}

/**
 * 拒绝 modal 写后回调（成功/失败均刷新——成功回执态留 modal 呈现，失败透传 toast 已由
 * onError 统一弹；本页只收刷新与同目标抽屉关闭）。
 */
function onRejectSettled(draftId: string, ok: boolean) {
  getData();
  if (ok) closeDrawerIfSame(draftId);
}

function closeDrawerIfSame(draftId: string) {
  if (drawerVisible.value && selectedDraftId.value === draftId) {
    drawerVisible.value = false;
  }
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <NCard :title="$t('page.aiplatform.skillDraft.title')" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <div class="flex items-center gap-8px">
          <!-- 在途清单无检索面（契约无过滤参数）；刷新不轮询 -->
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

    <!-- 详情抽屉（人审判读面：基本信息＋血统三件 → scanFindings 投影 → 正文全文） -->
    <SkillDraftDetailDrawer v-model:visible="drawerVisible" :draft-id="selectedDraftId" @action="handleAction" />

    <!-- 晋升回执 modal（新技能行 id mono） -->
    <SkillDraftPromoteReceiptModal v-model:visible="promoteReceiptVisible" :receipt="promoteReceipt" />

    <!-- 拒绝 modal（reason 必填表单态 → 终态详情回执态） -->
    <SkillDraftRejectModal v-model:visible="rejectVisible" :draft="rejectTarget" @settled="onRejectSettled" />
  </div>
</template>
