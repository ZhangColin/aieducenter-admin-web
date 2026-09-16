<script setup lang="ts">
/**
 * 成本分解柱状图（#61）——byModel/byAgentKind 两口径共用（总览页与项目下钻抽屉共四处复用）。
 *
 * 数据形状归一为 {label, tokens} 行（口径标签合成收编 breakdown.ts 单点：byModel 拼
 * provider/model、byAgentKind 直读 agentKindName、null 落「—」桶）；五档堆叠柱
 * （一柱=一维度的五档构成，图例可切换档位）。
 * 范式照 payment/stats widget：useEcharts + 三态占位（loading/error/empty 覆盖层），数据到达灌图。
 * 图表 div 恒挂载 v-show 切换（v-if 换枝会在卸载瞬间踩 useEcharts 尺寸 watch → init(null)）。
 * 模型名/桶名可能较长 → x 轴标签 rotate 防重叠（先例：byBusinessSystem）。
 */
import { watch } from 'vue';
import { useEcharts } from '@/hooks/common/echarts';
import { $t } from '@/locales';
import { TOKEN_TIER_KEYS, tokenTierLabel } from '@/constants/aiplatform';
import type { BreakdownRow } from './breakdown';

defineOptions({ name: 'AiplatformBreakdownChart' });

const props = defineProps<{
  /** 卡片标题（调用方传入已翻译文案） */
  title: string;
  /** 归一分解行（breakdown.ts 两口径 helper 合成） */
  rows: BreakdownRow[];
  loading: boolean;
  error: boolean;
}>();

const { domRef, updateOptions } = useEcharts(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' }
  },
  legend: { data: TOKEN_TIER_KEYS.map(key => $t(tokenTierLabel[key])), top: '0' },
  grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
  xAxis: { type: 'category', data: [] as string[], axisLabel: { interval: 0, rotate: 30 } },
  yAxis: { type: 'value' },
  series: TOKEN_TIER_KEYS.map(key => ({
    name: $t(tokenTierLabel[key]),
    type: 'bar' as const,
    stack: 'tokens',
    data: [] as number[]
  }))
}));

/** 数据到达 → 灌五档堆叠柱（行序=服务端序，byModel/byAgentKind 服务端均已聚合）。 */
watch(
  () => props.rows,
  rows => {
    updateOptions(opts => {
      opts.xAxis.data = rows.map(r => r.label);
      TOKEN_TIER_KEYS.forEach((key, i) => {
        opts.series[i].data = rows.map(r => r.tokens[key]);
      });
      return opts;
    });
  }
);
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper h-full">
    <template #header>
      <span class="font-500">{{ title }}</span>
    </template>

    <!--
 图表 div 恒挂载（v-show 切换）：v-if 换枝会在卸载瞬间触发 useEcharts 尺寸 watch → echarts.init(null)
         （"Initialize failed: invalid dom" pageerror）——占位态改绝对定位覆盖层，图表实例跨窗口变更复用 
-->
    <div class="relative h-300px">
      <div v-show="!loading && !error && rows.length > 0" ref="domRef" class="h-full overflow-hidden"></div>
      <div v-if="loading" class="absolute inset-0 flex-center">
        <NSpin />
      </div>
      <div v-else-if="error" class="absolute inset-0 flex-center">
        <NEmpty :description="$t('page.aiplatform.cost.states.loadFailed')" />
      </div>
      <div v-else-if="rows.length === 0" class="absolute inset-0 flex-center">
        <NEmpty :description="$t('page.aiplatform.cost.states.noData')" />
      </div>
    </div>
  </NCard>
</template>

<style scoped></style>
