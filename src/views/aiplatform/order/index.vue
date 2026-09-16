<script setup lang="tsx">
/**
 * AI 平台订单列表页（#57，#56 六域 T1 tracer bullet）。
 *
 * 列表 NDataTable（flex-height + sm:h-full）+ 筛选平铺（status 多选/创建区间/externalId/orderId）+
 * 行内「查看 + 操作下拉」（按态给操作：未支付=报价·改价/取消，已支付=重试归档——互斥/不可达不出现）+
 * 详情抽屉（价目史 + PRD 快照 + 下载源码包）。写按钮 hasAuth 逐写码门控；分页全链 1-based 直传零 ±1。
 */
import { ref } from 'vue';
import { NButton, NDropdown, NTag } from 'naive-ui';
import type { DropdownOption } from 'naive-ui';
import { orderStatusTagColor } from '@/constants/aiplatform';
import { fetchGetAiplatformOrderList, fetchRetryArchiveAiplatformOrder } from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { useAuth } from '@/hooks/business/auth';
import { defaultTransform, useNaivePaginatedTable } from '@/hooks/common/table';
import { $t } from '@/locales';
import { formatDateTime, formatMoney } from '@/utils/common';
import AiplatformOrderSearch from './modules/order-search.vue';
import OrderDetailDrawer from './modules/order-detail-drawer.vue';
import OrderQuoteModal from './modules/quote-modal.vue';
import OrderCancelModal from './modules/cancel-modal.vue';

defineOptions({ name: 'AiplatformOrder' });

const appStore = useAppStore();
const { hasAuth } = useAuth();
const canQuote = hasAuth('admin:aiplatform:order:quote');
const canCancel = hasAuth('admin:aiplatform:order:cancel');
const canRetryArchive = hasAuth('admin:aiplatform:order:retry-archive');

/** 搜索参数 = 分页 + 当前筛选（OrderSearch 清洗后并入）。 */
const searchParams = ref<Api.Aiplatform.OrderSearchParams>({ page: 1, size: 10 });

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination, scrollX } =
  useNaivePaginatedTable({
    api: () => fetchGetAiplatformOrderList(searchParams.value),
    transform: response => defaultTransform(response),
    onPaginationParamsChange: params => {
      searchParams.value.page = params.page ?? 1;
      searchParams.value.size = params.pageSize ?? 10;
    },
    columns: () => [
      {
        key: 'id',
        title: $t('page.aiplatform.order.orderId'),
        align: 'center',
        width: 170,
        render: row => <span class="font-mono">{row.id}</span>
      },
      {
        key: 'projectName',
        title: $t('page.aiplatform.order.projectName'),
        align: 'center',
        minWidth: 150,
        render: row => row.projectName ?? '-'
      },
      {
        key: 'ownerDisplayName',
        title: $t('page.aiplatform.order.owner'),
        align: 'center',
        width: 110,
        render: row => row.ownerDisplayName ?? '-'
      },
      {
        key: 'status',
        title: $t('page.aiplatform.order.status'),
        align: 'center',
        width: 100,
        render: row => (
          <NTag type={orderStatusTagColor[row.status]} size="small">
            {row.statusName}
          </NTag>
        )
      },
      {
        key: 'amount',
        title: $t('page.aiplatform.order.amount'),
        align: 'right',
        width: 120,
        render: row => formatMoney(row.amount)
      },
      {
        key: 'createdAt',
        title: $t('page.aiplatform.order.createdAt'),
        align: 'center',
        width: 160,
        render: row => formatDateTime(row.createdAt)
      },
      {
        key: 'quotedAt',
        title: $t('page.aiplatform.order.quotedAt'),
        align: 'center',
        width: 160,
        render: row => formatDateTime(row.quotedAt)
      },
      {
        key: 'operate',
        title: $t('common.operate'),
        align: 'center',
        width: 170,
        fixed: 'right',
        render: row => (
          <div class="flex-center gap-8px whitespace-nowrap">
            <NButton type="primary" ghost size="small" onClick={() => openDetail(row.id)}>
              {$t('page.aiplatform.order.detail')}
            </NButton>
            <NDropdown
              trigger="click"
              options={rowOptions(row)}
              onSelect={key => onAction(row.id, String(key))}
            >
              <NButton size="small">{$t('page.aiplatform.order.more')}</NButton>
            </NDropdown>
          </div>
        )
      }
    ]
  });

function getRowKey(row: Api.Aiplatform.OrderSummary) {
  return row.id;
}

