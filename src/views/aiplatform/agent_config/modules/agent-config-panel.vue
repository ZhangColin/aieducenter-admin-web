<script setup lang="ts">
/**
 * 智能体配置面板（#69，#65 技能域 T3）——NTabs 单座签内容：上半编辑卡＋下半留痕时间线卡。
 *
 * 编辑卡：systemPrompt NTextarea＋modelId NInput 手输（契约无白名单——错值靠留痕回滚兜底）；
 * 覆盖标记「已覆盖/默认」tag＋默认值灰字预览；清空字段提交＝清覆盖回落默认（契约全量终态：
 * null/纯空白即回落），不加「恢复默认」专用按钮。保存四字段全量回传——webSearch/fetchUrl
 * 两 flag 以 GET 回显原值透传（契约「缺省＝true 开」，防静默误开）；成功 toast＋回读刷新，
 * 失败走 onError 透传 toast、表单保留可修正重试。
 *
 * 留痕时间线：服务端 operatedAt 倒序如实渲染，条目**只渲染变化项**（old/new 四件对中
 * old≠new 的字段；null 显「（默认）」）；条目「回滚」＝$dialog.warning 确认后把该次变更前
 * old* 四值 PUT 写回（＝一次新变更、将留新痕——provider 无专用回滚端点）→ toast＋编辑卡/
 * 时间线刷新。
 */
import { computed, onMounted, reactive, ref } from 'vue';
import { AGENT_CONFIG_UPDATE_AUTH, agentKeyLabel } from '@/constants/aiplatform';
import {
  fetchGetAiplatformAgentConfig,
  fetchGetAiplatformAgentConfigTraces,
  fetchUpdateAiplatformAgentConfig
} from '@/service/api';
import { useAuth } from '@/hooks/business/auth';
import { $t } from '@/locales';
import { formatDateTime } from '@/utils/common';

defineOptions({ name: 'AgentConfigPanel' });

const props = defineProps<{
  /** 配置座稳定键（路径段寻址；签 label 由父页 tab 承载，toast 插值用 agentKeyLabel）。 */
  agentKey: Api.Aiplatform.AgentKey;
}>();

const { hasAuth } = useAuth();

const loading = ref(false);
const saving = ref(false);
const config = ref<Api.Aiplatform.AgentConfig | null>(null);
const traces = ref<Api.Aiplatform.AgentConfigTrace[]>([]);

/** 编辑态（生效值直灌——未覆盖时即默认原文，清空提交＝回落）；保存按原样透传（契约收纯空白＝清覆盖）。 */
const form = reactive({ systemPrompt: '', modelId: '' });

/** 卡片题（读面到手直读 agentName；在途回落端侧映射——签 label 同源）。 */
const panelTitle = computed(() => config.value?.agentName ?? $t(agentKeyLabel[props.agentKey]));

/** 进入即并行拉读面＋留痕；成功直灌编辑态（失败走 onError 透传，卡面留空态）。 */
async function load() {
  loading.value = true;
  const [configRes, tracesRes] = await Promise.all([
    fetchGetAiplatformAgentConfig(props.agentKey),
    fetchGetAiplatformAgentConfigTraces(props.agentKey)
  ]);
  if (!configRes.error && configRes.data) {
    config.value = configRes.data;
    form.systemPrompt = configRes.data.systemPrompt;
    form.modelId = configRes.data.modelId;
  }
  if (!tracesRes.error) traces.value = tracesRes.data ?? [];
  loading.value = false;
}

/** 保存（全量四字段回传）：PUT → toast（座名插值）→ 回读刷新（编辑卡＋时间线一起）。 */
async function handleSave() {
  saving.value = true;
  const { error: err } = await fetchUpdateAiplatformAgentConfig(props.agentKey, {
    systemPrompt: form.systemPrompt,
    modelId: form.modelId,
    // 两 flag 原值透传（防静默误开）；config 表单不动开关——开关走工具面 tool 端点
    webSearchEnabled: config.value!.webSearchEnabled,
    fetchUrlEnabled: config.value!.fetchUrlEnabled
  });
  saving.value = false;
  if (!err) {
    window.$message?.success($t('page.aiplatform.agentConfig.edit.saved', { agent: panelTitle.value }));
    load();
  }
}

