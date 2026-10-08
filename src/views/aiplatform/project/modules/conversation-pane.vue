<script setup lang="ts">
/**
 * 项目详情抽屉·对话史 pane（#58，#64 载荷点亮）——全量同序（id 升序=对话序，服务端定死不开放分页）。
 *
 * 头部四字段 text/kind/answered/at：kind 用响应 kindName 直读（ADR-0009）+ 语义色 tag；
 * answered 仅问答卡（kind=3）有语义——true=已答 / false=待答（挂起）双态 tag，其余 kind 恒 false 不渲染。
 * 会话来源标注（#77，admin#98）：sessionSource=2（设计会话）条目在 kindName 右邻加灰阶小 tag
 * 显 sessionSourceName 直读；null=主会话**缺省**不渲染任何标注（勿当未知值补归属）——时间线保持
 * 平铺不分组、无来源过滤器（作用域改稿发言 null 与主会话无法区分，分组即误归属）。
 * 四载荷按 admin#75 文档化结构渲染（question/closing/attachments/quote——载荷缺失/形状不符走空态不报错）：
 * - kind=3 问答卡：summary + data.questions 投影（header/question/options/可多选）——toolCalls 为
 *   服务侧续跑重建最小面，不呈现；
 * - kind=5 收尾卡：ClosingCard 结构化呈现（与版本详情 #88 同载荷共组件）；
 * - kind=7 报价卡：事件（quoted=首次报价 / repriced=改价）+ orderId 可复制——**不含金额**
 *   （视镜语义 ADR-0017，金额/状态须取订单当前态，v1 不取）；repriced 带运营提示（改价即刻对用户可见）；
 * - kind=1 用户发言可随带圈注附件 chip（select 点选 / circle 圈选 / comment 历史兼容，#97）。
 */
import { NTag } from 'naive-ui';
import { onMounted, ref } from 'vue';
import { fetchGetAiplatformProjectConversation } from '@/service/api';
import { conversationKindTagColor } from '@/constants/aiplatform';
import { $t } from '@/locales';
import { formatDateTime } from '@/utils/common';
import ClosingCard from './closing-card.vue';

defineOptions({ name: 'ProjectConversationPane' });

const props = defineProps<{
  projectId: string;
}>();

const entries = ref<Api.Aiplatform.ConversationEntry[]>([]);
const loading = ref(false);

async function load() {
  loading.value = true;
  const { data, error } = await fetchGetAiplatformProjectConversation(props.projectId);
  loading.value = false;
  if (!error) entries.value = data;
}

onMounted(load);

/* ---- kind=3 问答卡投影（防御直读：脏条目滤除，载荷缺位走空态） ---- */

type QuestionItem = NonNullable<NonNullable<Api.Aiplatform.QuestionCardPayload['data']>['questions']>[number];

/** 有效问题条目（question/header 至少其一；载荷形状不符整体滤除）。 */
function questionItems(entry: Api.Aiplatform.ConversationEntry): QuestionItem[] {
  return (entry.question?.data?.questions ?? []).filter(item => Boolean(item && (item.question || item.header)));
}

/** 问答卡有呈现内容（summary 或 ≥1 有效问题）——否则空态。 */
function hasQuestionContent(entry: Api.Aiplatform.ConversationEntry): boolean {
  return Boolean(entry.question?.summary) || questionItems(entry).length > 0;
}

/** 载荷条目（kind 3/5/7）无可呈现内容——空态分支（模板内联 kind 比较撞链式类型收窄，收编函数）。 */
function isPayloadKindWithoutContent(entry: Api.Aiplatform.ConversationEntry): boolean {
  if (entry.kind === 3) return !hasQuestionContent(entry);
  if (entry.kind === 5) return !entry.closing;
  if (entry.kind === 7) return !entry.quote;
  return false;
}

/* ---- kind=1 圈注附件 chip（#97：annotation.kind 三值端侧小映射，未知裸值直显） ---- */

