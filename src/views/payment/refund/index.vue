<script setup lang="tsx">
/**
 * 退款订单列表（T3 / #45）。
 *
 * 只读分页列表 + 9 字段筛选（NCollapse 折叠）+ 退款金额 ¥1,234.56 + 详情入口钩子（抽屉本体归 T4 / #48）。
 * payment 退款非 admin 创建——列表无新增/删除（TableHeaderOperation hideAdd + hideDelete）。
 *
 * 复用 T1 整套范式：useNaivePaginatedTable + defaultTransform + 0-based 请求 / 1-based 响应分页。
 */
import { ref } from 'vue';
import { NButton, NTag } from 'naive-ui';
import { auditTypeRecord, displayEnumName, refundStatusRecord, refundStatusTagColor } from '@/constants/payment';
import { fetchGetRefundOrderList } from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { defaultTransform, useNaivePaginatedTable } from '@/hooks/common/table';
import { $t } from '@/locales';
import { formatDateTime, formatMoney } from '@/utils/common';
import RefundDetailDrawer from './modules/refund-detail-drawer.vue';
import RefundSearch from './modules/refund-search.vue';

defineOptions({ name: 'PaymentRefund' });

const appStore = useAppStore();

/** 搜索参数 = 分页 + 当前筛选（筛选由 RefundSearch 清洗后并入）。page 0-based。 */
const searchParams = ref<Api.Payment.RefundOrderSearchParams>({
  page: 0,
  size: 10
});

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination, scrollX } =
  useNaivePaginatedTable({
    api: () => fetchGetRefundOrderList(searchParams.value),
    transform: response => defaultTransform(response),
    onPaginationParamsChange: params => {
      searchParams.value.page = (params.page ?? 1) - 1;
      searchParams.value.size = params.pageSize ?? 10;
    },
    columns: () => [
      {
        key: 'refundOrderNo',
        title: $t('page.payment.refund.refundOrderNo'),
        align: 'center',
        minWidth: 200
      },
      {
        key: 'paymentOrderNo',
        title: $t('page.payment.refund.paymentOrderNo'),
        align: 'center',
        minWidth: 200
      },
      {
        key: 'businessOrderNo',
        title: $t('page.payment.refund.businessOrderNo'),
        align: 'center',
        minWidth: 170
      },
      {
        key: 'businessSystemName',
        title: $t('page.payment.refund.businessSystemName'),
        align: 'center',
        minWidth: 140,
        render: row => row.businessSystemName || '-'
      },
      {
        key: 'status',
        title: $t('page.payment.refund.status'),
        align: 'center',
        width: 100,
        render: row => (
          <NTag type={refundStatusTagColor[row.status] ?? 'default'} size="small">
            {displayEnumName(row.statusName, row.status, refundStatusRecord)}
          </NTag>
        )
      },
      {
        key: 'refundAmount',
        title: $t('page.payment.refund.refundAmount'),
        align: 'right',
        width: 140,
        render: row => formatMoney(row.refundAmount)
      },
      {
        key: 'auditType',
        title: $t('page.payment.refund.auditType'),
        align: 'center',
        width: 110,
        render: row => displayEnumName(row.auditTypeName, row.auditType, auditTypeRecord)
      },
      {
        key: 'auditor',
        title: $t('page.payment.refund.auditor'),
        align: 'center',
        minWidth: 130,
        render: row => row.auditorName || row.auditorId || '-'
      },
      {
        key: 'auditedAt',
        title: $t('page.payment.refund.auditedAt'),
        align: 'center',
        width: 170,
        render: row => (row.auditedAt ? formatDateTime(row.auditedAt) : '-')
      },
      {
        key: 'createdAt',
        title: $t('page.payment.refund.createdAt'),
        align: 'center',
        width: 170,
        render: row => formatDateTime(row.createdAt)
      },
      {
        key: 'operate',
        title: $t('common.operate'),
        align: 'center',
        width: 90,
        fixed: 'right',
        render: row => (
          <div class="flex-center gap-8px">
            <NButton type="primary" ghost size="small" onClick={() => openDetail(row.refundOrderNo)}>
              {$t('page.payment.refund.detail')}
            </NButton>
          </div>
        )
      }
    ]
  });

function getRowKey(row: Api.Payment.RefundOrderSummary) {
  return row.refundOrderNo;
}

/** 接筛选条提交：重置筛选字段（保留分页）、并入新筛选，回到第一页 */
function handleSearch(filter: Api.Payment.RefundOrderFilter) {
  searchParams.value = { page: searchParams.value.page, size: searchParams.value.size, ...filter };
  getDataByPage(1);
}

/**
 * 详情入口钩子（点「详情」开右抽屉）。抽屉本体见 RefundDetailDrawer（T4 / #48）：
 * 只读全字段 + 生命周期（复用 T2 组件）+ 退款审核 + 通知重发。审核成功后抽屉 emit `audited` → 重拉列表。
 */
const detailDrawerVisible = ref(false);
const selectedRefundNo = ref('');

function openDetail(refundOrderNo: string) {
  selectedRefundNo.value = refundOrderNo;
  detailDrawerVisible.value = true;
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <RefundSearch @search="handleSearch" />
    <NCard :title="$t('page.payment.refund.title')" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :hide-add="true"
          :hide-delete="true"
          :loading="loading"
          @refresh="getData"
        />
      </template>
      <NDataTable
        :columns="columns"
        :data="data"
        size="small"
        :flex-height="!appStore.isMobile"
        class="sm:h-full"
        :scroll-x="scrollX"
        :loading="loading"
        remote
        :row-key="getRowKey"
        :pagination="mobilePagination"
      />
    </NCard>

    <!-- 详情抽屉（T4 / #48）：只读全字段 + 生命周期 + 退款审核 + 通知重发。审核成功后重拉列表。 -->
    <RefundDetailDrawer
      v-model:visible="detailDrawerVisible"
      :refund-order-no="selectedRefundNo"
      @audited="getData"
    />
  </div>
</template>

<style scoped></style>
