<script setup lang="tsx">
/**
 * 平台账号列表页（#50）——UI 原型拍板「A 的筛选 + B 的主体」。
 *
 * 筛选 = A 形态（AccountSearch 平铺）；列表 = B：合成徽章状态列（主状态 tag + 锁定小 tag
 * 并排，双轴叠加不丢信息）+ 行内「查看 + 操作下拉」（互斥/不可达操作不出现）；
 * 详情 = B 横幅抽屉（AccountDetailDrawer）。
 * 权限：写按钮组 hasAuth('admin:account:write') 门控；页面读权限由菜单/路由控制。
 * ⚠️ 分页：响应 page 0-based（REQ-18 待归一）——accountTransform +1 临时适配。
 */
import { ref } from 'vue';
import { NButton, NDropdown, NTag } from 'naive-ui';
import type { DropdownOption } from 'naive-ui';
import { accountStatusRecord, accountStatusTagColor } from '@/constants/account';
import {
  fetchActivateAccount,
  fetchDisableAccount,
  fetchGetAccountList,
  fetchRevokeAccountSessions,
  fetchUnlockAccount
} from '@/service/api';
import { useAppStore } from '@/store/modules/app';
import { useAuth } from '@/hooks/business/auth';
import type { FlatResponseData } from '@sa/axios';
import { defaultTransform, useNaivePaginatedTable } from '@/hooks/common/table';
import { $t } from '@/locales';
import AccountSearch from './modules/account-search.vue';
import AccountDetailDrawer from './modules/account-detail-drawer.vue';
import DisableReasonModal from './modules/disable-reason-modal.vue';

defineOptions({ name: 'AccountList' });

const appStore = useAppStore();
const { hasAuth } = useAuth();
const canWrite = hasAuth('admin:account:write');

/** 搜索参数 = 分页 + 当前筛选（AccountSearch 清洗后并入）。请求 page 0-based。 */
const searchParams = ref<Api.Account.AccountSearchParams>({ page: 0, size: 10 });

/**
 * account BFF 响应 page 是 0-based（identity 透传，与全平台「响应 1-based」相反）。
 * +1 适配 useTable 的 1-based 页码——REQ-18 落地后删、回归 defaultTransform。
 */
function accountTransform(response: FlatResponseData<any, Api.Common.PageResponse<Api.Account.AccountSummary>>) {
  const { data, pageNum, pageSize, total } = defaultTransform(response);
  return { data, pageNum: pageNum + 1, pageSize, total };
}

const { columns, columnChecks, data, getData, getDataByPage, loading, mobilePagination, scrollX } =
  useNaivePaginatedTable({
    api: () => fetchGetAccountList(searchParams.value),
    transform: response => accountTransform(response),
    onPaginationParamsChange: params => {
      searchParams.value.page = (params.page ?? 1) - 1;
      searchParams.value.size = params.pageSize ?? 10;
    },
    columns: () => [
      {
        key: 'userId',
        title: $t('page.account.userId'),
        align: 'center',
        width: 170,
        render: row => <span class="font-mono">{row.userId}</span>
      },
      {
        key: 'nickname',
        title: $t('page.account.nickname'),
        align: 'center',
        width: 110,
        render: row => row.nickname ?? '-'
      },
      {
        key: 'email',
        title: $t('page.account.email'),
        align: 'center',
        minWidth: 190,
        render: row => row.email ?? '-'
      },
      {
        key: 'phone',
        title: $t('page.account.phone'),
        align: 'center',
        width: 130,
        render: row => row.phone ?? '-'
      },
      {
        key: 'status',
        title: $t('page.account.status'),
        align: 'center',
        width: 170,
        render: row => (
          <div class="flex items-center justify-center gap-4px">
            <NTag type={accountStatusTagColor[row.status]} size="small">
              {$t(accountStatusRecord[row.status])}
            </NTag>
            {row.locked && (
              <NTag type="warning" size="small">
                {$t('page.account.statusEnum.locked')}
              </NTag>
            )}
          </div>
        )
      },
      {
        key: 'operate',
        title: $t('common.operate'),
        align: 'center',
        width: 180,
        fixed: 'right',
        render: row => (
          <div class="flex-center gap-8px whitespace-nowrap">
            <NButton type="primary" ghost size="small" onClick={() => openDetail(row.userId)}>
              {$t('page.account.detail')}
            </NButton>
            {canWrite && (
              <NDropdown trigger="click" options={rowOptions(row)} onSelect={key => onAction(row.userId, String(key))}>
                <NButton size="small">{$t('page.account.more')}</NButton>
              </NDropdown>
            )}
          </div>
        )
      }
    ]
  });

