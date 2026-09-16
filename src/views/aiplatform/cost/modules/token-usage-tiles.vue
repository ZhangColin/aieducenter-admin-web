<script setup lang="ts">
/**
 * token 用量五档 stat tile 组（#61）——总览卡与项目下钻抽屉共用。
 *
 * 五档 primitive long → JSON 数字（非 Long-string 口径），formatCount 千分位直读；
 * 键序/标签单点在 constants（TOKEN_TIER_KEYS/tokenTierLabel），未加载时 '-' 占位。
 */
import { TOKEN_TIER_KEYS, tokenTierLabel } from '@/constants/aiplatform';
import { $t } from '@/locales';
import { formatCount } from '@/utils/common';

defineOptions({ name: 'AiplatformTokenUsageTiles' });

const props = defineProps<{
  /** 五档用量（加载中/失败为 null → tile 值 '-' 占位） */
  total: Api.Aiplatform.TokenUsage | null;
  loading?: boolean;
}>();
</script>

<template>
  <NSpin :show="Boolean(props.loading)">
    <NGrid :x-gap="16" :y-gap="8" responsive="screen" item-responsive>
      <NGi v-for="key in TOKEN_TIER_KEYS" :key="key" span="12 s:8 m:4">
        <NStatistic :label="$t(tokenTierLabel[key])" :value="formatCount(total?.[key])" />
      </NGi>
    </NGrid>
  </NSpin>
</template>

<style scoped></style>