interface AnnotationChip {
  kindLabel: string;
  anchor: string | null;
  note: string | null;
}

const annotationKindLabel: Record<string, App.I18n.I18nKey> = {
  select: 'page.aiplatform.project.drawer.annotationSelect',
  circle: 'page.aiplatform.project.drawer.annotationCircle',
  comment: 'page.aiplatform.project.drawer.annotationComment'
};

/** kind 三值端侧小映射（select/circle/comment）；未知/缺省裸值直显 comment 档（历史兼容位）。 */
function annotationKindToLabel(kind?: string): string {
  if (kind && annotationKindLabel[kind]) return $t(annotationKindLabel[kind]);
  return kind || $t('page.aiplatform.project.drawer.annotationComment');
}

/** 圈注 chip 三元组（kind 标签 + 锚定 mono + 备注）——非 annotation 形状/缺 annotation 整体滤除。 */
function annotationChips(entry: Api.Aiplatform.ConversationEntry): AnnotationChip[] {
  return (entry.attachments ?? [])
    .filter((item): item is Api.Aiplatform.AnnotationAttachment => Boolean(item?.annotation))
    .map(item => {
      const { kind, anchor, note } = item.annotation ?? {};
      const anchorText = anchor?.text ?? anchor?.selector ?? (anchor?.region ? `(${anchor.region.x}, ${anchor.region.y}, ${anchor.region.width}×${anchor.region.height})` : null);
      return {
        kindLabel: annotationKindToLabel(kind),
        anchor: anchorText,
        note: note ?? null
      };
    });
}

/* ---- kind=7 报价卡：event 双态单点（tag 色 + 文案）+ orderId 可复制（clipboard 失败静默——选中文本仍可 Ctrl+C） ---- */

/** 报价事件双态（quoted=首次报价 success / repriced=改价 warning——金额语义事件高亮）。 */
const quoteEventMeta: Record<'quoted' | 'repriced', { type: 'success' | 'warning'; labelKey: App.I18n.I18nKey }> = {
  quoted: { type: 'success', labelKey: 'page.aiplatform.project.drawer.quoteQuoted' },
  repriced: { type: 'warning', labelKey: 'page.aiplatform.project.drawer.quoteRepriced' }
};

async function copyOrderId(orderId: string) {
  try {
    await navigator.clipboard.writeText(orderId);
    window.$message?.success?.($t('page.aiplatform.project.drawer.quoteCopied'));
  } catch {
    // clipboard API 不可用——orderId 以可选中文本呈现，不报错
  }
}
</script>

