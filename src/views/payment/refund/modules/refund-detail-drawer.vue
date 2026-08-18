<script setup lang="ts">
/**
 * 退款订单详情抽屉（T4 / #48）。
 *
 * 从退款列表点「详情」打开右侧 NDrawer（width=720），同 T2 结构：
 * - 「基本信息」tab：desc-table 全字段只读回显（状态 NTag / 退款金额 ¥ / 枚举翻译）。
 *   #54 起详情与列表同样带 `*Name` 中文名（statusName / auditTypeName）直读展示。
 * - 「生命周期」tab：复用 `OrderLifecycle` 组件（T2 抽出，payment `/orders/{no}/lifecycle` 同取退款号）。
 * - 抽屉头部「审核」按钮 → 独立审核弹窗（RefundAuditModal：approve/reject + reason）→
 *   `POST /refunds/{no}/audit`；成功后用返回的最新详情就地刷新 + emit `audited` 通知列表重拉。
 * - 抽屉头部「通知重发」按钮 → $dialog.warning 二次确认 → `POST /refunds/{no}/notifications/resend`
 *   （不改订单状态，仅补发投递；成功 toast）。
 *
 * 审核权 `admin:payment:refund:audit`、重发权 `admin:payment:notification:resend`——本次写按钮不接门控，
 * 按 spec follow-up 统一处理（同 T2）。后端对非法状态转移返回错误，走 onError 通用兜底。
 */
import { ref, watch } from 'vue';
import { fetchGetRefundOrderDetail, fetchResendRefundNotification } from '@/service/api';
import {
  auditTypeRecord,
  displayEnumName,
  enumTagColor,
  refundStatusRecord,
  refundStatusTagColor
} from '@/constants/payment';
import { $t } from '@/locales';
import { formatDateTime, formatMoney } from '@/utils/common';
import OrderLifecycle from '@/views/payment/modules/order-lifecycle.vue';
import RefundAuditModal from './refund-audit-modal.vue';

defineOptions({ name: 'RefundDetailDrawer' });

const props = defineProps<{
  refundOrderNo: string;
}>();

const emit = defineEmits<{
  /** 审核成功——退款状态已推进，通知列表重拉刷新行 */
  audited: [];
}>();

const visible = defineModel<boolean>('visible', { default: false });

// ---- 基本信息 ----
const detail = ref<Api.Payment.RefundOrderDetail | null>(null);
const detailLoading = ref(false);

async function loadDetail() {
  if (!props.refundOrderNo) return;
  detailLoading.value = true;
  const { data, error } = await fetchGetRefundOrderDetail(props.refundOrderNo);
  if (!error && data) {
    detail.value = data;
  }
  detailLoading.value = false;
}

// ---- 生命周期（复用 OrderLifecycle 组件）----
const lifecycleRef = ref<InstanceType<typeof OrderLifecycle> | null>(null);

// tab 状态：v-model 已写值；OrderLifecycle 自管懒加载——`:active` 即首次拉取触发器
const activeTab = ref<'basic' | 'lifecycle'>('basic');

// ---- 退款审核 ----
const auditModalVisible = ref(false);

function handleAuditSuccess(updated: Api.Payment.RefundOrderDetail) {
  // 审核已落、状态推进——用返回的最新详情就地刷新抽屉，并通知列表重拉。
  detail.value = updated;
  // 生命周期新增了一条操作事件，重置以便用户切回 lifecycle tab 时重拉。
  lifecycleRef.value?.reset();
  emit('audited');
}

// ---- 通知重发 ----
const resending = ref(false);

