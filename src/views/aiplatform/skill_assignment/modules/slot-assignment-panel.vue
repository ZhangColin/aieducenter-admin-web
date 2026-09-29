<script setup lang="tsx">
/**
 * 槽位指派面板（#68，#65 技能域 T2；#72 预检）——NTabs 单签内容：可勾选技能表 + 动作行（预检＋保存）。
 *
 * 进入（挂载）即 GET /skills/assignments/{slot} 预填勾选（回读含停用行——终态语义：停用不解除
 * 指派，行照常勾选）；选项集由父页传入（技能清单安装行——builtin 不列，指派 400 SKL_011 门控
 * 可达即排除）。保存＝直接 PUT {skillIds[]} 整包替换（清单即终态、空＝清空、无确认弹窗）＋
 * toast＋回读刷新；失败走 onError 统一透传 toast（400 SKL_011 等），勾选态保留可修正重试。
 * 回读 id 可能含表外行（他端并发指派且本页清单未刷新）——checkedRowKeys 原样保留：表外勾选
 * 不渲染但随下次整包 PUT 送回，不丢他端生效的指派（整包替换语义）。
 *
 * 预检（#72，spec #73 grill Q1–Q7）：手动按钮发起（传点击时勾选快照）、空清单禁用、发起即清
 * 旧、15s 量级延迟由按钮 loading 承载（不自动重试）；三态 NAlert 居保存行下方——重叠 warning
 * 逐条四字段（null「—」占位）/ 无重叠 success / 未执行 info 中性（不得伪装成无重叠——红线）；
 * 清单变更旧结果保留＋stale 标注（派生比较，复原快照自然消解）；非阻断双向：预检与保存互不
 * 禁用、预检失败不落结果区只走 onError；结果随面板卸载丢弃（与未保存勾选同命）。
 */
import { computed, onMounted, ref } from 'vue';
import { NButton, NTag } from 'naive-ui';
import type { DataTableColumn, DataTableRowKey } from 'naive-ui';
import { SKILL_ASSIGN_AUTH, skillAssignmentStatusTagColor, skillSlotLabel } from '@/constants/aiplatform';
import { fetchAssignAiplatformSkills, fetchGetAiplatformSkillAssignments, fetchPrecheckAiplatformSkillAssignment } from '@/service/api';
import { useAuth } from '@/hooks/business/auth';
import { useRouterPush } from '@/hooks/common/router';
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
const { routerPushByKey } = useRouterPush();

const loading = ref(false);
const saving = ref(false);
const checkedRowKeys = ref<DataTableRowKey[]>([]);

/** 最近一次预检（发起时快照＋回执）；发起即清旧（防新旧混读）、失败不落结果区（onError 统一 toast）。 */
const precheck = ref<null | { snapshot: string[]; result: Api.Aiplatform.SkillAssignmentPrecheck }>(null);
const prechecking = ref(false);

/** 清单已变更（Q4 派生比较）：当前勾选 ≠ 预检快照——在途/落地后变更都覆盖，复原快照自然消解。 */
const precheckStale = computed(() => {
  if (!precheck.value) return false;
  const snapshot = [...precheck.value.snapshot].sort().join(',');
  const current = checkedRowKeys.value.map(String).sort().join(',');
  return snapshot !== current;
});

/** 三态视觉（Q3）：重叠＝warning / 无重叠＝success / 未执行＝info 中性（绝不 success 色——红线）。 */
const precheckAlertType = computed(() => {
  if (!precheck.value?.result.executed) return 'info' as const;
  return precheck.value.result.hints.length > 0 ? ('warning' as const) : ('success' as const);
});

const precheckTitle = computed(() => {
  if (!precheck.value) return '';
  const { executed, hints } = precheck.value.result;
  if (!executed) return $t('page.aiplatform.skillAssignment.precheckResult.notExecuted');
  return hints.length > 0
    ? $t('page.aiplatform.skillAssignment.precheckResult.overlapFound', { count: hints.length })
    : $t('page.aiplatform.skillAssignment.precheckResult.noOverlap');
});

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

/** 直接保存（整包替换、无确认弹窗）：PUT → toast（槽位名插值）→ 回读刷新。预检结果不拦此流（非阻断）。 */
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