<template>
  <div v-if="loading" class="flex-center min-h-300px">
    <NSpin />
  </div>
  <NEmpty v-else-if="!entries.length" :description="$t('page.aiplatform.project.drawer.emptyConversation')" />
  <div v-else class="flex-col-stretch gap-12px">
    <div v-for="entry in entries" :key="entry.id" class="conversation-entry rounded-8px border border-#e5e5e5 p-12px dark:border-#2a2a2a">
      <div class="mb-6px flex flex-wrap items-center gap-8px">
        <NTag :type="conversationKindTagColor[entry.kind]" size="small">{{ entry.kindName }}</NTag>
        <!-- #77 会话来源：设计会话（sessionSource=2）灰阶小 tag 直读 sessionSourceName；null=主会话缺省不渲染 -->
        <NTag v-if="entry.sessionSource === 2" type="default" size="small">{{ entry.sessionSourceName }}</NTag>
        <!-- 问答卡作答双态：已答 / 待答（挂起）——仅 kind=3 渲染 -->
        <NTag v-if="entry.kind === 3" :type="entry.answered ? 'success' : 'warning'" size="small" :bordered="false">
          {{ entry.answered ? $t('page.aiplatform.project.drawer.answered') : $t('page.aiplatform.project.drawer.pendingAnswer') }}
        </NTag>
        <span v-if="entry.runId" class="font-mono text-12px text-#999">{{ entry.runId }}</span>
        <span class="ml-auto text-12px text-#999">{{ formatDateTime(entry.at) }}</span>
      </div>

      <!-- 正文区：话语条目 pre 直读；载荷条目按 kind 分面（载荷缺失走空态，不 '-' 占位） -->
      <pre v-if="entry.text" class="m-0 whitespace-pre-wrap text-13px leading-6">{{ entry.text }}</pre>

      <!-- kind=3 问答卡：summary + questions 投影 -->
      <div v-else-if="entry.kind === 3 && hasQuestionContent(entry)" class="flex flex-col gap-6px">
        <span v-if="entry.question?.summary" class="text-13px">{{ entry.question.summary }}</span>
        <div v-for="(item, i) in questionItems(entry)" :key="i" class="rounded-4px bg-#f5f5f5 p-8px dark:bg-#2a2a2a">
          <div class="flex flex-wrap items-center gap-8px">
            <span v-if="item.header" class="font-500 text-13px">{{ item.header }}</span>
            <NTag v-if="item.multiple" size="small" :bordered="false">
              {{ $t('page.aiplatform.project.drawer.questionMultiple') }}
            </NTag>
          </div>
          <div v-if="item.question" class="text-13px">{{ item.question }}</div>
          <div v-if="item.options?.length" class="mt-4px flex flex-wrap gap-6px">
            <NTag v-for="(option, j) in item.options" :key="j" size="small">{{ option.label }}</NTag>
          </div>
        </div>
      </div>

      <!-- kind=5 收尾卡：结构化呈现（与版本详情共组件） -->
      <ClosingCard v-else-if="entry.kind === 5" :closing="entry.closing" />

      <!-- kind=7 报价卡：事件 + orderId（可复制）——不含金额（视镜语义） -->
      <div v-else-if="entry.kind === 7 && entry.quote" class="flex flex-col gap-6px">
        <div class="flex flex-wrap items-center gap-8px">
          <NTag :type="quoteEventMeta[entry.quote.event].type" size="small" :bordered="false">
            {{ $t(quoteEventMeta[entry.quote.event].labelKey) }}
          </NTag>
          <span class="font-mono text-13px">{{ entry.quote.orderId }}</span>
          <NButton size="tiny" quaternary @click="copyOrderId(entry.quote.orderId)">
            {{ $t('page.aiplatform.project.drawer.quoteCopy') }}
          </NButton>
        </div>
        <!-- 运营提示（admin#77）：后台改价即刻对用户可见 -->
        <span v-if="entry.quote.event === 'repriced'" class="text-12px text-#999">
          {{ $t('page.aiplatform.project.drawer.quoteRepricedTip') }}
        </span>
      </div>

      <!-- 载荷条目缺载荷/形状不符（kind 3/5/7 无可呈现内容）——空态不报错；其余 kind 意外 text=null 照 '-' 占位 -->
      <NEmpty v-else-if="isPayloadKindWithoutContent(entry)" size="small" :description="$t('page.aiplatform.project.drawer.payloadMissing')" />
      <pre v-else class="m-0 whitespace-pre-wrap text-13px leading-6">-</pre>

      <!-- kind=1 圈注附件 chip（载荷缺失/形状不符自然不渲染） -->
      <div v-if="entry.kind === 1 && annotationChips(entry).length" class="mt-6px flex flex-wrap gap-6px">
        <div v-for="(chip, i) in annotationChips(entry)" :key="i" class="flex items-center gap-6px rounded-4px bg-#f5f5f5 px-8px py-2px dark:bg-#2a2a2a">
          <NTag size="tiny" :bordered="false">{{ chip.kindLabel }}</NTag>
          <span v-if="chip.anchor" class="font-mono text-12px">{{ chip.anchor }}</span>
          <span v-if="chip.note" class="text-12px text-#999">{{ chip.note }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
