<script setup lang="ts">
/**
 * 账号详情抽屉（#50）——UI 原型拍板「B 的横幅抽屉」。
 *
 * 顶部状态横幅：合成态大字（四态：正常 / 正常·系统锁定 / 已封号 / 已封号·系统锁定——
 * 两条状态轴独立、合成显示不丢信息）+ 操作按钮长在横幅上（canWrite 门控）；
 * 下方资料单列 desc-table。写操作成功后回读详情并通知列表刷新（响应 data:null 不回读）。
 */
import { computed, ref, watch } from 'vue';
import { NButton, NDrawer, NDrawerContent, NTag } from 'naive-ui';
import {
  fetchActivateAccount,
  fetchGetAccountManagementDetail,
  fetchRevokeAccountSessions,
  fetchUnlockAccount
} from '@/service/api';
import { useAuth } from '@/hooks/business/auth';
import { $t } from '@/locales';
import { accountStatusRecord, accountStatusTagColor } from '@/constants/account';

defineOptions({ name: 'AccountDetailDrawer' });

const props = defineProps<{
  userId: string;
}>();

const emit = defineEmits<{
  /** 写操作成功（detail 已回读），列表应刷新。 */
  updated: [];
  /** 请求封号（reason 弹窗在父页统一挂载）。 */
  disable: [];
}>();

const visible = defineModel<boolean>('visible', { default: false });

const { hasAuth } = useAuth();
const canWrite = computed(() => hasAuth('admin:account:write'));

const detail = ref<Api.Account.AccountManagementDetail | null>(null);
const operating = ref(false);

async function loadDetail() {
  const { data, error } = await fetchGetAccountManagementDetail(props.userId);
  if (!error) detail.value = data;
}

watch(visible, val => {
  if (val) {
    detail.value = null;
    loadDetail();
  }
});

/** 横幅合成态：底色 + 大字 + 状态点色。 */
const banner = computed(() => {
  const d = detail.value;
  if (!d) return { bg: '#f5f5f5', text: '', dot: '#18a058' };
  if (d.status === 0) {
    return d.locked
      ? { bg: '#fbeaea', text: $t('page.account.banner.disabledLocked'), dot: '#d03050' }
      : { bg: '#fdf0ef', text: $t('page.account.banner.disabled'), dot: '#d03050' };
  }
  if (d.locked) return { bg: '#fdf6ec', text: $t('page.account.banner.locked'), dot: '#f0a020' };
  return { bg: '#edf7f0', text: $t('page.account.banner.active'), dot: '#18a058' };
});

/** 解封/解锁/强制下线：$dialog 二次确认（Q7 定稿——后端可选 reason 不消费）。 */
function confirmThen(text: string, action: () => Promise<{ error?: unknown }>) {
  const d = detail.value;
  if (!d) return;
  window.$dialog?.warning({
    title: text,
    content: $t('page.account.confirm.target', { name: d.nickname ?? d.userId, userId: d.userId }),
    positiveText: $t('common.confirm'),
    negativeText: $t('common.cancel'),
    onPositiveClick: async () => {
      operating.value = true;
      const { error } = await action();
      operating.value = false;
      if (!error) {
        emit('updated');
        await loadDetail();
      }
    }
  });
}

function handleActivate() {
  confirmThen($t('page.account.confirm.activate'), () => fetchActivateAccount(props.userId));
}

function handleUnlock() {
  confirmThen($t('page.account.confirm.unlock'), () => fetchUnlockAccount(props.userId));
}

function handleRevoke() {
  confirmThen($t('page.account.confirm.revoke'), () => fetchRevokeAccountSessions(props.userId));
}

defineExpose({ reload: loadDetail });
</script>

<template>
  <NDrawer v-model:show="visible" :width="720">
    <NDrawerContent :title="$t('page.account.detailTitle')" closable>
      <template v-if="detail">
        <!-- 状态横幅：合成态大字 + 操作按钮长在横幅上（canWrite 门控） -->
        <div class="mb-24px flex items-center justify-between gap-16px rounded-8px px-20px py-14px" :style="{ background: banner.bg }">
          <div class="flex items-center gap-10px text-18px font-600">
            <span class="inline-block h-10px w-10px rounded-full" :style="{ background: banner.dot }" />
            {{ banner.text }}
          </div>
          <div v-if="canWrite" class="flex gap-8px">
            <NButton v-if="detail.status === 1" type="error" size="small" :loading="operating" @click="emit('disable')">
              {{ $t('page.account.action.disable') }}
            </NButton>
            <NButton v-else type="warning" size="small" :loading="operating" @click="handleActivate">
              {{ $t('page.account.action.activate') }}
            </NButton>
            <NButton v-if="detail.locked" type="info" size="small" :loading="operating" @click="handleUnlock">
              {{ $t('page.account.action.unlock') }}
            </NButton>
            <NButton size="small" :loading="operating" @click="handleRevoke">
              {{ $t('page.account.action.revoke') }}
            </NButton>
          </div>
        </div>

        <!-- 资料单列（hasPassword 按 Q8 拍板不渲染；注册时间响应无此字段） -->
        <div class="grid grid-cols-[110px_1fr] gap-x-16px gap-y-10px text-14px">
          <span class="text-right text-#999">{{ $t('page.account.userId') }}</span><span>{{ detail.userId }}</span>
          <span class="text-right text-#999">{{ $t('page.account.nickname') }}</span><span>{{ detail.nickname ?? '-' }}</span>
          <span class="text-right text-#999">{{ $t('page.account.email') }}</span><span>{{ detail.email ?? '-' }}</span>
          <span class="text-right text-#999">{{ $t('page.account.phone') }}</span><span>{{ detail.phone ?? '-' }}</span>
          <span class="text-right text-#999">{{ $t('page.account.status') }}</span>
          <span>
            <NTag :type="accountStatusTagColor[detail.status]" size="small">
              {{ $t(accountStatusRecord[detail.status]) }}
            </NTag>
          </span>
          <span class="text-right text-#999">{{ $t('page.account.locked') }}</span>
          <NTag v-if="detail.locked" type="warning" size="small">{{ $t('page.account.statusEnum.locked') }}</NTag>
          <span v-else class="text-#999">{{ $t('page.account.statusEnum.unlocked') }}</span>
        </div>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>
