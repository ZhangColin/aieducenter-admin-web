<script setup lang="ts">
/**
 * 订单详情抽屉（#57）——报价依据全量：状态时点组 + 价目史（append-only 新→旧，带操作者）+ PRD 快照。
 *
 * 写按钮按态门控（未支付=报价/改价+取消；已支付=重试归档）+ hasAuth 逐写码；下载源码包=读码。
 * 报价/取消弹窗在父页统一挂载（抽屉发事件）；重试归档 $dialog 二次确认内联；
 * 写成功回读详情 + emit('updated') 通知列表刷新。
 */
import { computed, ref, watch } from 'vue';
import { NButton, NDataTable, NDrawer, NDrawerContent, NTag } from 'naive-ui';
import type { TableColumns } from 'naive-ui/es/data-table/src/interface';
import { fetchDownloadOrderSourcePackage, fetchGetAiplatformOrder } from '@/service/api';
import { useAuth } from '@/hooks/business/auth';
import { $t } from '@/locales';
import { orderStatusTagColor } from '@/constants/aiplatform';
import { formatDateTime, formatMoney, saveBlobFile } from '@/utils/common';

defineOptions({ name: 'OrderDetailDrawer' });

const props = defineProps<{
  orderId: string;
}>();

const emit = defineEmits<{
  /** 请求报价/改价（弹窗在父页挂载；requote 预填当前价）。 */
  quote: [orderId: string, mode: 'quote' | 'requote', currentAmountCents: string | null, currentNote: string | null];
  /** 请求取消（弹窗在父页挂载）。 */
  cancel: [orderId: string];
  /** 请求重试归档（$dialog 二次确认在父页单点实现，同 account 先例）。 */
  retry: [orderId: string];
}>();

const visible = defineModel<boolean>('visible', { default: false });

const { hasAuth } = useAuth();

const detail = ref<Api.Aiplatform.OrderDetail | null>(null);
const loading = ref(false);
const downloading = ref(false);

async function loadDetail() {
  loading.value = true;
  const { data, error } = await fetchGetAiplatformOrder(props.orderId);
  loading.value = false;
  if (!error) detail.value = data;
}

watch(visible, val => {
  if (val) {
    detail.value = null;
    loadDetail();
  }
});

/** 未支付态（1|2）：可报价/改价 + 取消；已支付（3）：可重试归档。 */
const canQuote = computed(() => {
  const d = detail.value;
  return !!d && (d.status === 1 || d.status === 2) && hasAuth('admin:aiplatform:order:quote');
});
const canCancel = computed(() => {
  const d = detail.value;
  return !!d && (d.status === 1 || d.status === 2) && hasAuth('admin:aiplatform:order:cancel');
});
const canRetryArchive = computed(
  () => detail.value?.status === 3 && hasAuth('admin:aiplatform:order:retry-archive')
);
const canDownload = computed(() => hasAuth('admin:aiplatform:order:read'));

function handleQuote() {
  const d = detail.value;
  if (!d) return;
  emit('quote', d.id, d.status === 2 ? 'requote' : 'quote', d.amount, d.note);
}

/** 源码包：tar.gz 无信封 blob；文件名以服务端 Content-Disposition 为准（provider 约定 `{id}-source.tar.gz`），缺失时端侧兜底。 */
async function handleDownload() {
  const d = detail.value;
  if (!d) return;
  downloading.value = true;
  const { data, error, response } = await fetchDownloadOrderSourcePackage(d.id);
  downloading.value = false;
  if (error || !data) return;
  const disposition = String(response?.headers?.['content-disposition'] ?? '');
  const filename = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? `${d.id}-source.tar.gz`;
  saveBlobFile(data, filename);
  window.$message?.success($t('page.aiplatform.order.success.downloaded'));
}

const priceColumns: TableColumns<Api.Aiplatform.OrderPriceEntry> = [
  {
    key: 'amount',
    title: $t('page.aiplatform.order.drawer.priceAmount'),
    align: 'right',
    width: 120,
    render: row => formatMoney(row.amount)
  },
  {
    key: 'note',
    title: $t('page.aiplatform.order.drawer.priceNote'),
    minWidth: 140,
    render: row => row.note ?? '-'
  },
  {
    key: 'operatorName',
    title: $t('page.aiplatform.order.drawer.priceOperator'),
    align: 'center',
    width: 110,
    render: row => row.operatorName ?? '-'
  },
  {
    key: 'createdAt',
    title: $t('page.aiplatform.order.drawer.priceAt'),
    align: 'center',
    width: 160,
    render: row => formatDateTime(row.createdAt)
  }
];

defineExpose({ reload: loadDetail });
</script>

