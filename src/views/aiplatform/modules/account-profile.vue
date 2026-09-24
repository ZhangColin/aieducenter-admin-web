<script setup lang="ts">
/**
 * 账号档案嵌件（#56 收口，account:read 有码无页）——订单/项目详情抽屉共用，认交易对手。
 *
 * 详情响应不带 externalId（契约如此），嵌件由列表页 externalId 筛选值驱动：筛选在即查、
 * 缺省不渲染。列表按 externalId 命中 ⇒ 账号必已建档，404 仅「筛选后删档」竞态可达——
 * onError 透传 toast 兜底、区不渲染，不设专属错误态（prd-pane「错误态不写防御性处理」先例）。
 * 无 account:read 权限码整体不渲染（读码门控同页面先例）。
 *
 * 首例 aiplatform 共享层组件（CONTEXT「跨子域复用第二例上提」——order/project 两抽屉共用；
 * cost-buckets 留居 cost 域：其数据形变居所在 breakdown.ts，上提反造共享层→域反向依赖）。
 */
import { ref, watch } from 'vue';
import { fetchGetAiplatformAccountProfile } from '@/service/api';
import { useAuth } from '@/hooks/business/auth';
import { $t } from '@/locales';
import { formatDateTime } from '@/utils/common';

defineOptions({ name: 'AiplatformAccountProfile' });

const props = defineProps<{
  /** 列表页 externalId 筛选值（null/空＝不查不渲染）。 */
  externalId?: string | null;
}>();

const { hasAuth } = useAuth();
const canRead = hasAuth('admin:aiplatform:account:read');

const profile = ref<Api.Aiplatform.AccountProfile | null>(null);

/** 抽屉每次打开父级 detail 重挂 → 组件随挂随查（immediate 兜底首挂）。 */
watch(
  () => props.externalId,
  async externalId => {
    profile.value = null;
    if (!externalId) return;
    const { data, error } = await fetchGetAiplatformAccountProfile(externalId);
    if (!error) profile.value = data;
  },
  { immediate: true }
);
</script>

<template>
  <div v-if="canRead && profile">
    <div class="mb-8px font-600">{{ $t('page.aiplatform.account.title') }}</div>
    <div class="grid grid-cols-[110px_1fr] gap-x-16px gap-y-10px text-14px">
      <span class="text-right text-#999">{{ $t('page.aiplatform.account.displayName') }}</span>
      <span>{{ profile.displayName }}</span>
      <span class="text-right text-#999">{{ $t('page.aiplatform.account.accountId') }}</span>
      <span class="font-mono">{{ profile.id }}</span>
      <span class="text-right text-#999">{{ $t('page.aiplatform.account.externalId') }}</span>
      <span class="font-mono">{{ profile.externalId }}</span>
      <span class="text-right text-#999">{{ $t('page.aiplatform.account.createdAt') }}</span>
      <span>{{ formatDateTime(profile.createdAt) }}</span>
    </div>
  </div>
</template>
