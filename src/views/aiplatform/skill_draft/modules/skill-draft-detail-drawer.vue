<script setup lang="tsx">
/**
 * AI 平台草稿详情抽屉（#71）——人审判读面（审核口径见 aiplatform skill-audit-guide §五
 * 四要素：真伪/重叠/description 三要素/血统可溯——前端仅呈现材料，判定是人审职责）。
 *
 * 720 三节：基本信息 desc-table（清单行同形＋血统三件，id mono）/ scanFindings 投影卡片
 * （untyped map 七键缺键跳过、值直显——T8 closing「文档化程度足够即投影」先例；severity
 * 裸值直显不映射色（值域未文档化）、file:line mono、matchText 代码块）/ 正文全文 pre。
 * **不设终态留痕节**（抽屉只开在途行——终态呈现归拒绝回执）。动作条置顶 emit 回父页
 * 收口（workspace 抽屉先例）；promote/reject 两码分别 `v-if`。
 */
import { computed, ref, watch } from 'vue';
import { NButton, NDrawer, NDrawerContent, NSpin, NTag } from 'naive-ui';
import {
  skillDraftScanVerdictLabel,
  skillDraftScanVerdictTagColor,
  skillDraftWriteAuth,
  skillSlotLabel
} from '@/constants/aiplatform';
import { fetchGetAiplatformSkillDraft } from '@/service/api';
import { useAuth } from '@/hooks/business/auth';
import { $t } from '@/locales';
import { formatDateTime } from '@/utils/common';

defineOptions({ name: 'SkillDraftDetailDrawer' });

const props = defineProps<{
  draftId: string;
}>();

const emit = defineEmits<{
  /** 请求两审核写之一（$dialog 确认 + 请求在父页单点收口；draft 携技能名/柄供对账）。 */
  action: [action: Api.Aiplatform.SkillDraftAction, draft: Api.Aiplatform.SkillDraftSummary];
}>();

const visible = defineModel<boolean>('visible', { default: false });

const { hasAuth } = useAuth();

const detail = ref<Api.Aiplatform.SkillDraftDetail | null>(null);
const loading = ref(false);

async function loadDetail() {
  loading.value = true;
  const { data, error } = await fetchGetAiplatformSkillDraft(props.draftId);
  loading.value = false;
  if (!error) detail.value = data;
}

watch(visible, val => {
  if (val) {
    detail.value = null;
    loadDetail();
  }
});

/** 投影键序（untyped map 缺键跳过——七键仅 swagger 描述层）。 */
const FINDING_KEYS = ['patternId', 'severity', 'category', 'file', 'line', 'matchText', 'description'] as const;