<template>
  <NDrawer v-model:show="visible" :width="720">
    <NDrawerContent :title="$t('page.aiplatform.order.detailTitle')" closable>
      <div v-if="detail" class="flex-col-stretch gap-16px">
        <!-- 操作行：按态 + hasAuth 门控 -->
        <div class="flex flex-wrap gap-8px">
          <NButton v-if="canQuote" type="primary" size="small" @click="handleQuote">
            {{ detail.status === 2 ? $t('page.aiplatform.order.action.requote') : $t('page.aiplatform.order.action.quote') }}
          </NButton>
          <NButton v-if="canCancel" type="error" ghost size="small" @click="emit('cancel', detail.id)">
            {{ $t('page.aiplatform.order.action.cancel') }}
          </NButton>
          <NButton v-if="canRetryArchive" type="warning" size="small" @click="emit('retry', detail.id)">
            {{ $t('page.aiplatform.order.action.retryArchive') }}
          </NButton>
          <NButton v-if="canDownload" size="small" :loading="downloading" @click="handleDownload">
            {{ $t('page.aiplatform.order.drawer.downloadPackage') }}
          </NButton>
        </div>

        <!-- 基本信息 -->
        <div class="grid grid-cols-[110px_1fr] gap-x-16px gap-y-10px text-14px">
          <span class="text-right text-#999">{{ $t('page.aiplatform.order.orderId') }}</span><span class="font-mono">{{ detail.id }}</span>
          <span class="text-right text-#999">{{ $t('page.aiplatform.order.projectId') }}</span><span class="font-mono">{{ detail.projectId }}</span>
          <span class="text-right text-#999">{{ $t('page.aiplatform.order.projectName') }}</span><span>{{ detail.projectName }}</span>
          <span class="text-right text-#999">{{ $t('page.aiplatform.order.owner') }}</span><span>{{ detail.ownerDisplayName ?? '-' }}</span>
          <span class="text-right text-#999">{{ $t('page.aiplatform.order.status') }}</span>
          <span>
            <NTag :type="orderStatusTagColor[detail.status]" size="small">{{ detail.statusName }}</NTag>
          </span>
          <span class="text-right text-#999">{{ $t('page.aiplatform.order.amount') }}</span><span>{{ formatMoney(detail.amount) }}</span>
          <span class="text-right text-#999">{{ $t('page.aiplatform.order.createdAt') }}</span><span>{{ formatDateTime(detail.createdAt) }}</span>
          <span class="text-right text-#999">{{ $t('page.aiplatform.order.quotedAt') }}</span><span>{{ formatDateTime(detail.quotedAt) }}</span>
          <template v-if="detail.paidAt">
            <span class="text-right text-#999">{{ $t('page.aiplatform.order.drawer.paidAt') }}</span><span>{{ formatDateTime(detail.paidAt) }}</span>
          </template>
          <template v-if="detail.archivedAt">
            <span class="text-right text-#999">{{ $t('page.aiplatform.order.drawer.archivedAt') }}</span>
            <span>
              {{ formatDateTime(detail.archivedAt) }}
              <template v-if="detail.archiveOperatorName">（{{ $t('page.aiplatform.order.drawer.archiveOperator') }}：{{ detail.archiveOperatorName }}）</template>
            </span>
          </template>
          <template v-if="detail.cancelledAt">
            <span class="text-right text-#999">{{ $t('page.aiplatform.order.drawer.cancelledAt') }}</span>
            <span>{{ formatDateTime(detail.cancelledAt) }}</span>
            <span class="text-right text-#999">{{ $t('page.aiplatform.order.drawer.cancelReason') }}</span>
            <span>
              {{ detail.cancelReason ?? '-' }}
              <template v-if="detail.cancelOperatorName">（{{ $t('page.aiplatform.order.drawer.cancelOperator') }}：{{ detail.cancelOperatorName }}）</template>
            </span>
          </template>
        </div>

        <!-- 价目历史（append-only，新→旧） -->
        <div>
          <div class="mb-8px font-600">{{ $t('page.aiplatform.order.drawer.priceHistory') }}</div>
          <NDataTable :columns="priceColumns" :data="detail.priceEntries" size="small" :pagination="false" />
        </div>

        <!-- PRD 快照（下单冻结） -->
        <div v-if="detail.prdSnapshot">
          <div class="mb-8px font-600">{{ $t('page.aiplatform.order.drawer.prdSnapshot') }}</div>
          <pre class="max-h-320px overflow-auto whitespace-pre-wrap rounded-8px bg-#f5f5f5 p-12px text-13px">{{ detail.prdSnapshot }}</pre>
        </div>
      </div>
    </NDrawerContent>
  </NDrawer>
</template>
