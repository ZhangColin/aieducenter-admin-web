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
import { NButton, NDrawerContent, NDrawer, NEmpty, NTag } from 'naive-ui';
import { paymentStatusRecord, payModeRecord, accessTypeRecord, paymentChannelRecord } from '@/constants/payment';
import { fetchGetPaymentOrderList } from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { defaultTransform, useNaivePaginatedTable } from '@/hooks/common/table';
import { $t } from '@/locales';
import { formatDateTime, formatMoney } from '@/utils/common';
import OrderSearch from './modules/order-search.vue';

defineOptions({ name: 'PaymentOrder' });

const appStore = useAppStore();

/** 搜索参数 = 分页 + 当前筛选（筛选由 OrderSearch 清洗后并入）。page 0-based。 */
const searchParams = ref<Api.Payment.PaymentOrderSearchParams>({
  page: 0,
  size: 10
});

/** 支付订单状态标签色（运营关注状态，唯一着色列） */
const statusTagMap: Record<Api.Payment.PaymentStatus, NaiveUI.ThemeColor> = {
  PENDING: 'warning',
  PAID: 'success',
  FAILED: 'error',
  CANCELLED: 'default',
  EXPIRED: 'default'
};

/** 文本型枚举列渲染：null → '-'，已知值翻译、未知值回退原值（后端新增枚举时不报错） */
function renderEnum<T extends string>(record: Record<T, App.I18n.I18nKey>, value: T | null | undefined) {
  if (!value) return '-';
  const key = record[value];
  return key ? $t(key) : value;
}

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
        render: row => {
          const key = paymentStatusRecord[row.status];
          return (
            <NTag type={statusTagMap[row.status] ?? 'default'} size="small">
              {key ? $t(key) : row.status}
            </NTag>
          );
        }
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
        render: row => renderEnum(payModeRecord, row.payMode)
      },
      {
        key: 'accessType',
        title: $t('page.payment.order.accessType'),
        align: 'center',
        minWidth: 130,
        render: row => renderEnum(accessTypeRecord, row.accessType)
      },
      {
        key: 'paymentChannel',
        title: $t('page.payment.order.paymentChannel'),
        align: 'center',
        width: 110,
        render: row => renderEnum(paymentChannelRecord, row.paymentChannel)
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
 * 抽屉本体（只读全字段 + 生命周期 NTimeline + 通知重发）归 T2 / #44；此处仅留按钮 + 钩子。
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

    <!-- 详情抽屉（T2 / #44 实现本体：只读全字段 + 生命周期 tab + 通知重发） -->
    <NDrawer v-model:show="detailDrawerVisible" :width="720">
      <NDrawerContent :title="`${$t('page.payment.order.detail')} · ${selectedOrderNo}`" closable>
        <NEmpty :description="$t('page.payment.common.comingSoon')" />
      </NDrawerContent>
    </NDrawer>
  </div>
</template>

<style scoped></style>
