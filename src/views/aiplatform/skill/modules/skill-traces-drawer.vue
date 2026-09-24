<script setup lang="ts">
/**
 * AI 平台技能更新留痕抽屉（#67）——按**来源包**维度的时间线（行级「留痕」动作挂入口；
 * 留痕主体是包不是技能，故不放技能详情抽屉）。GET /skills/update-traces?sourcePackage=
 * （必传）：倒序 append-only、卸载不删痕——服务端已按 operatedAt 倒序，前端如实渲染。
 */
import { NSpin, NDrawer, NDrawerContent, NTimeline, NTimelineItem } from 'naive-ui';
import { ref, watch } from 'vue';
import { fetchGetAiplatformSkillUpdateTraces } from '@/service/api';
import { $t } from '@/locales';
import { formatDateTime } from '@/utils/common';

defineOptions({ name: 'SkillTracesDrawer' });

const props = defineProps<{
  sourcePackage: string;
}>();

const visible = defineModel<boolean>('visible', { default: false });

const traces = ref<Api.Aiplatform.SkillUpdateTrace[]>([]);
const loading = ref(false);

async function loadTraces() {
  if (!props.sourcePackage) return;
  loading.value = true;
  const { data, error } = await fetchGetAiplatformSkillUpdateTraces(props.sourcePackage);
  loading.value = false;
  if (!error) traces.value = data ?? [];
}

watch(visible, val => {
  if (val) {
    traces.value = [];
    loadTraces();
  }
});
</script>

<template>
  <NDrawer v-model:show="visible" :width="560">
    <NDrawerContent :title="$t('page.aiplatform.skill.tracesDrawer.title')" closable>
      <div v-if="loading" class="flex-center min-h-300px">
        <NSpin />
      </div>
      <div v-else-if="traces.length" class="pt-8px">
        <!-- 服务端倒序（最近先）——如实渲染；from→to mono 直读 -->
        <NTimeline size="large">
          <NTimelineItem v-for="(trace, i) in traces" :key="`${trace.operatedAt}-${i}`" type="info" :time="formatDateTime(trace.operatedAt)">
            <div class="break-all font-mono text-13px">{{ trace.fromVersion }} → {{ trace.toVersion }}</div>
            <div class="mt-2px text-12px text-[var(--n-text-color-3)]">{{ trace.operatorName }}</div>
          </NTimelineItem>
        </NTimeline>
      </div>
      <div v-else class="flex-center min-h-300px text-14px text-gray-400">
        {{ $t('page.aiplatform.skill.tracesDrawer.empty') }}
      </div>
    </NDrawerContent>
  </NDrawer>
</template>
