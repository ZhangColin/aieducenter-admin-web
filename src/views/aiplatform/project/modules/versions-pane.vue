<script setup lang="ts">
/**
 * 项目详情抽屉·版本 pane（#58）——版本列表（容器 git log 新→旧）+ 版本详情锚定收尾卡。
 *
 * 行点击切换详情（首行自动锚定）；版本详情 = 元数据 desc-table + closing 收尾卡载荷。
 * closing 为 Map<String, Object>（api-docs 唯一文档化形状）——泛型键值渲染：
 * 原始键直出 + 值按类型格式化（string 原样 / number 千分位 / boolean 是|否 / 嵌套 JSON），
 * 不对 key 做端侧映射（#56 grilling：不做 code→中文映射先例，键漂移零风险）；
 * closing=null（收尾卡缺位/回滚版本无 run）→ 统一兜底文案。
 */
import { computed, h, onMounted, ref } from 'vue';
import { NDataTable, NEmpty, NTag } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { fetchGetAiplatformProjectVersions, fetchGetAiplatformProjectVersionDetail } from '@/service/api';
import { $t } from '@/locales';
import { formatDateTime } from '@/utils/common';

defineOptions({ name: 'ProjectVersionsPane' });

const props = defineProps<{
  projectId: string;
}>();

const versions = ref<Api.Aiplatform.VersionSummary[]>([]);
const listLoading = ref(false);
const selectedRef = ref<string | null>(null);

const detail = ref<Api.Aiplatform.VersionDetail | null>(null);
const detailLoading = ref(false);

const columns: DataTableColumns<Api.Aiplatform.VersionSummary> = [
  {
    key: 'commitHash',
    title: $t('page.aiplatform.project.drawer.versionCommit'),
    align: 'center',
    width: 110,
    render: row => h('span', { class: 'font-mono' }, row.commitHash.slice(0, 7))
  },
  {
    key: 'subject',
    title: $t('page.aiplatform.project.drawer.versionSubject'),
    minWidth: 180,
    render: row => row.subject
  },
  {
    key: 'runId',
    title: $t('page.aiplatform.project.drawer.versionRunId'),
    align: 'center',
    width: 160,
    render: row =>
      row.runId
        ? h('span', { class: 'font-mono' }, row.runId)
        : h(NTag, { type: 'warning', size: 'small', bordered: false }, { default: () => $t('page.aiplatform.project.drawer.runNone') })
  },
  {
    key: 'committedAt',
    title: $t('page.aiplatform.project.drawer.versionCommittedAt'),
    align: 'center',
    width: 160,
    render: row => formatDateTime(row.committedAt)
  }
];

function getRowKey(row: Api.Aiplatform.VersionSummary) {
  return row.commitHash;
}

/** 选中行高亮（点选锚定的版本）。 */
function rowClassName(row: Api.Aiplatform.VersionSummary) {
  return row.commitHash === selectedRef.value ? 'version-row--selected' : '';
}

async function loadList() {
  listLoading.value = true;
  const { data, error } = await fetchGetAiplatformProjectVersions(props.projectId);
  listLoading.value = false;
  if (error) return;
  versions.value = data;
  // 首行（最新版本）自动锚定详情
  if (data.length) {
    selectVersion(data[0].commitHash);
  }
}

async function selectVersion(versionRef: string) {
  selectedRef.value = versionRef;
  detailLoading.value = true;
  detail.value = null;
  const { data, error } = await fetchGetAiplatformProjectVersionDetail(props.projectId, versionRef);
  detailLoading.value = false;
  if (!error) detail.value = data;
}

/** 收尾卡载荷值格式化：string 原样 / number 千分位 / boolean 是|否 / 其余 JSON pretty。 */
function formatClosingValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'boolean') return value ? $t('page.aiplatform.project.archivedYes') : $t('page.aiplatform.project.archivedNo');
  return JSON.stringify(value, null, 2);
}

/** 收尾卡载荷键值（detail 可空 → 空数组；模板内不做复杂表达式）。 */
const closingEntries = computed<[string, unknown][]>(() =>
  detail.value?.closing ? Object.entries(detail.value.closing) : []
);

