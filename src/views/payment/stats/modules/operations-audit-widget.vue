<script setup lang="tsx">
/**
 * tier-1 · 审核统计 widget：审核笔数·通过率·平均审核时长（KPI）+ 按审核人聚合（表）。
 * 消费 usePaymentStats store（ADR-0002 seam），不直连端点。
 */
import { usePaymentStatsStore } from '@/store/modules/payment-stats';
import { $t } from '@/locales';
import { formatCount, formatRate } from '@/utils/common';
import WidgetPlaceholder from './widget-placeholder.vue';

defineOptions({ name: 'PaymentOperationsAuditWidget' });

const store = usePaymentStatsStore();

const columns = [
  {
    key: 'auditorName',
    title: $t('page.payment.stats.operationsAudit.auditor'),
    align: 'left' as const,
    minWidth: 140,
    render: (row: Api.Payment.OperationsAuditorStat) => row.auditorName || row.auditorId || '-'
  },
  {
    key: 'auditCount',
    title: $t('page.payment.stats.operationsAudit.auditCount'),
    align: 'right' as const,
    width: 110,
    render: (row: Api.Payment.OperationsAuditorStat) => formatCount(row.auditCount)
  },
  {
    key: 'approvedCount',
    title: $t('page.payment.stats.operationsAudit.approvedCount'),
    align: 'right' as const,
    width: 110,
    render: (row: Api.Payment.OperationsAuditorStat) => formatCount(row.approvedCount)
  },
  {
    key: 'approvalRate',
    title: $t('page.payment.stats.operationsAudit.approvalRate'),
    align: 'right' as const,
    width: 110,
    render: (row: Api.Payment.OperationsAuditorStat) => formatRate(row.approvalRate)
  },
  {
    key: 'avgAuditDurationSeconds',
    title: $t('page.payment.stats.operationsAudit.avgDuration'),
    align: 'right' as const,
    width: 130,
    render: (row: Api.Payment.OperationsAuditorStat) => `${formatCount(row.avgAuditDurationSeconds)} s`
  }
];

const kpis: { key: string; label: App.I18n.I18nKey; value: () => string }[] = [
  { key: 'auditCount', label: 'page.payment.stats.operationsAudit.auditCount', value: () => formatCount(store.operationsAudit?.auditCount) },
  { key: 'approvalRate', label: 'page.payment.stats.operationsAudit.approvalRate', value: () => formatRate(store.operationsAudit?.approvalRate) },
  { key: 'avgDuration', label: 'page.payment.stats.operationsAudit.avgDuration', value: () => `${formatCount(store.operationsAudit?.avgAuditDurationSeconds)} s` }
];
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper">
    <template #header>
      <span class="font-500">{{ $t('page.payment.stats.operationsAudit.title') }}</span>
    </template>
    <template #header-extra>
      <NButton size="small" :loading="store.operationsAuditLoading" @click="store.loadOperationsAudit()">
        {{ $t('page.payment.stats.refresh') }}
      </NButton>
    </template>

    <!-- KPI -->
    <NGrid :x-gap="16" :y-gap="8" responsive="screen" item-responsive class="mb-8px">
      <NGi v-for="k in kpis" :key="k.key" span="12 s:8 m:8">
        <NStatistic :label="$t(k.label)" :value="k.value()" />
      </NGi>
    </NGrid>

    <WidgetPlaceholder
      :loading="store.operationsAuditLoading"
      :error="store.operationsAuditError"
      :has-data="Boolean(store.operationsAudit)"
      min-height="h-220px"
    >
      <NDataTable
        :columns="columns"
        :data="store.operationsAudit!.auditors"
        size="small"
        :pagination="false"
        :scroll-x="600"
      />
    </WidgetPlaceholder>
  </NCard>
</template>

<style scoped></style>