/** 留痕值面四件键（old/new 对的字段名——变化项投影与 label 映射共用）。 */
type TraceFieldKey = 'systemPrompt' | 'modelId' | 'webSearchEnabled' | 'fetchUrlEnabled';

interface TraceFieldChange {
  key: TraceFieldKey;
  from: string | boolean | null;
  to: string | boolean | null;
}

/** 变化项 label（i18n key 单点——编辑卡两字段与时间线共用同款键）。 */
const FIELD_LABEL: Record<TraceFieldKey, App.I18n.I18nKey> = {
  systemPrompt: 'page.aiplatform.agentConfig.field.systemPrompt',
  modelId: 'page.aiplatform.agentConfig.field.modelId',
  webSearchEnabled: 'page.aiplatform.agentConfig.field.webSearch',
  fetchUrlEnabled: 'page.aiplatform.agentConfig.field.fetchUrl'
};

function changedFields(trace: Api.Aiplatform.AgentConfigTrace): TraceFieldChange[] {
  const pairs: TraceFieldChange[] = [
    { key: 'systemPrompt', from: trace.oldSystemPrompt, to: trace.newSystemPrompt },
    { key: 'modelId', from: trace.oldModelId, to: trace.newModelId },
    { key: 'webSearchEnabled', from: trace.oldWebSearchEnabled, to: trace.newWebSearchEnabled },
    { key: 'fetchUrlEnabled', from: trace.oldFetchUrlEnabled, to: trace.newFetchUrlEnabled }
  ];
  return pairs.filter(pair => pair.from !== pair.to);
}

/** 变化值呈现：字符串 null＝「（默认）」；布尔＝开/关。 */
function formatFieldValue(value: string | boolean | null): string {
  if (value === null) return $t('page.aiplatform.agentConfig.defaultValue');
  if (typeof value === 'boolean') return $t(value ? 'page.aiplatform.agentConfig.stateOn' : 'page.aiplatform.agentConfig.stateOff');
  return value;
}

/** 回滚＝把该次变更前 old* 四值快照 PUT 写回（一次新变更、将留新痕）→ toast＋双卡刷新。 */
function handleRollback(trace: Api.Aiplatform.AgentConfigTrace) {
  window.$dialog?.warning({
    title: $t('page.aiplatform.agentConfig.traces.rollbackTitle'),
    content: $t('page.aiplatform.agentConfig.traces.rollbackTip'),
    positiveText: $t('common.confirm'),
    negativeText: $t('common.cancel'),
    onPositiveClick: async () => {
      const { error: err } = await fetchUpdateAiplatformAgentConfig(props.agentKey, {
        systemPrompt: trace.oldSystemPrompt,
        modelId: trace.oldModelId,
        webSearchEnabled: trace.oldWebSearchEnabled,
        fetchUrlEnabled: trace.oldFetchUrlEnabled
      });
      if (!err) {
        window.$message?.success($t('page.aiplatform.agentConfig.traces.rolledBack'));
        load();
      }
    }
  });
}

onMounted(load);
</script>