/** 下拉选项按行动态：未支付（1|2）=报价/改价+取消；已支付（3）=重试归档；互斥/不可达不出现。 */
function rowOptions(row: Api.Aiplatform.OrderSummary): DropdownOption[] {
  const opts: DropdownOption[] = [];
  const unpaid = row.status === 1 || row.status === 2;
  if (unpaid && canQuote) {
    opts.push({
      key: 'quote',
      label: row.status === 2 ? $t('page.aiplatform.order.action.requote') : $t('page.aiplatform.order.action.quote')
    });
  }
  if (unpaid && canCancel) {
    opts.push({ key: 'cancel', label: $t('page.aiplatform.order.action.cancel') });
  }
  if (row.status === 3 && canRetryArchive) {
    opts.push({ key: 'retryArchive', label: $t('page.aiplatform.order.action.retryArchive') });
  }
  return opts;
}

/** 接筛选条提交：重置筛选字段（保留分页）、并入新筛选，回到第一页。 */
function handleSearch(filter: Api.Aiplatform.OrderFilter) {
  searchParams.value = { page: searchParams.value.page, size: searchParams.value.size, ...filter };
  getDataByPage(1);
}

/* ---- 详情抽屉 ---- */
const drawerVisible = ref(false);
const selectedOrderId = ref('');
const drawerRef = ref<InstanceType<typeof OrderDetailDrawer> | null>(null);

function openDetail(orderId: string) {
  selectedOrderId.value = orderId;
  drawerVisible.value = true;
}

/* ---- 报价弹窗 ---- */
const quoteModalVisible = ref(false);
const quoteTarget = ref<{
  orderId: string;
  mode: 'quote' | 'requote';
  currentAmountCents: string | null;
  currentNote: string | null;
} | null>(null);

function openQuote(orderId: string, mode: 'quote' | 'requote', amount: string | null, note: string | null) {
  quoteTarget.value = { orderId, mode, currentAmountCents: amount, currentNote: note };
  quoteModalVisible.value = true;
}

/* ---- 取消弹窗 ---- */
const cancelModalVisible = ref(false);
const cancelTargetId = ref('');

/** 行内下拉动作分发（quote/cancel 开弹窗；retryArchive $dialog 二次确认后直调）。 */
function onAction(orderId: string, key: string) {
  const row = data.value.find(item => item.id === orderId);
  if (!row) return;
  if (key === 'quote') {
    openQuote(orderId, row.status === 2 ? 'requote' : 'quote', row.amount, null);
    return;
  }
  if (key === 'cancel') {
    cancelTargetId.value = orderId;
    cancelModalVisible.value = true;
    return;
  }
  if (key === 'retryArchive') {
    window.$dialog?.warning({
      title: $t('page.aiplatform.order.confirm.retryArchive'),
      content: $t('page.aiplatform.order.confirm.target', { orderId }),
      positiveText: $t('common.confirm'),
      negativeText: $t('common.cancel'),
      onPositiveClick: async () => {
        const { error } = await fetchRetryArchiveAiplatformOrder(orderId);
        if (!error) {
          window.$message?.success($t('page.aiplatform.order.success.retried'));
          getData();
        }
      }
    });
  }
}

/** 写成功统一收口：toast + 抽屉回读（开着且同目标）+ 列表刷新。 */
function handleWriteSuccess(successKey: 'quoted' | 'cancelled') {
  window.$message?.success($t(`page.aiplatform.order.success.${successKey}`));
  if (drawerVisible.value) {
    drawerRef.value?.reload();
  }
  getData();
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <AiplatformOrderSearch @search="handleSearch" />
    <NCard :title="$t('page.aiplatform.order.title')" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
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

    <!-- 详情抽屉（价目史 + PRD 快照 + 按态写操作 + 源码包下载） -->
    <OrderDetailDrawer
      ref="drawerRef"
      v-model:visible="drawerVisible"
      :order-id="selectedOrderId"
      @updated="getData"
      @quote="openQuote"
      @cancel="cancelTargetId = $event; cancelModalVisible = true"
    />
    <OrderQuoteModal
      v-model:visible="quoteModalVisible"
      :order-id="quoteTarget?.orderId ?? ''"
      :mode="quoteTarget?.mode ?? 'quote'"
      :current-amount-cents="quoteTarget?.currentAmountCents ?? null"
      :current-note="quoteTarget?.currentNote ?? null"
      @success="handleWriteSuccess('quoted')"
    />
    <OrderCancelModal
      v-model:visible="cancelModalVisible"
      :order-id="cancelTargetId"
      @success="handleWriteSuccess('cancelled')"
    />
  </div>
</template>
