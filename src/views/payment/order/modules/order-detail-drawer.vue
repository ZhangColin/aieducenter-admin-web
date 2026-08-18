<script setup lang="ts">
/**
 * 支付订单详情抽屉（T2 / #44）。
 *
 * 从列表点「详情」打开右侧 NDrawer（width=720）：
 * - 「基本信息」tab：desc-table 全字段只读回显（含状态 NTag / 金额 ¥ / 枚举翻译）。
 * - 「生命周期」tab：NTimeline 渲染 `GET /orders/{no}/lifecycle`（payment 已合并 PaymentLog +
 *   OperationLog 按 createdAt 排序，语义 9 字段扁平事件数组——#54 对齐）。GATEWAY（机机通道）
 *   vs OPERATION（行为者操作）**分图标（source）**，outcome token 着色 dot + tag。按需首次加载。
 * - 抽屉头部「通知重发」按钮 → $dialog.warning 二次确认 → `POST /payments/{no}/notifications/resend`
 *   （不改订单状态，仅补发投递；成功 toast）。
 *
 * 复用既有只读字段 grid（.desc-table，同 app-detail-modal 范式）+ 后端契约见 Api.Payment。
 */
import { ref, watch } from 'vue';
import { fetchGetPaymentOrderDetail, fetchResendPaymentNotification } from '@/service/api';
import {
  accessTypeRecord,
  displayEnumName,
  enumTagColor,
  payModeRecord,
  paymentChannelRecord,
  paymentStatusRecord,
  paymentStatusTagColor
} from '@/constants/payment';
import { $t } from '@/locales';
import { formatDateTime, formatMoney } from '@/utils/common';
import OrderLifecycle from '@/views/payment/modules/order-lifecycle.vue';

defineOptions({ name: 'PaymentOrderDetailDrawer' });

const props = defineProps<{
  paymentOrderNo: string;
}>();

const visible = defineModel<boolean>('visible', { default: false });

// ---- 基本信息 ----
const detail = ref<Api.Payment.PaymentOrderDetail | null>(null);
const detailLoading = ref(false);

async function loadDetail() {
  if (!props.paymentOrderNo) return;
  detailLoading.value = true;
  const { data, error } = await fetchGetPaymentOrderDetail(props.paymentOrderNo);
  if (!error && data) {
    detail.value = data;
  }
  detailLoading.value = false;
}

// ---- 生命周期（复用 OrderLifecycle 组件：按需首次加载 + 分色/分图标时间线）----
const lifecycleRef = ref<InstanceType<typeof OrderLifecycle> | null>(null);

// tab 状态：v-model 已写值；OrderLifecycle 自管懒加载——`:active` 即首次拉取触发器
const activeTab = ref<'basic' | 'lifecycle'>('basic');

// ---- 通知重发 ----
const resending = ref(false);

function handleResend() {
  window.$dialog?.warning({
    title: $t('page.payment.order.resendConfirm.title'),
    content: $t('page.payment.order.resendConfirm.content'),
    positiveText: $t('common.confirm'),
    negativeText: $t('common.cancel'),
    onPositiveClick: async () => {
      if (!props.paymentOrderNo) return;
      resending.value = true;
      const { error } = await fetchResendPaymentNotification(props.paymentOrderNo);
      resending.value = false;
      // 不改订单状态（仅补发投递）——故不刷新 detail；成功即 toast。
      if (!error) {
        window.$message?.success?.($t('page.payment.order.resendSuccess'));
      }
    }
  });
}

// ---- 打开/关闭重置 ----
watch(visible, val => {
  if (val) {
    detail.value = null;
    lifecycleRef.value?.reset();
    activeTab.value = 'basic';
    loadDetail();
  }
});
</script>

