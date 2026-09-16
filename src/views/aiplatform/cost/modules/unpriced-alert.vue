<script setup lang="ts">
/**
 * unpriced 全局警示卡（#61）——窗口内有未配价用量则高亮（warning NAlert + 档位表），
 * 无则整卡收起不渲染（用量驱动：无用量＝无实际损失，静态配价缺口不做）。
 *
 * tokens 只计无价分量（同档位部分有价部分无价时只计无价部分）；tokenKindName 直读
 * （ADR-0009）。补价只影响此后事件、历史成本不漂移——警示是行动召唤（去单价表补价），非错误。
 */
import { $t } from '@/locales';
import { formatCount } from '@/utils/common';

defineOptions({ name: 'AiplatformUnpricedAlert' });

defineProps<{
  items: Api.Aiplatform.UnpricedTierUsage[];
  loading: boolean;
  error: boolean;
}>();
</script>

<template>
  <!-- 三态：加载中（卡位 spin）/ 失败（卡位空态）/ 有未配价用量（高亮警示表）；空 items 且非加载=整卡收起 -->
  <NAlert v-if="loading || error || items.length > 0" type="warning" :bordered="false" class="card-wrapper">
    <template #header>
      {{ $t('page.aiplatform.cost.unpriced.title') }}
    </template>
    <div v-if="loading" class="flex-center h-60px">
      <NSpin />
    </div>
    <NEmpty v-else-if="error" size="small" :description="$t('page.aiplatform.cost.states.loadFailed')" />
    <template v-else>
      <div class="mb-8px text-13px text-#999">{{ $t('page.aiplatform.cost.unpriced.tip') }}</div>
      <div class="overflow-x-auto">
        <table class="w-full text-13px">
          <thead>
            <tr class="text-left text-#999">
              <th class="py-4px pr-16px font-400">{{ $t('page.aiplatform.cost.unpriced.provider') }}</th>
              <th class="py-4px pr-16px font-400">{{ $t('page.aiplatform.cost.unpriced.model') }}</th>
              <th class="py-4px pr-16px font-400">{{ $t('page.aiplatform.cost.unpriced.tier') }}</th>
              <th class="py-4px font-400 text-right">{{ $t('page.aiplatform.cost.unpriced.tokens') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, i) in items" :key="i" class="border-t border-t-gray-200 dark:border-t-gray-700">
              <td class="py-4px pr-16px font-mono">{{ item.provider }}</td>
              <td class="py-4px pr-16px font-mono">{{ item.model }}</td>
              <td class="py-4px pr-16px">{{ item.tokenKindName }}</td>
              <td class="py-4px text-right font-mono">{{ formatCount(item.tokens) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </NAlert>
</template>

<style scoped></style>
