<script setup lang="ts">
/**
 * 收尾卡载荷结构化呈现（#64，admin#75 契约点亮）——两承载面共用单点：
 * 对话史 kind=5 条目 + 版本详情锚定（#88 同载荷，admin#75 @Schema 文档化）。
 *
 * **可缺省键＝该轮无该事实**（全字段可选，按存在渲染；false 是事实照常渲染「否」）；
 * durationBreakdown 为平台分析口径（文档明示呈现可忽略）不渲染；payload null → 缺位兜底文案。
 */
import { $t } from '@/locales';

defineOptions({ name: 'AiplatformClosingCard' });

const props = defineProps<{
  /** 收尾卡载荷（缺失/形状不符 → 缺位兜底文案） */
  closing?: Api.Aiplatform.ClosingCardPayload | null;
}>();

/** durationMs → 「x 时 x 分 x 秒」人性化（高位为零省略、恒带秒位——0ms 也落「0 秒」不空行）。 */
function formatDuration(ms?: number): string {
  if (ms == null) return '-';
  const totalSeconds = Math.round(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (hours) parts.push($t('page.aiplatform.project.drawer.durationH', { n: hours }));
  if (hours || minutes) parts.push($t('page.aiplatform.project.drawer.durationM', { n: minutes }));
  parts.push($t('page.aiplatform.project.drawer.durationS', { n: seconds }));
  return parts.join(' ');
}
</script>

<template>
  <NEmpty v-if="!props.closing" size="small" :description="$t('page.aiplatform.project.drawer.closingMissing')" />
  <div v-else class="desc-table">
    <div v-if="props.closing.summary" class="desc-row">
      <div class="desc-label">{{ $t('page.aiplatform.project.drawer.closingSummary') }}</div>
      <div class="desc-value"><span class="text-13px">{{ props.closing.summary }}</span></div>
    </div>
    <div v-if="props.closing.prdChanged != null" class="desc-row">
      <div class="desc-label">{{ $t('page.aiplatform.project.drawer.closingPrdChanged') }}</div>
      <div class="desc-value">
        <span class="text-13px">
          {{ props.closing.prdChanged ? $t('common.yesOrNo.yes') : $t('common.yesOrNo.no') }}
        </span>
        <span v-if="props.closing.prdChanged && props.closing.prdNote" class="ml-8px text-12px text-#999">
          {{ props.closing.prdNote }}
        </span>
      </div>
    </div>
    <div v-if="props.closing.systemChanged != null" class="desc-row">
      <div class="desc-label">{{ $t('page.aiplatform.project.drawer.closingSystemChanged') }}</div>
      <div class="desc-value">
        <span class="text-13px">
          {{ props.closing.systemChanged ? $t('common.yesOrNo.yes') : $t('common.yesOrNo.no') }}
        </span>
        <span v-if="props.closing.systemChanged && props.closing.systemNote" class="ml-8px text-12px text-#999">
          {{ props.closing.systemNote }}
        </span>
      </div>
    </div>
    <div v-if="props.closing.files?.length" class="desc-row">
      <div class="desc-label">{{ $t('page.aiplatform.project.drawer.closingFiles') }}</div>
      <div class="desc-value">
        <div class="flex flex-col gap-2px">
          <div v-for="file in props.closing.files" :key="file.path" class="font-mono text-12px">
            {{ file.path }}
            <span class="ml-4px text-#18a058 dark:text-#63e2b7">+{{ file.added }}</span>
            <span class="ml-4px text-#d03050 dark:text-#e88080">-{{ file.removed }}</span>
          </div>
        </div>
      </div>
    </div>
    <div v-if="props.closing.durationMs != null" class="desc-row">
      <div class="desc-label">{{ $t('page.aiplatform.project.drawer.closingDuration') }}</div>
      <div class="desc-value"><span class="text-13px">{{ formatDuration(props.closing.durationMs) }}</span></div>
    </div>
    <div v-if="props.closing.selfTest?.total != null" class="desc-row">
      <div class="desc-label">{{ $t('page.aiplatform.project.drawer.closingSelfTest') }}</div>
      <div class="desc-value">
        <span class="text-13px">
          {{ $t('page.aiplatform.project.drawer.closingSelfTestItems', { n: props.closing.selfTest.total }) }}
        </span>
      </div>
    </div>
    <div v-if="props.closing.version" class="desc-row">
      <div class="desc-label">{{ $t('page.aiplatform.project.drawer.closingVersion') }}</div>
      <div class="desc-value"><span class="font-mono text-12px">{{ props.closing.version }}</span></div>
    </div>
  </div>
</template>

<style scoped>
.desc-table {
  border: 1px solid var(--n-border-color);
  border-radius: var(--n-border-radius);
}
.desc-row {
  display: flex;
  border-bottom: 1px solid var(--n-border-color);
}
.desc-row:last-child {
  border-bottom: none;
}
.desc-label {
  flex-shrink: 0;
  width: 120px;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--n-text-color-3);
  background: var(--n-color-embedded);
  border-right: 1px solid var(--n-border-color);
}
.desc-value {
  flex: 1;
  min-width: 0;
  padding: 8px 12px;
  display: flex;
  align-items: center;
}
</style>
