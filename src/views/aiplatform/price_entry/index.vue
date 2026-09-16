<script setup lang="tsx">
/**
 * AI 平台单价表列表页（#62，#56 六域 T6）。
 *
 * 核价工作面：列表 NDataTable（flex-height + sm:h-full）+ provider/model 精确等值筛选平铺。
 * 现行与历史行全量呈现（价史全貌，排序服务端定死生效起点倒序）；`effectiveTo` null 即当前行——
 * 改价/停用只作用于当前行（METER_007 目标非当前行 409，不可达操作不出现），历史行无操作。
 * 原子改价走 reprice-modal（预发布字段必填；回执 closed/opened 两行呈现）；停用即时生效
 * （$dialog 二次确认）。写身份经 admin 出站头自动注入，前端无感。分页全链 1-based 直传零 ±1。
 */
import { ref } from 'vue';
import { NButton, NTag } from 'naive-ui';
import { priceEntryWriteAuth, priceTokenKindTagColor } from '@/constants/aiplatform';
import { fetchDeactivateAiplatformPriceEntry, fetchGetAiplatformPriceEntryList } from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { useAuth } from '@/hooks/business/auth';
import { defaultTransform, useNaivePaginatedTable } from '@/hooks/common/table';
import { $t } from '@/locales';
import { formatDateTime } from '@/utils/common';
import AiplatformPriceEntrySearch from './modules/price-entry-search.vue';
import RepriceModal from './modules/reprice-modal.vue';

defineOptions({ name: 'AiplatformPriceEntry' });

const appStore = useAppStore();
const { hasAuth } = useAuth();

/** 搜索参数 = 分页 + 当前筛选（PriceEntrySearch 清洗后并入）。 */
const searchParams = ref<Api.Aiplatform.PriceEntrySearchParams>({ page: 1, size: 10 });

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination, scrollX } =
  useNaivePaginatedTable({
    api: () => fetchGetAiplatformPriceEntryList(searchParams.value),
    transform: response => defaultTransform(response),
    onPaginationParamsChange: params => {
      searchParams.value.page = params.page ?? 1;
      searchParams.value.size = params.pageSize ?? 10;
    },
    columns: () => [
      {
        key: 'id',
        title: $t('page.aiplatform.priceEntry.id'),
        align: 'center',
        width: 170,
        render: row => <span class="font-mono">{row.id}</span>
      },
      {
        key: 'provider',
        title: $t('page.aiplatform.priceEntry.provider'),
        align: 'center',
        width: 100,
        render: row => row.provider
      },
      {
        key: 'model',
        title: $t('page.aiplatform.priceEntry.model'),
        align: 'center',
        minWidth: 170,
        render: row => <span class="font-mono">{row.model}</span>
      },
      {
        key: 'tokenKind',
        title: $t('page.aiplatform.priceEntry.tokenKind'),
        align: 'center',
        width: 90,
        render: row => (
          <NTag type={priceTokenKindTagColor[row.tokenKind]} size="small">
            {row.tokenKindName}
          </NTag>
        )
      },
      {
        key: 'unitPrice',
        title: $t('page.aiplatform.priceEntry.unitPrice'),
        align: 'right',
        width: 140,
        // BigDecimal 明文小数原样渲染（勿经 Number() 往返——微小价位会落科学计数法形）
        render: row => <span class="font-mono">{row.unitPrice}</span>
      },
      {
        key: 'currency',
        title: $t('page.aiplatform.priceEntry.currency'),
        align: 'center',
        width: 80,
        render: row => row.currency
      },
      {
        key: 'effectiveFrom',
        title: $t('page.aiplatform.priceEntry.effectiveFrom'),
        align: 'center',
        width: 170,
        render: row => formatDateTime(row.effectiveFrom)
      },
      {
        key: 'effectiveTo',
        title: $t('page.aiplatform.priceEntry.effectiveTo'),
        align: 'center',
        width: 170,
        render: row =>
          row.effectiveTo ? (
            formatDateTime(row.effectiveTo)
          ) : (
            <NTag type="success" size="small">
              {$t('page.aiplatform.priceEntry.current')}
            </NTag>
          )
      },
      {
        key: 'operator',
        title: $t('page.aiplatform.priceEntry.operator'),
        align: 'center',
        width: 150,
        render: row =>
          row.operatorName ? (
            <div class="flex flex-col">
              <span>{row.operatorName}</span>
              <span class="font-mono text-12px text-gray-400">{row.operatorId}</span>
            </div>
          ) : (
            '-'
          )
      },
      {
        key: 'operate',
        title: $t('common.operate'),
        align: 'center',
        width: 150,
        fixed: 'right',
        render: row => {
          // 历史行（已关）无操作——改价/停用只作用于当前行（METER_007 不可达不出现）
          if (row.effectiveTo !== null) return '-';
          const canReprice = hasAuth(priceEntryWriteAuth.reprice);
          const canDeactivate = hasAuth(priceEntryWriteAuth.deactivate);
          if (!canReprice && !canDeactivate) return '-';
          return (
            <div class="flex-center gap-8px whitespace-nowrap">
              {canReprice && (
                <NButton type="primary" ghost size="small" onClick={() => openReprice(row)}>
                  {$t('page.aiplatform.priceEntry.action.reprice')}
                </NButton>
              )}
              {canDeactivate && (
                <NButton type="error" ghost size="small" onClick={() => handleDeactivate(row)}>
                  {$t('page.aiplatform.priceEntry.action.deactivate')}
                </NButton>
              )}
            </div>
          );
        }
      }
    ]
  });