/** findings 投影：缺键跳过、值直显（string 原样 / number·boolean String / 其余 JSON 串）。 */
function fmtVal(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

interface FindingView {
  patternId?: string;
  severity?: string;
  category?: string;
  file?: string;
  line?: string;
  matchText?: string;
  description?: string;
}

/** 七键投影（file+line 合成「位置」mono、matchText 单列代码块），缺键跳过。 */
const findings = computed<FindingView[]>(() =>
  (detail.value?.scanFindings ?? []).map(raw => {
    const out: FindingView = {};
    for (const key of FINDING_KEYS) {
      const value = raw[key];
      if (value !== undefined && value !== null) out[key] = fmtVal(value);
    }
    return out;
  })
);
</script>

<template>
  <NDrawer v-model:show="visible" :width="720">
    <NDrawerContent :title="$t('page.aiplatform.skillDraft.detailTitle')" closable>
      <div v-if="loading" class="flex-center min-h-300px">
        <NSpin />
      </div>
      <div v-else-if="detail" class="flex-col-stretch gap-16px">
        <!-- 动作条（双入口之二）：晋升/拒绝两码分别 v-if；emit 回父页单点收口 -->
        <div v-if="hasAuth(skillDraftWriteAuth.promote) || hasAuth(skillDraftWriteAuth.reject)" class="flex flex-wrap gap-8px">
          <NButton
            v-if="hasAuth(skillDraftWriteAuth.promote)"
            type="primary"
            size="small"
            @click="emit('action', 'promote', detail)"
          >
            {{ $t('page.aiplatform.skillDraft.action.promote') }}
          </NButton>
          <NButton
            v-if="hasAuth(skillDraftWriteAuth.reject)"
            type="error"
            ghost
            size="small"
            @click="emit('action', 'reject', detail)"
          >
            {{ $t('page.aiplatform.skillDraft.action.reject') }}
          </NButton>
        </div>

        <!-- 一、基本信息（清单行同形＋血统三件；id 为 TSID 串 mono 直读） -->
        <div>
          <div class="mb-8px font-600">{{ $t('page.aiplatform.skillDraft.basic') }}</div>
          <div class="grid grid-cols-[110px_1fr] gap-x-16px gap-y-10px text-14px">
            <span class="text-right text-#999">{{ $t('page.aiplatform.skillDraft.id') }}</span>
            <span class="break-all font-mono">{{ detail.id }}</span>
            <span class="text-right text-#999">{{ $t('page.aiplatform.skillDraft.name') }}</span>
            <span>{{ detail.name }}</span>
            <span class="text-right text-#999">{{ $t('page.aiplatform.skillDraft.description') }}</span>
            <span>{{ detail.description }}</span>
            <span class="text-right text-#999">{{ $t('page.aiplatform.skillDraft.projectId') }}</span>
            <span class="break-all font-mono">{{ detail.projectId }}</span>
            <span class="text-right text-#999">{{ $t('page.aiplatform.skillDraft.runId') }}</span>
            <span class="break-all font-mono">{{ detail.runId }}</span>
            <span class="text-right text-#999">{{ $t('page.aiplatform.skillDraft.slot') }}</span>
            <span>{{ $t(skillSlotLabel[detail.slot]) }}</span>
            <span class="text-right text-#999">{{ $t('page.aiplatform.skillDraft.scanVerdict') }}</span>
            <span>
              <NTag :type="skillDraftScanVerdictTagColor[detail.scanVerdict]" size="small">
                {{ $t(skillDraftScanVerdictLabel[detail.scanVerdict]) }}
              </NTag>
            </span>
            <span class="text-right text-#999">{{ $t('page.aiplatform.skillDraft.createdAt') }}</span>
            <span>{{ formatDateTime(detail.createdAt) }}</span>
          </div>
        </div>

        <!-- 二、scanFindings 投影（untyped map：缺键跳过、值直显；空列表＝无发现） -->
        <div>
          <div class="mb-8px font-600">{{ $t('page.aiplatform.skillDraft.finding.title') }}</div>
          <span v-if="findings.length === 0" class="text-13px text-gray-400">
            {{ $t('page.aiplatform.skillDraft.finding.empty') }}
          </span>
          <div v-else class="flex-col-stretch gap-8px">
            <div
              v-for="(finding, i) in findings"
              :key="i"
              class="rounded-8px border border-gray-200 px-12px py-10px dark:border-gray-700"
            >
              <div class="grid grid-cols-[70px_1fr] gap-x-12px gap-y-6px text-13px">
                <template v-if="finding.patternId">
                  <span class="text-right text-#999">{{ $t('page.aiplatform.skillDraft.finding.patternId') }}</span>
                  <span class="break-all font-mono">{{ finding.patternId }}</span>
                </template>
                <template v-if="finding.severity">
                  <!-- severity 裸值直显不映射色（值域未文档化） -->
                  <span class="text-right text-#999">{{ $t('page.aiplatform.skillDraft.finding.severity') }}</span>
                  <span>{{ finding.severity }}</span>
                </template>
                <template v-if="finding.category">
                  <span class="text-right text-#999">{{ $t('page.aiplatform.skillDraft.finding.category') }}</span>
                  <span>{{ finding.category }}</span>
                </template>
                <template v-if="finding.file || finding.line">
                  <span class="text-right text-#999">{{ $t('page.aiplatform.skillDraft.finding.location') }}</span>
                  <span class="break-all font-mono">{{ finding.line ? `${finding.file}:${finding.line}` : finding.file }}</span>
                </template>
                <template v-if="finding.description">
                  <span class="text-right text-#999">{{ $t('page.aiplatform.skillDraft.finding.description') }}</span>
                  <span>{{ finding.description }}</span>
                </template>
              </div>
              <!-- 匹配片段：代码块 -->
              <pre
                v-if="finding.matchText"
                class="mt-8px overflow-auto whitespace-pre-wrap rounded-6px bg-#f5f5f5 p-8px text-12px leading-5"
              >{{ finding.matchText }}</pre>
            </div>
          </div>
        </div>

        <!-- 三、正文全文（自产 a-only 无 scripts；判读主体，只读） -->
        <div>
          <div class="mb-8px font-600">{{ $t('page.aiplatform.skillDraft.content') }}</div>
          <pre class="max-h-60vh overflow-auto whitespace-pre-wrap rounded-8px bg-#f5f5f5 p-12px text-13px leading-6">{{ detail.content }}</pre>
        </div>
      </div>
    </NDrawerContent>
  </NDrawer>
</template>