/** 手动预检（Q1）：传点击时勾选快照；发起即清旧；不自动重试（executed=false 是预期内降级态）。 */
async function handlePrecheck() {
  const snapshot = checkedRowKeys.value.map(String);
  prechecking.value = true;
  precheck.value = null;
  const { data, error } = await fetchPrecheckAiplatformSkillAssignment(props.skillSlot, { skillIds: snapshot });
  prechecking.value = false;
  if (!error && data) {
    precheck.value = { snapshot, result: data };
  }
}

onMounted(loadAssignments);
</script>

<template>
  <div class="flex-col-stretch gap-12px">
    <!--
 选项集空引导：安装技能为 0 → 无行可勾（表内建技能不列、契约不可指派——空表只剩「暂无数据」
         会让「怎么指派」无从下手，#68 空态实录）。指派了必先安装（卸载 409 先解绑）→ 此时保存无意义，
         整签换 NEmpty＋跳技能管理安装入口。 
-->
    <NEmpty
      v-if="!loading && !props.optionsLoading && props.skills.length === 0"
      class="py-24px"
      :description="$t('page.aiplatform.skillAssignment.empty.description')"
    >
      <template #extra>
        <NButton size="small" @click="routerPushByKey('aiplatform_skill')">
          {{ $t('page.aiplatform.skillAssignment.empty.action') }}
        </NButton>
      </template>
    </NEmpty>
    <template v-else>
      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="props.skills"
        size="small"
        :row-key="getRowKey"
        :loading="loading || props.optionsLoading"
      />
      <!-- assign 权限码门控动作行（预检＋保存同码；非阻断双向——互不禁用）；空勾选预检禁用（判定对象为空） -->
      <div v-if="hasAuth(SKILL_ASSIGN_AUTH)" class="flex justify-end gap-12px">
        <NButton size="small" :loading="prechecking" :disabled="checkedRowKeys.length === 0" @click="handlePrecheck">
          {{ $t('page.aiplatform.skillAssignment.precheck') }}
        </NButton>
        <NButton type="primary" size="small" :loading="saving" @click="handleSave">
          {{ $t('page.aiplatform.skillAssignment.save') }}
        </NButton>
      </div>
      <!--
 预检三态结果区（#72 grill Q3–Q6）：重叠 warning 逐条四字段（null「—」占位、结构恒定）/
           无重叠 success / 未执行 info 中性；清单变更保留＋stale 标注；发起即清旧、切签随面板丢弃 
-->
      <NAlert v-if="precheck" :type="precheckAlertType" class="text-left">
        <div class="font-500">{{ precheckTitle }}</div>
        <div v-if="precheck.result.hints.length > 0" class="flex-col-stretch gap-8px">
          <div v-for="(hint, index) in precheck.result.hints" :key="index" class="flex-col-stretch gap-2px text-13px">
            <div>
              <span class="mr-8px inline-block w-70px shrink-0 opacity-60">
                {{ $t('page.aiplatform.skillAssignment.precheckResult.skills') }}
              </span>
              <span class="font-500">{{ hint.skills.join('、') }}</span>
            </div>
            <div>
              <span class="mr-8px inline-block w-70px shrink-0 opacity-60">
                {{ $t('page.aiplatform.skillAssignment.precheckResult.counterpart') }}
              </span>
              {{ hint.counterpart ?? '—' }}
            </div>
            <div>
              <span class="mr-8px inline-block w-70px shrink-0 opacity-60">
                {{ $t('page.aiplatform.skillAssignment.precheckResult.overlap') }}
              </span>
              {{ hint.overlap ?? '—' }}
            </div>
            <div>
              <span class="mr-8px inline-block w-70px shrink-0 opacity-60">
                {{ $t('page.aiplatform.skillAssignment.precheckResult.resolution') }}
              </span>
              {{ hint.resolution ?? '—' }}
            </div>
          </div>
        </div>
        <div v-if="precheckStale" class="mt-8px text-13px opacity-75">
          {{ $t('page.aiplatform.skillAssignment.precheckResult.stale') }}
        </div>
      </NAlert>
    </template>
  </div>
</template>
