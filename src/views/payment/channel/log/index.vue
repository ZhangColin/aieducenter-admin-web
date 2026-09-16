<script setup lang="tsx">
/**
 * 通道交互日志（PaymentLog：与银行/通道网关的机机交互留痕）—— 纯只读筛选列表（T5 / #46）。
 *
 * 只读分页列表 + 7 字段筛选（NCollapse 折叠）；**无详情抽屉、无写按钮**（日志 append-only）。
 * TableHeaderOperation hideAdd + hideDelete；无 operate 列。
 *
 * 复用 T1 整套范式：useNaivePaginatedTable + defaultTransform + 请求 / 响应均 1-based 分页。
 */
import { ref } from 'vue';
import { NTag } from 'naive-ui';
import { logTypeRecord } from '@/constants/payment';
import { fetchGetPaymentLogList } from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { defaultTransform, useNaivePaginatedTable } from '@/hooks/common/table';
import { $t } from '@/locales';
import { formatDateTime } from '@/utils/common';
import LogSearch from './modules/log-search.vue';

defineOptions({ name: 'PaymentChannelLog' });

const appStore = useAppStore();

/** 搜索参数 = 分页 + 当前筛选（筛选由 LogSearch 清洗后并入）。page 1-based。 */
const searchParams = ref<Api.Payment.PaymentLogSearchParams>({
  page: 1,
  size: 10
});

/** 日志类型标签色（按类别区分，便于扫描；success 列才是运营结果信号） */
const logTypeTagMap: Partial<Record<Api.Payment.LogType, NaiveUI.ThemeColor>> = {
  PAYMENT_REQUEST: 'info',
  PAYMENT_QUERY: 'default',
  PAYMENT_CANCEL: 'warning',
  REFUND_REQUEST: 'info',
  REFUND_QUERY: 'default',
  PAYMENT_CALLBACK: 'success'
};

/** 日志类型列：null → '-'，已知值翻译 tag、未知 token 回退原值（非闭合集合） */
function renderLogType(value: Api.Payment.LogType | null) {
  if (!value) return '-';
  const key = logTypeRecord[value];
  return (
    <NTag type={logTypeTagMap[value] ?? 'default'} size="small">
      {key ? $t(key) : value}
    </NTag>
  );
}

/** 成功/失败/未知结果 tag（success 列 = 运营结果信号，强着色） */
function renderSuccess(value: boolean | null) {
  if (value === null || value === undefined) {
    return (
      <NTag type="default" size="small">
        {$t('page.payment.lifecycle.unknown')}
      </NTag>
    );
  }
  return (
    <NTag type={value ? 'success' : 'error'} size="small">
      {$t(value ? 'page.payment.lifecycle.success' : 'page.payment.lifecycle.fail')}
    </NTag>
  );
}

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination, scrollX } =
  useNaivePaginatedTable({
    api: () => fetchGetPaymentLogList(searchParams.value),
    transform: response => defaultTransform(response),
    onPaginationParamsChange: params => {
      searchParams.value.page = params.page ?? 1;
      searchParams.value.size = params.pageSize ?? 10;
    },
    columns: () => [
      {
        key: 'createdAt',
        title: $t('page.payment.channelLog.createdAt'),
        align: 'center',
        width: 170,
        render: row => formatDateTime(row.createdAt)
      },
      {
        key: 'logType',
        title: $t('page.payment.channelLog.logType'),
        align: 'center',
        width: 120,
        render: row => renderLogType(row.logType)
      },
      {
        key: 'paymentOrderNo',
        title: $t('page.payment.channelLog.paymentOrderNo'),
        align: 'center',
        minWidth: 200,
        render: row => row.paymentOrderNo || '-'
      },
      {
        key: 'refundOrderNo',
        title: $t('page.payment.channelLog.refundOrderNo'),
        align: 'center',
        minWidth: 200,
        render: row => row.refundOrderNo || '-'
      },
      {
        key: 'bankInterface',
        title: $t('page.payment.lifecycle.bankInterface'),
        align: 'center',
        width: 130,
        render: row => row.bankInterface || '-'
      },
      {
        key: 'httpStatus',
        title: $t('page.payment.channelLog.httpStatus'),
        align: 'center',
        width: 110,
        render: row => (row.httpStatus == null ? '-' : row.httpStatus)
      },
      {
        key: 'returnCode',
        title: $t('page.payment.lifecycle.returnCode'),
        align: 'center',
        width: 120,
        render: row => row.returnCode || '-'
      },
      {
        key: 'returnMsg',
        title: $t('page.payment.lifecycle.returnMsg'),
        align: 'center',
        minWidth: 160,
        render: row => row.returnMsg || '-'
      },
      {
        key: 'errorMessage',
        title: $t('page.payment.channelLog.errorMessage'),
        align: 'center',
        minWidth: 160,
        render: row => row.errorMessage || '-'
      },
      {
        key: 'success',
        title: $t('page.payment.channelLog.success'),
        align: 'center',
        width: 90,
        render: row => renderSuccess(row.success)
      },
      {
        key: 'executionTime',
        title: $t('page.payment.lifecycle.executionTime'),
        align: 'right',
        width: 110,
        render: row => (row.executionTime == null ? '-' : `${Number(row.executionTime)} ms`)
      }
    ]
  });

function getRowKey(row: Api.Payment.PaymentLogSummary) {
  return row.id;
}

/** 接筛选条提交：重置筛选字段（保留分页）、并入新筛选，回到第一页 */
function handleSearch(filter: Api.Payment.PaymentLogFilter) {
  searchParams.value = { page: searchParams.value.page, size: searchParams.value.size, ...filter };
  getDataByPage(1);
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <LogSearch @search="handleSearch" />
    <NCard :title="$t('page.payment.channelLog.title')" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
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
  </div>
</template>

<style scoped></style>