function getRowKey(row: Api.Aiplatform.UnitPriceEntry) {
  return row.id;
}

/** 接筛选条提交：重置筛选字段（保留分页）、并入新筛选，回到第一页。 */
function handleSearch(filter: Api.Aiplatform.PriceEntryFilter) {
  searchParams.value = { page: searchParams.value.page, size: searchParams.value.size, ...filter };
  getDataByPage(1);
}

/* ---- 原子改价（弹窗内回执呈现；本页只 toast + 刷列表） ---- */
const repriceVisible = ref(false);
const repriceTarget = ref<Api.Aiplatform.UnitPriceEntry | null>(null);

function openReprice(row: Api.Aiplatform.UnitPriceEntry) {
  repriceTarget.value = row;
  repriceVisible.value = true;
}

function onRepriceSuccess() {
  window.$message?.success($t('page.aiplatform.priceEntry.success.repriced'));
  getData();
}

/**
 * 停用（即时生效，关行不接新行）：$dialog 二次确认 → 成功 toast + 刷列表；
 * 失败走 onError 统一透传 toast，此处不吞。
 */
function handleDeactivate(row: Api.Aiplatform.UnitPriceEntry) {
  window.$dialog?.warning({
    title: $t('page.aiplatform.priceEntry.confirm.deactivate'),
    content: `${$t('page.aiplatform.priceEntry.target', {
      provider: row.provider,
      model: row.model,
      tokenKindName: row.tokenKindName
    })}\n${$t('page.aiplatform.priceEntry.confirm.deactivateTip')}`,
    positiveText: $t('common.confirm'),
    negativeText: $t('common.cancel'),
    onPositiveClick: async () => {
      const { error } = await fetchDeactivateAiplatformPriceEntry(row.id);
      if (!error) {
        window.$message?.success($t('page.aiplatform.priceEntry.success.deactivated'));
        getData();
      }
    }
  });
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <AiplatformPriceEntrySearch @search="handleSearch" />
    <NCard :title="$t('page.aiplatform.priceEntry.title')" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
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

    <!-- 原子改价弹窗（表单 + 成功后 closed/opened 回执呈现） -->
    <RepriceModal v-model:visible="repriceVisible" :entry="repriceTarget" @success="onRepriceSuccess" />
  </div>
</template>
