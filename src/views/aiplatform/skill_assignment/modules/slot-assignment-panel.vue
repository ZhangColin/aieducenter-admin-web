<script setup lang="tsx">
/**
 * 槽位指派面板（#68，#65 技能域 T2）——NTabs 单签内容：可勾选技能表 + 保存行。
 *
 * 进入（挂载）即 GET /skills/assignments/{slot} 预填勾选（回读含停用行——终态语义：停用不解除
 * 指派，行照常勾选）；选项集由父页传入（技能清单安装行——builtin 不列，指派 400 SKL_011 门控
 * 可达即排除）。保存＝直接 PUT {skillIds[]} 整包替换（清单即终态、空＝清空、无确认弹窗）＋
 * toast＋回读刷新；失败走 onError 统一透传 toast（400 SKL_011 等），勾选态保留可修正重试。
 * 回读 id 可能含表外行（他端并发指派且本页清单未刷新）——checkedRowKeys 原样保留：表外勾选
 * 不渲染但随下次整包 PUT 送回，不丢他端生效的指派（整包替换语义）。
 */
import { onMounted, ref } from 'vue';
import { NButton, NTag } from 'naive-ui';
import type { DataTableColumn, DataTableRowKey } from 'naive-ui';
import { SKILL_ASSIGN_AUTH, skillAssignmentStatusTagColor, skillSlotLabel } from '@/constants/aiplatform';
import { fetchAssignAiplatformSkills, fetchGetAiplatformSkillAssignments } from '@/service/api';
import { useAuth } from '@/hooks/business/auth';
import { $t } from '@/locales';

defineOptions({ name: 'SlotAssignmentPanel' });

const props = defineProps<{
  /** 职能槽位（路径段寻址；签 label 由父页 tab 承载，toast 插值用 skillSlotLabel）。 */
  skillSlot: Api.Aiplatform.SkillSlot;
  /** 选项集＝技能清单安装行（builtin 不列——父页已过滤；指派不改技能行，存续期内静态）。 */
  skills: Api.Aiplatform.SkillSummary[];
  /** 父页选项清单在途（与面板自身 GET 的 loading 合并呈现，防空表闪现）。 */
  optionsLoading: boolean;
}>();

const { hasAuth } = useAuth();

const loading = ref(false);
const saving = ref(false);
const checkedRowKeys = ref<DataTableRowKey[]>([]);

const columns: DataTableColumn<Api.Aiplatform.SkillSummary>[] = [
  { type: 'selection' },
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
    minWidth: 260,
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
    // 指派上下文状态 tag（constants 单点）：停用行升级 warning（「指派了但已停用」＝装配退化警示，终态语义）
    key: 'status',
    title: $t('page.aiplatform.skill.status'),
    align: 'center',
    width: 90,
    render: row => (
      <NTag type={skillAssignmentStatusTagColor[row.status]} size="small">
        {row.statusName}
      </NTag>
    )
  }
];

function getRowKey(row: Api.Aiplatform.SkillSummary) {
  return row.id;
}

/** 预填＝回读指派 id 集（含停用行；含表外行时原样保留——见头注释）。 */
async function loadAssignments() {
  loading.value = true;
  const { data, error } = await fetchGetAiplatformSkillAssignments(props.skillSlot);
  if (!error) {
    checkedRowKeys.value = (data?.skills ?? []).map(row => row.id);
  }
  loading.value = false;
}

/** 直接保存（整包替换、无确认弹窗）：PUT → toast（槽位名插值）→ 回读刷新。 */
async function handleSave() {
  saving.value = true;
  const { error } = await fetchAssignAiplatformSkills(props.skillSlot, {
    skillIds: checkedRowKeys.value.map(String)
  });
  saving.value = false;
  if (!error) {
    window.$message?.success($t('page.aiplatform.skillAssignment.saved', { slot: $t(skillSlotLabel[props.skillSlot]) }));
    loadAssignments();
  }
}

onMounted(loadAssignments);
</script>

<template>
  <div class="flex-col-stretch gap-12px">
    <NDataTable
      v-model:checked-row-keys="checkedRowKeys"
      :columns="columns"
      :data="props.skills"
      size="small"
      :row-key="getRowKey"
      :loading="loading || props.optionsLoading"
    />
    <!-- assign 权限码门控保存钮（无码不渲染——六域按钮门控范式） -->
    <div v-if="hasAuth(SKILL_ASSIGN_AUTH)" class="flex justify-end">
      <NButton type="primary" size="small" :loading="saving" @click="handleSave">
        {{ $t('page.aiplatform.skillAssignment.save') }}
      </NButton>
    </div>
  </div>
</template>
