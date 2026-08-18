<script setup lang="tsx">
/**
 * 订单操作记录（OperationLog：行为者对订单的操作留痕）—— 纯只读筛选列表（T5 / #46）。
 *
 * 只读分页列表 + 7 字段筛选（NCollapse 折叠）；**无详情抽屉、无写按钮**（日志 append-only）。
 * TableHeaderOperation hideAdd + hideDelete；无 operate 列。
 *
 * 复用 T1 整套范式：useNaivePaginatedTable + defaultTransform + 0-based 请求 / 1-based 响应分页。
 */
import { ref } from 'vue';
import { NTag } from 'naive-ui';
import { displayEnumName, operationResultTagType, operationTargetTypeRecord, operationTypeRecord } from '@/constants/payment';
import { fetchGetOperationLogList } from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { defaultTransform, useNaivePaginatedTable } from '@/hooks/common/table';
import { $t } from '@/locales';
import { formatDateTime } from '@/utils/common';
import OperationSearch from './modules/operation-search.vue';

defineOptions({ name: 'PaymentOperation' });

const appStore = useAppStore();

/** 搜索参数 = 分页 + 当前筛选（筛选由 OperationSearch 清洗后并入）。page 0-based。 */
const searchParams = ref<Api.Payment.OperationLogSearchParams>({
  page: 0,
  size: 10
});

/** 目标类型标签色（code 键：1=支付 / 2=退款） */
const targetTypeTagMap: Partial<Record<Api.Payment.OperationTargetType, NaiveUI.ThemeColor>> = {
  '1': 'info',
  '2': 'warning'
};

/** 操作类型标签色（code 键：1=审核通过 / 2=审核拒绝 / 3=通知重发） */
const operationTagMap: Partial<Record<Api.Payment.OperationType, NaiveUI.ThemeColor>> = {
  '1': 'success',
  '2': 'error',
  '3': 'info'
};

/** 枚举 tag 列：null → '-'；后端 *Name 优先、record 兜底（displayEnumName）。复用于目标类型 / 操作类型两列。
 * code 为 JSON number（#54 对齐），经 String() 归一查 tagMap/record（键 = code 字符串字面量）。 */
function renderEnumTag<T extends string>(
  name: string | null | undefined,
  value: number | T | null,
  record: Record<T, App.I18n.I18nKey>,
  tagMap: Partial<Record<T, NaiveUI.ThemeColor>>
) {
  if (value === null || value === undefined) return '-';
  const key = String(value) as T;
  return (
    <NTag type={tagMap[key] ?? 'default'} size="small">
      {displayEnumName(name, key, record)}
    </NTag>
  );
}

/**
 * 操作结果列：result 为**自由稳定 token**（非闭合集合：SUCCESS / DELIVERY_FAILED / SKIPPED …），原值展示。
 * 着色复用 `operationResultTagType`（与生命周期 outcome tag 同源，避免两处分叉）。
 */
function renderResult(value: string | null) {
  if (!value) return '-';
  return <NTag type={operationResultTagType(value)} size="small">{value}</NTag>;
}

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination, scrollX } =
  useNaivePaginatedTable({
    api: () => fetchGetOperationLogList(searchParams.value),
    transform: response => defaultTransform(response),
    onPaginationParamsChange: params => {
      searchParams.value.page = (params.page ?? 1) - 1;
      searchParams.value.size = params.pageSize ?? 10;
    },
    columns: () => [
      {
        key: 'createdAt',
        title: $t('page.payment.operation.createdAt'),
        align: 'center',
        width: 170,
        render: row => formatDateTime(row.createdAt)
      },
      {
        key: 'targetType',
        title: $t('page.payment.operation.targetType'),
        align: 'center',
        width: 110,
        render: row => renderEnumTag(row.targetTypeName, row.targetType, operationTargetTypeRecord, targetTypeTagMap)
      },
      {
        key: 'targetNo',
        title: $t('page.payment.operation.targetNo'),
        align: 'center',
        minWidth: 200,
        render: row => row.targetNo || '-'
      },
      {
        key: 'operation',
        title: $t('page.payment.operation.operation'),
        align: 'center',
        width: 120,
        render: row => renderEnumTag(row.operationName, row.operation, operationTypeRecord, operationTagMap)
      },
      {
        key: 'result',
        title: $t('page.payment.operation.result'),
        align: 'center',
        width: 150,
        render: row => renderResult(row.result)
      },
      {
        key: 'operator',
        title: $t('page.payment.lifecycle.operator'),
        align: 'center',
        minWidth: 130,
        render: row => row.operatorName || row.operatorId || '-'
      },
      {
        key: 'operatorSystem',
        title: $t('page.payment.operation.operatorSystem'),
        align: 'center',
        minWidth: 140,
        render: row => row.operatorSystem || '-'
      },
      {
        key: 'remark',
        title: $t('page.payment.lifecycle.remark'),
        align: 'center',
        minWidth: 160,
        render: row => row.remark || '-'
      }
    ]
  });

function getRowKey(row: Api.Payment.OperationLogSummary) {
  return row.id;
}

/** 接筛选条提交：重置筛选字段（保留分页）、并入新筛选，回到第一页 */
function handleSearch(filter: Api.Payment.OperationLogFilter) {
  searchParams.value = { page: searchParams.value.page, size: searchParams.value.size, ...filter };
  getDataByPage(1);
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <OperationSearch @search="handleSearch" />
    <NCard :title="$t('page.payment.operation.title')" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
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
