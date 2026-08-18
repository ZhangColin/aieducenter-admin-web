<script setup lang="tsx">
/**
 * 支付订单列表（T1 / #43）。
 *
 * 只读分页列表 + ~10 字段筛选（NCollapse 折叠）+ 金额 ¥1,234.56 + 详情入口钩子（抽屉本体归 T2）。
 * payment 订单非 admin 创建——列表无新增/删除（TableHeaderOperation hideAdd + hideDelete）。
 *
 * 复用 SystemManage 整套范式：useNaivePaginatedTable + defaultTransform + 0-based 请求 / 1-based 响应分页。
 */
import { ref } from 'vue';
import { NButton, NTag } from 'naive-ui';
import {
  displayEnumName,
  enumTagColor,
  paymentStatusRecord,
  paymentStatusTagColor,
  payModeRecord,
  accessTypeRecord,
  paymentChannelRecord
} from '@/constants/payment';
import { fetchGetPaymentOrderList } from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { defaultTransform, useNaivePaginatedTable } from '@/hooks/common/table';
import { $t } from '@/locales';
import { formatDateTime, formatMoney } from '@/utils/common';
import OrderSearch from './modules/order-search.vue';
import OrderDetailDrawer from './modules/order-detail-drawer.vue';

defineOptions({ name: 'PaymentOrder' });

const appStore = useAppStore();

/** 搜索参数 = 分页 + 当前筛选（筛选由 OrderSearch 清洗后并入）。page 0-based。 */
const searchParams = ref<Api.Payment.PaymentOrderSearchParams>({
  page: 0,
  size: 10
});

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination, scrollX } =
  useNaivePaginatedTable({
    api: () => fetchGetPaymentOrderList(searchParams.value),
    transform: response => defaultTransform(response),
    onPaginationParamsChange: params => {
      searchParams.value.page = (params.page ?? 1) - 1;
      searchParams.value.size = params.pageSize ?? 10;
    },
    columns: () => [
      {
        key: 'paymentOrderNo',
        title: $t('page.payment.order.paymentOrderNo'),
        align: 'center',
        minWidth: 200
      },
      {
        key: 'businessOrderNo',
        title: $t('page.payment.order.businessOrderNo'),
        align: 'center',
        minWidth: 170
      },
      {
        key: 'businessSystemName',
        title: $t('page.payment.order.businessSystemName'),
        align: 'center',
        minWidth: 140,
        render: row => row.businessSystemName || '-'
      },
      {
        key: 'status',
        title: $t('page.payment.order.status'),
        align: 'center',
        width: 100,
        render: row => (
          <NTag type={enumTagColor(row.status, paymentStatusTagColor)} size="small">
            {displayEnumName(row.statusName, row.status, paymentStatusRecord)}
          </NTag>
        )
      },
      {
        key: 'amount',
        title: $t('page.payment.order.amount'),
        align: 'right',
        width: 140,
        render: row => formatMoney(row.amount)
      },
      {
        key: 'payMode',
        title: $t('page.payment.order.payMode'),
        align: 'center',
        width: 100,
        render: row => displayEnumName(row.payModeName, row.payMode, payModeRecord)
      },
      {
        key: 'accessType',
        title: $t('page.payment.order.accessType'),
        align: 'center',
        minWidth: 130,
        render: row => displayEnumName(row.accessTypeName, row.accessType, accessTypeRecord)
      },
      {
        key: 'paymentChannel',
        title: $t('page.payment.order.paymentChannel'),
        align: 'center',
        width: 110,
        render: row => displayEnumName(row.paymentChannelName, row.paymentChannel, paymentChannelRecord)
      },
      {
        key: 'paidAt',
        title: $t('page.payment.order.paidAt'),
        align: 'center',
        width: 170,
        render: row => (row.paidAt ? formatDateTime(row.paidAt) : '-')
      },
      {
        key: 'createdAt',
        title: $t('page.payment.order.createdAt'),
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
            <NButton type="primary" ghost size="small" onClick={() => openDetail(row.paymentOrderNo)}>
              {$t('page.payment.order.detail')}
            </NButton>
          </div>
        )
      }
    ]
  });

function getRowKey(row: Api.Payment.PaymentOrderSummary) {
  return row.paymentOrderNo;
}

/** 接筛选条提交：重置筛选字段（保留分页）、并入新筛选，回到第一页 */
function handleSearch(filter: Api.Payment.PaymentOrderFilter) {
  searchParams.value = { page: searchParams.value.page, size: searchParams.value.size, ...filter };
  getDataByPage(1);
}

/**
 * 详情入口钩子（点「详情」开右抽屉）。
 * 抽屉本体（只读全字段 + 生命周期 NTimeline + 通知重发）= OrderDetailDrawer（T2 / #44）。
 */
const detailDrawerVisible = ref(false);
const selectedOrderNo = ref('');

function openDetail(paymentOrderNo: string) {
  selectedOrderNo.value = paymentOrderNo;
  detailDrawerVisible.value = true;
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <OrderSearch @search="handleSearch" />
    <NCard :title="$t('page.payment.order.title')" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
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

    <!-- 详情抽屉（T2 / #44：只读全字段 + 生命周期 tab + 通知重发） -->
    <OrderDetailDrawer v-model:visible="detailDrawerVisible" :payment-order-no="selectedOrderNo" />
  </div>
</template>

<style scoped></style>