function getRowKey(row: Api.Account.AccountSummary) {
  return row.userId;
}

/** 下拉选项按行动态：互斥操作只出现可用侧（切换显示、不灰）；文案不带省略号。 */
function rowOptions(row: Api.Account.AccountSummary): DropdownOption[] {
  const opts: DropdownOption[] = [];
  if (row.status === 1) {
    opts.push({ key: 'disable', label: $t('page.account.action.disable') });
  } else {
    opts.push({ key: 'activate', label: $t('page.account.action.activate') });
  }
  if (row.locked) {
    opts.push({ key: 'unlock', label: $t('page.account.action.unlock') });
  }
  opts.push({ key: 'revoke', label: $t('page.account.action.revoke') });
  return opts;
}

/** 接筛选条提交：重置筛选字段（保留分页）、并入新筛选，回到第一页。 */
function handleSearch(filter: Api.Account.AccountFilter) {
  searchParams.value = { page: searchParams.value.page, size: searchParams.value.size, ...filter };
  getDataByPage(1);
}

/* ---- 详情抽屉 ---- */
const drawerVisible = ref(false);
const selectedUserId = ref('');
const drawerRef = ref<InstanceType<typeof AccountDetailDrawer> | null>(null);

function openDetail(userId: string) {
  selectedUserId.value = userId;
  drawerVisible.value = true;
}

/* ---- 封号弹窗 ---- */
const disableModalVisible = ref(false);
const disableTarget = ref<Api.Account.AccountSummary | null>(null);

async function handleDisableConfirm(reason: string) {
  const target = disableTarget.value;
  if (!target) return;
  const { error } = await fetchDisableAccount(target.userId, { reason });
  if (!error) {
    window.$message?.success($t('page.account.success.disabled'));
    // 抽屉开着且目标是当前账号 → 抽屉回读横幅状态；列表恒刷新
    if (drawerVisible.value && selectedUserId.value === target.userId) {
      drawerRef.value?.reload();
    }
    getData();
  }
}

/** 行内下拉动作分发（disable 开弹窗；activate/unlock/revoke 二次确认后直调）。 */
function onAction(userId: string, key: string) {
  const row = data.value.find(item => item.userId === userId);
  if (key === 'disable') {
    if (row) {
      disableTarget.value = row;
      disableModalVisible.value = true;
    }
    return;
  }
  const confirms: Record<string, { title: string; run: () => Promise<{ error?: unknown }>; success: string }> = {
    activate: {
      title: $t('page.account.confirm.activate'),
      run: () => fetchActivateAccount(userId),
      success: $t('page.account.success.activated')
    },
    unlock: {
      title: $t('page.account.confirm.unlock'),
      run: () => fetchUnlockAccount(userId),
      success: $t('page.account.success.unlocked')
    },
    revoke: {
      title: $t('page.account.confirm.revoke'),
      run: () => fetchRevokeAccountSessions(userId),
      success: $t('page.account.success.revoked')
    }
  };
  const conf = confirms[key];
  if (!conf) return;
  window.$dialog?.warning({
    title: conf.title,
    content: $t('page.account.confirm.target', { name: row?.nickname ?? userId, userId }),
    positiveText: $t('common.confirm'),
    negativeText: $t('common.cancel'),
    onPositiveClick: async () => {
      const { error } = await conf.run();
      if (!error) {
        window.$message?.success(conf.success);
        getData();
      }
    }
  });
}

/** 抽屉发起的封号（横幅按钮）——目标行可能不在当前页，用 selectedUserId 兜底。 */
function handleDisableFromDrawer() {
  const row = data.value.find(item => item.userId === selectedUserId.value);
  disableTarget.value =
    row ?? { userId: selectedUserId.value, nickname: null, email: null, phone: null, avatar: null, status: 1, locked: false, hasPassword: false };
  disableModalVisible.value = true;
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <AccountSearch @search="handleSearch" />
    <NCard :title="$t('page.account.title')" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
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

    <!-- 详情抽屉（B 横幅形态；写操作成功后回读详情 + 列表刷新） -->
    <AccountDetailDrawer
      ref="drawerRef"
      v-model:visible="drawerVisible"
      :user-id="selectedUserId"
      @updated="getData"
      @disable="handleDisableFromDrawer"
    />
    <DisableReasonModal
      v-model:visible="disableModalVisible"
      :nickname="disableTarget?.nickname ?? null"
      :user-id="disableTarget?.userId ?? ''"
      @confirm="handleDisableConfirm"
    />
  </div>
</template>
