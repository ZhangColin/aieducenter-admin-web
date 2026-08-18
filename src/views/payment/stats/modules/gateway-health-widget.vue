<script setup lang="tsx">
/**
 * tier-1 · 通道健康 widget：各银行接口调用次数·成功率条·平均耗时·返回码分布（表）。
 * 消费 usePaymentStats store（ADR-0002 seam），不直连端点。
 *
 * 成功率（successRate 0–1 小数）用 NProgress 条 + 百分比文本；耗时 ms（avgExecutionTimeMs 为
 * BigDecimal→number，#54 对齐）；返回码分布内联渲染。列表名 interfaces、调用次数 totalCount。
 */
import { usePaymentStatsStore } from '@/store/modules/payment-stats';
import { $t } from '@/locales';
import { formatCount } from '@/utils/common';
import WidgetPlaceholder from './widget-placeholder.vue';
import { NProgress, NSpace, NTag } from 'naive-ui';

defineOptions({ name: 'PaymentGatewayHealthWidget' });

const store = usePaymentStatsStore();

const columns = [
  {
    key: 'bankInterface',
    title: $t('page.payment.stats.gatewayHealth.bankInterface'),
    align: 'center' as const,
    minWidth: 160
  },
  {
    key: 'totalCount',
    title: $t('page.payment.stats.gatewayHealth.totalCount'),
    align: 'right' as const,
    width: 110,
    render: (row: Api.Payment.GatewayBankInterfaceStat) => formatCount(row.totalCount)
  },
  {
    key: 'successCount',
    title: $t('page.payment.stats.gatewayHealth.successCount'),
    align: 'right' as const,
    width: 110,
    render: (row: Api.Payment.GatewayBankInterfaceStat) => formatCount(row.successCount)
  },
  {
    key: 'successRate',
    title: $t('page.payment.stats.gatewayHealth.successRate'),
    align: 'center' as const,
    minWidth: 180,
    render: (row: Api.Payment.GatewayBankInterfaceStat) => {
      const pct = (Number(row.successRate) || 0) * 100;
      return (
        <div class="flex items-center gap-8px">
          <NProgress type="line" percentage={Math.round(pct * 100) / 100} show-indicator={false} class="flex-1" />
          <span class="w-52px shrink-0 text-right text-12px">{pct.toFixed(2)}%</span>
        </div>
      );
    }
  },
  {
    key: 'avgExecutionTimeMs',
    title: $t('page.payment.stats.gatewayHealth.avgExecutionTimeMs'),
    align: 'right' as const,
    width: 130,
    render: (row: Api.Payment.GatewayBankInterfaceStat) => `${formatCount(row.avgExecutionTimeMs)} ms`
  },
  {
    key: 'returnCodes',
    title: $t('page.payment.stats.gatewayHealth.returnCodes'),
    align: 'left' as const,
    minWidth: 180,
    render: (row: Api.Payment.GatewayBankInterfaceStat) =>
      row.returnCodes?.length ? (
        <NSpace size={4} wrap>
          {row.returnCodes.map(rc => (
            <NTag key={rc.returnCode} size="small">{`${rc.returnCode} × ${formatCount(rc.count)}`}</NTag>
          ))}
        </NSpace>
      ) : (
        '-'
      )
  }
];
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper">
    <template #header>
      <span class="font-500">{{ $t('page.payment.stats.gatewayHealth.title') }}</span>
    </template>
    <template #header-extra>
      <NButton size="small" :loading="store.gatewayHealthLoading" @click="store.loadGatewayHealth()">
        {{ $t('page.payment.stats.refresh') }}
      </NButton>
    </template>

    <WidgetPlaceholder
      :loading="store.gatewayHealthLoading"
      :error="store.gatewayHealthError"
      :has-data="Boolean(store.gatewayHealth?.interfaces?.length)"
      min-height="h-300px"
    >
      <NDataTable
        :columns="columns"
        :data="store.gatewayHealth!.interfaces"
        size="small"
        :pagination="false"
        :scroll-x="860"
      />
    </WidgetPlaceholder>
  </NCard>
</template>

<style scoped></style>