<template>
  <div class="flex-col-stretch gap-12px">
    <!-- 编辑卡：覆盖标记＋默认预览＋清空即回落 -->
    <NCard :title="panelTitle" :bordered="false" size="small">
      <template #header-extra>
        <!-- 最近写者（契约字段直读；从未配置＝null 不渲染） -->
        <span v-if="config?.operatorName" class="text-12px text-gray-400">
          {{ $t('page.aiplatform.agentConfig.edit.lastWrite', { name: config.operatorName, time: formatDateTime(config.updatedAt) }) }}
        </span>
      </template>
      <div v-if="loading" class="flex-center min-h-200px">
        <NSpin />
      </div>
      <template v-else-if="config">
        <NForm label-placement="top" :show-feedback="false" class="flex-col-stretch gap-16px">
          <NFormItem>
            <template #label>
              <span class="flex items-center gap-8px">
                {{ $t('page.aiplatform.agentConfig.edit.systemPrompt') }}
                <NTag size="small" :type="config.systemPromptOverridden ? 'warning' : 'default'">
                  {{ $t(config.systemPromptOverridden ? 'page.aiplatform.agentConfig.edit.overridden' : 'page.aiplatform.agentConfig.edit.defaultTag') }}
                </NTag>
              </span>
            </template>
            <NInput
              v-model:value="form.systemPrompt"
              type="textarea"
              :autosize="{ minRows: 6, maxRows: 14 }"
              :placeholder="$t('page.aiplatform.agentConfig.edit.systemPromptPlaceholder')"
            />
            <!-- 默认值灰字预览（清空覆盖即落此值） -->
            <div class="mt-4px line-clamp-2 text-12px text-gray-400">
              {{ $t('page.aiplatform.agentConfig.edit.defaultPrompt') }}{{ config.defaultSystemPrompt }}
            </div>
          </NFormItem>
          <NFormItem>
            <template #label>
              <span class="flex items-center gap-8px">
                {{ $t('page.aiplatform.agentConfig.edit.modelId') }}
                <NTag size="small" :type="config.modelIdOverridden ? 'warning' : 'default'">
                  {{ $t(config.modelIdOverridden ? 'page.aiplatform.agentConfig.edit.overridden' : 'page.aiplatform.agentConfig.edit.defaultTag') }}
                </NTag>
              </span>
            </template>
            <NInput v-model:value="form.modelId" :placeholder="$t('page.aiplatform.agentConfig.edit.modelIdPlaceholder')" />
            <div class="mt-4px text-12px text-gray-400">
              {{ $t('page.aiplatform.agentConfig.edit.defaultModelId') }}{{ config.defaultModelId }}
            </div>
          </NFormItem>
        </NForm>
        <!-- update 权限码门控保存钮（无码不渲染——六域按钮门控范式） -->
        <div v-if="hasAuth(AGENT_CONFIG_UPDATE_AUTH)" class="mt-16px flex justify-end">
          <NButton type="primary" size="small" :loading="saving" @click="handleSave">
            {{ $t('page.aiplatform.agentConfig.edit.save') }}
          </NButton>
        </div>
      </template>
    </NCard>

    <!-- 留痕时间线卡：倒序、只渲染变化项、null 显（默认）、条目回滚 -->
    <NCard :title="$t('page.aiplatform.agentConfig.traces.title')" :bordered="false" size="small">
      <div v-if="loading" class="flex-center min-h-120px">
        <NSpin />
      </div>
      <div v-else-if="traces.length" class="pt-8px">
        <!-- 服务端倒序（最近先）——如实渲染 -->
        <NTimeline size="large">
          <NTimelineItem v-for="trace in traces" :key="trace.id" type="info" :time="formatDateTime(trace.operatedAt)">
            <div v-for="field in changedFields(trace)" :key="field.key" class="mt-2px text-13px">
              <span class="text-[var(--n-text-color-3)]">{{ $t(FIELD_LABEL[field.key]) }}：</span>
              <!-- 长文本截断悬浮全文（title 直显），null＝（默认） -->
              <span class="inline-block max-w-480px truncate align-middle font-mono" :title="String(field.from)">
                {{ formatFieldValue(field.from) }}
              </span>
              <span class="mx-4px">→</span>
              <span class="inline-block max-w-480px truncate align-middle font-mono" :title="String(field.to)">
                {{ formatFieldValue(field.to) }}
              </span>
            </div>
            <div class="mt-4px flex items-center justify-between">
              <span class="text-12px text-[var(--n-text-color-3)]">{{ trace.operatorName }}</span>
              <!-- 回滚与保存同 PUT 配置写——update 码同门控 -->
              <NButton v-if="hasAuth(AGENT_CONFIG_UPDATE_AUTH)" size="tiny" quaternary type="warning" @click="handleRollback(trace)">
                {{ $t('page.aiplatform.agentConfig.traces.rollback') }}
              </NButton>
            </div>
          </NTimelineItem>
        </NTimeline>
      </div>
      <div v-else class="flex-center min-h-120px text-14px text-gray-400">
        {{ $t('page.aiplatform.agentConfig.traces.empty') }}
      </div>
    </NCard>
  </div>
</template>