function handleResend() {
  window.$dialog?.warning({
    title: $t('page.payment.refund.resendConfirm.title'),
    content: $t('page.payment.refund.resendConfirm.content'),
    positiveText: $t('common.confirm'),
    negativeText: $t('common.cancel'),
    onPositiveClick: async () => {
      if (!props.refundOrderNo) return;
      resending.value = true;
      const { error } = await fetchResendRefundNotification(props.refundOrderNo);
      resending.value = false;
      // 不改订单状态（仅补发投递）——故不刷新 detail；成功即 toast。
      if (!error) {
        window.$message?.success?.($t('page.payment.refund.resendSuccess'));
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
    <NDrawerContent :title="`${$t('page.payment.refund.detail')} · ${refundOrderNo}`" closable>
      <!-- 头部写操作：审核 + 通知重发（NDrawerContent 无 header-extra 槽，置于内容顶部右对齐） -->
      <div class="mb-12px flex justify-end gap-8px">
        <NButton size="small" type="primary" @click="auditModalVisible = true">
          {{ $t('page.payment.refund.audit') }}
        </NButton>
        <NButton size="small" :loading="resending" @click="handleResend">
          {{ $t('page.payment.refund.resendNotification') }}
        </NButton>
      </div>

      <NTabs v-model:value="activeTab" type="line" animated>
        <!-- 基本信息（全字段只读）-->
        <NTabPane name="basic" :tab="$t('page.payment.refund.basicInfo')">
          <div v-if="detailLoading" class="flex-center min-h-300px">
            <NSpin />
          </div>
          <div v-else-if="detail" class="desc-table">
            <div class="desc-row">
              <div class="desc-label">{{ $t('page.payment.refund.refundOrderNo') }}</div>
              <div class="desc-value"><span class="text-14px">{{ detail.refundOrderNo }}</span></div>
            </div>
            <div class="desc-row">
              <div class="desc-label">{{ $t('page.payment.refund.paymentOrderNo') }}</div>
              <div class="desc-value"><span class="text-14px">{{ detail.paymentOrderNo }}</span></div>
            </div>
            <div class="desc-row">
              <div class="desc-label">{{ $t('page.payment.refund.businessOrderNo') }}</div>
              <div class="desc-value"><span class="text-14px">{{ detail.businessOrderNo }}</span></div>
            </div>
            <div class="desc-row">
              <div class="desc-label">{{ $t('page.payment.refund.businessSystemName') }}</div>
              <div class="desc-value">
                <span class="text-14px">{{ detail.businessSystemName || '-' }}</span>
              </div>
            </div>
            <div class="desc-row">
              <div class="desc-label">{{ $t('page.payment.refund.status') }}</div>
              <div class="desc-value">
                <NTag size="small" :type="enumTagColor(refundStatusTagColor, detail.status)">
                  {{ displayEnumName(detail.statusName, detail.status, refundStatusRecord) }}
                </NTag>
              </div>
            </div>
            <div class="desc-row">
              <div class="desc-label">{{ $t('page.payment.refund.refundAmount') }}</div>
              <div class="desc-value"><span class="text-14px font-500">{{ formatMoney(detail.refundAmount) }}</span></div>
            </div>
            <div class="desc-row">
              <div class="desc-label">{{ $t('page.payment.refund.auditType') }}</div>
              <div class="desc-value">
                <span class="text-14px">{{ displayEnumName(detail.auditTypeName, detail.auditType, auditTypeRecord) }}</span>
              </div>
            </div>
            <div class="desc-row">
              <div class="desc-label">{{ $t('page.payment.refund.auditor') }}</div>
              <div class="desc-value">
                <!-- #54 对齐：响应只余 auditorName（auditorId/auditedAt 为 payment ghost，admin #59 删） -->
                <span class="text-14px">{{ detail.auditorName || '-' }}</span>
              </div>
            </div>
            <div class="desc-row">
              <div class="desc-label">{{ $t('page.payment.refund.createdAt') }}</div>
              <div class="desc-value">
                <span class="text-14px text-disabled">{{ formatDateTime(detail.createdAt) }}</span>
              </div>
            </div>
          </div>
          <NEmpty v-else :description="$t('common.noData')" />
        </NTabPane>

        <!-- 生命周期（合并 PaymentLog + OperationLog 时间线——复用 OrderLifecycle 组件）-->
        <NTabPane name="lifecycle" :tab="$t('page.payment.refund.lifecycle')">
          <OrderLifecycle ref="lifecycleRef" :order-no="refundOrderNo" :active="activeTab === 'lifecycle'" />
        </NTabPane>
      </NTabs>

      <!-- 退款审核弹窗（独立：approve/reject + reason）-->
      <RefundAuditModal v-model:visible="auditModalVisible" :refund-order-no="refundOrderNo" @success="handleAuditSuccess" />
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