onMounted(loadList);
</script>

<template>
  <div v-if="listLoading" class="flex-center min-h-300px">
    <NSpin />
  </div>
  <NEmpty v-else-if="!versions.length" :description="$t('page.aiplatform.project.drawer.versionEmpty')" />
  <div v-else class="flex-col-stretch gap-12px">
    <NDataTable
      :columns="columns"
      :data="versions"
      size="small"
      :loading="listLoading"
      :row-key="getRowKey"
      :row-class-name="rowClassName"
      :pagination="false"
      :row-props="row => ({
        style: 'cursor: pointer',
        onClick: () => selectVersion(row.commitHash)
      })"
    />

    <!-- 版本详情（锚定收尾卡） -->
    <div v-if="detailLoading" class="flex-center min-h-200px">
      <NSpin />
    </div>
    <template v-else-if="detail">
      <div class="desc-table">
        <div class="desc-row">
          <div class="desc-label">{{ $t('page.aiplatform.project.drawer.versionCommit') }}</div>
          <div class="desc-value"><span class="font-mono text-13px">{{ detail.commitHash }}</span></div>
        </div>
        <div class="desc-row">
          <div class="desc-label">{{ $t('page.aiplatform.project.drawer.versionSubject') }}</div>
          <div class="desc-value"><span class="text-14px">{{ detail.subject }}</span></div>
        </div>
        <div class="desc-row">
          <div class="desc-label">{{ $t('page.aiplatform.project.drawer.versionRunId') }}</div>
          <div class="desc-value">
            <span v-if="detail.runId" class="font-mono text-13px">{{ detail.runId }}</span>
            <NTag v-else type="warning" size="small" :bordered="false">{{ $t('page.aiplatform.project.drawer.runNone') }}</NTag>
          </div>
        </div>
        <div v-if="detail.rollbackFrom" class="desc-row">
          <div class="desc-label">{{ $t('page.aiplatform.project.drawer.versionRollbackFrom') }}</div>
          <div class="desc-value"><span class="font-mono text-13px">{{ detail.rollbackFrom }}</span></div>
        </div>
        <div class="desc-row">
          <div class="desc-label">{{ $t('page.aiplatform.project.drawer.versionCommittedAt') }}</div>
          <div class="desc-value"><span class="text-14px">{{ formatDateTime(detail.committedAt) }}</span></div>
        </div>
      </div>

      <!-- 收尾卡载荷：Map 泛型键值渲染；null（缺位/回滚）统一兜底 -->
      <div>
        <div class="mb-8px font-600">{{ $t('page.aiplatform.project.drawer.closingCard') }}</div>
        <NEmpty v-if="!detail.closing" :description="$t('page.aiplatform.project.drawer.closingMissing')" />
        <div v-else class="desc-table">
          <div v-for="[key, value] in closingEntries" :key="key" class="desc-row">
            <div class="desc-label closing-key">{{ key }}</div>
            <div class="desc-value">
              <pre v-if="typeof value === 'object' && value !== null" class="m-0 font-mono text-12px">{{ formatClosingValue(value) }}</pre>
              <span v-else class="text-13px">{{ formatClosingValue(value) }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.desc-table {
  border: 1px solid var(--n-border-color);
  border-radius: var(--n-border-radius);
}
.desc-row {
  display: flex;
  border-bottom: 1px solid var(--n-border-color);
}
.desc-row:last-child {
  border-bottom: none;
}
.desc-label {
  flex-shrink: 0;
  width: 120px;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--n-text-color-3);
  background: var(--n-color-embedded);
  border-right: 1px solid var(--n-border-color);
}
.desc-label.closing-key {
  width: 160px;
  font-family: monospace;
}
.desc-value {
  flex: 1;
  min-width: 0;
  padding: 8px 12px;
  display: flex;
  align-items: center;
}
:deep(.version-row--selected > td) {
  background-color: var(--n-color-embedded);
}
</style>