<template>
  <NDrawer v-model:show="visible" :width="720">
    <NDrawerContent :title="`${$t('page.payment.order.detail')} · ${paymentOrderNo}`" closable>
      <!-- 通知重发：NDrawerContent 无 header-extra 槽，置于内容顶部右对齐（等价头部操作） -->
      <div class="mb-12px flex justify-end">
        <NButton size="small" :loading="resending" @click="handleResend">
          {{ $t('page.payment.order.resendNotification') }}
        </NButton>
      </div>

      <NTabs v-model:value="activeTab" type="line" animated>
        <!-- 基本信息（全字段只读）-->
        <NTabPane name="basic" :tab="$t('page.payment.order.basicInfo')">
          <div v-if="detailLoading" class="flex-center min-h-300px">
            <NSpin />
          </div>
          <div v-else-if="detail" class="desc-table">
            <div class="desc-row">
              <div class="desc-label">{{ $t('page.payment.order.paymentOrderNo') }}</div>
              <div class="desc-value"><span class="text-14px">{{ detail.paymentOrderNo }}</span></div>
            </div>
            <div class="desc-row">
              <div class="desc-label">{{ $t('page.payment.order.businessOrderNo') }}</div>
              <div class="desc-value"><span class="text-14px">{{ detail.businessOrderNo }}</span></div>
            </div>
            <div class="desc-row">
              <div class="desc-label">{{ $t('page.payment.order.businessSystemName') }}</div>
              <div class="desc-value">
                <span class="text-14px">{{ detail.businessSystemName || '-' }}</span>
              </div>
            </div>
            <div class="desc-row">
              <div class="desc-label">{{ $t('page.payment.order.status') }}</div>
              <div class="desc-value">
                <NTag size="small" :type="enumTagColor(detail.status, paymentStatusTagColor)">
                  {{ displayEnumName(detail.statusName, detail.status, paymentStatusRecord) }}
                </NTag>
              </div>
            </div>
            <div class="desc-row">
              <div class="desc-label">{{ $t('page.payment.order.amount') }}</div>
              <div class="desc-value"><span class="text-14px font-500">{{ formatMoney(detail.amount) }}</span></div>
            </div>
            <div class="desc-row">
              <div class="desc-label">{{ $t('page.payment.order.payMode') }}</div>
              <div class="desc-value"><span class="text-14px">{{ displayEnumName(detail.payModeName, detail.payMode, payModeRecord) }}</span></div>
            </div>
            <div class="desc-row">
              <div class="desc-label">{{ $t('page.payment.order.accessType') }}</div>
              <div class="desc-value"><span class="text-14px">{{ displayEnumName(detail.accessTypeName, detail.accessType, accessTypeRecord) }}</span></div>
            </div>
            <div class="desc-row">
              <div class="desc-label">{{ $t('page.payment.order.paymentChannel') }}</div>
              <div class="desc-value">
                <span class="text-14px">{{ displayEnumName(detail.paymentChannelName, detail.paymentChannel, paymentChannelRecord) }}</span>
              </div>
            </div>
            <div class="desc-row">
              <div class="desc-label">{{ $t('page.payment.order.paidAt') }}</div>
              <div class="desc-value">
                <span class="text-14px text-disabled">{{ formatDateTime(detail.paidAt) }}</span>
              </div>
            </div>
            <div class="desc-row">
              <div class="desc-label">{{ $t('page.payment.order.createdAt') }}</div>
              <div class="desc-value">
                <span class="text-14px text-disabled">{{ formatDateTime(detail.createdAt) }}</span>
              </div>
            </div>
          </div>
          <NEmpty v-else :description="$t('common.noData')" />
        </NTabPane>

        <!-- 生命周期（合并 PaymentLog + OperationLog 时间线——复用 OrderLifecycle 组件）-->
        <NTabPane name="lifecycle" :tab="$t('page.payment.order.lifecycle')">
          <OrderLifecycle ref="lifecycleRef" :order-no="paymentOrderNo" :active="activeTab === 'lifecycle'" />
        </NTabPane>
      </NTabs>
    </NDrawerContent>
  </NDrawer>
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
.desc-value {
  flex: 1;
  min-width: 0;
  padding: 8px 12px;
  display: flex;
  align-items: center;
}

@media (max-width: 639px) {
  .desc-row {
    flex-direction: column;
  }
  .desc-label {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--n-border-color);
  }
}
</style>
