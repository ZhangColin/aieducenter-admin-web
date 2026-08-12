<script setup lang="ts">
/**
 * 支付订单详情抽屉（T2 / #44）。
 *
 * 从列表点「详情」打开右侧 NDrawer（width=720）：
 * - 「基本信息」tab：desc-table 全字段只读回显（含状态 NTag / 金额 ¥ / 枚举翻译）。
 * - 「生命周期」tab：NTimeline 渲染 `GET /orders/{no}/lifecycle`（payment 已合并 PaymentLog +
 *   OperationLog 按 createdAt 排序）。机机通道事件 vs 人/系统操作事件 **分色（dot outcome）+
 *   分图标（source）**，success/fail 可辨（PAYMENT_LOG 的 success boolean + OPERATION_LOG 的
 *   result 启发式着色）。生命周期 tab 按需首次加载。
 * - 抽屉头部「通知重发」按钮 → $dialog.warning 二次确认 → `POST /payments/{no}/notifications/resend`
 *   （不改订单状态，仅补发投递；成功 toast）。
 *
 * 复用既有只读字段 grid（.desc-table，同 app-detail-modal 范式）+ 后端契约见 Api.Payment。
 */
import { ref, watch } from 'vue';
import {
  fetchGetOrderLifecycle,
  fetchGetPaymentOrderDetail,
  fetchResendPaymentNotification
} from '@/service/api';
import {
  accessTypeRecord,
  logTypeRecord,
  operationTypeRecord,
  payModeRecord,
  paymentChannelRecord,
  paymentStatusRecord
} from '@/constants/payment';
import { $t } from '@/locales';
import { formatDateTime, formatMoney } from '@/utils/common';

defineOptions({ name: 'PaymentOrderDetailDrawer' });

const props = defineProps<{
  paymentOrderNo: string;
}>();

const visible = defineModel<boolean>('visible', { default: false });

// ---- 基本信息 ----
const detail = ref<Api.Payment.PaymentOrderDetail | null>(null);
const detailLoading = ref(false);

/** 支付订单状态标签色（唯一着色列，与列表页一致） */
const statusTagMap: Record<Api.Payment.PaymentStatus, NaiveUI.ThemeColor> = {
  PENDING: 'warning',
  PAID: 'success',
  FAILED: 'error',
  CANCELLED: 'default',
  EXPIRED: 'default'
};

/** 文本型枚举回显：null → '-'，已知值翻译、未知值回退原值（后端新增枚举时不报错） */
function enumLabel<T extends string>(record: Record<T, App.I18n.I18nKey>, value: T | null | undefined): string {
  if (!value) return '-';
  const key = record[value];
  return key ? $t(key) : value;
}

async function loadDetail() {
  if (!props.paymentOrderNo) return;
  detailLoading.value = true;
  const { data, error } = await fetchGetPaymentOrderDetail(props.paymentOrderNo);
  if (!error && data) {
    detail.value = data;
  }
  detailLoading.value = false;
}

// ---- 生命周期 ----
const lifecycle = ref<Api.Payment.OrderLifecycle | null>(null);
const lifecycleLoading = ref(false);
const lifecycleLoaded = ref(false);

async function loadLifecycle() {
  if (!props.paymentOrderNo || lifecycleLoaded.value) return;
  lifecycleLoading.value = true;
  const { data, error } = await fetchGetOrderLifecycle(props.paymentOrderNo);
  if (!error && data) {
    lifecycle.value = data;
  }
  lifecycleLoaded.value = true;
  lifecycleLoading.value = false;
}

/** NTimeline dot 类型：PAYMENT_LOG 按 success 决定 success/error，OPERATION_LOG 统一 info（行为者=蓝） */
function timelineType(ev: Api.Payment.LifecycleEvent): 'success' | 'error' | 'info' | 'default' {
  if (ev.source === 'PAYMENT_LOG') {
    if (ev.success === true) return 'success';
    if (ev.success === false) return 'error';
    return 'default';
  }
  return 'info';
}

/** 生命周期事件标题：PAYMENT_LOG→logType，OPERATION_LOG→operation（均未知回退 source 文案） */
function eventTitle(ev: Api.Payment.LifecycleEvent): string {
  if (ev.source === 'PAYMENT_LOG') return enumLabel(logTypeRecord, ev.logType);
  return enumLabel(operationTypeRecord, ev.operation);
}

/** 操作结果（自由稳定 token）启发式着色：FAIL/ERROR/REJECT→error，SUCCESS/APPROVE→success，余 default */
function resultTagType(result: string | null): NaiveUI.ThemeColor {
  if (!result) return 'default';
  const r = result.toUpperCase();
  if (r.includes('FAIL') || r.includes('ERROR') || r.includes('REJECT')) return 'error';
  if (r.includes('SUCCESS') || r.includes('APPROVE') || r.includes('OK') || r === 'DONE') return 'success';
  return 'default';
}

/** executionTime 为 Long→string（cartisan-web 全局 Jackson），展示兜底 Number() */
function formatExecMs(ms: string | null): string {
  if (ms == null || ms === '') return '-';
  const n = Number(ms);
  return Number.isNaN(n) ? '-' : `${n} ms`;
}

// ---- tab 切换（生命周期按需首次加载）----
const activeTab = ref<'basic' | 'lifecycle'>('basic');

function handleTabChange(name: 'basic' | 'lifecycle') {
  activeTab.value = name;
  if (name === 'lifecycle') loadLifecycle();
}

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
    lifecycle.value = null;
    lifecycleLoaded.value = false;
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

      <NTabs v-model:value="activeTab" type="line" animated @update:value="handleTabChange">
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
                <NTag size="small" :type="statusTagMap[detail.status] ?? 'default'">
                  {{ enumLabel(paymentStatusRecord, detail.status) }}
                </NTag>
              </div>
            </div>
            <div class="desc-row">
              <div class="desc-label">{{ $t('page.payment.order.amount') }}</div>
              <div class="desc-value"><span class="text-14px font-500">{{ formatMoney(detail.amount) }}</span></div>
            </div>
            <div class="desc-row">
              <div class="desc-label">{{ $t('page.payment.order.payMode') }}</div>
              <div class="desc-value"><span class="text-14px">{{ enumLabel(payModeRecord, detail.payMode) }}</span></div>
            </div>
            <div class="desc-row">
              <div class="desc-label">{{ $t('page.payment.order.accessType') }}</div>
              <div class="desc-value"><span class="text-14px">{{ enumLabel(accessTypeRecord, detail.accessType) }}</span></div>
            </div>
            <div class="desc-row">
              <div class="desc-label">{{ $t('page.payment.order.paymentChannel') }}</div>
              <div class="desc-value">
                <span class="text-14px">{{ enumLabel(paymentChannelRecord, detail.paymentChannel) }}</span>
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

        <!-- 生命周期（合并 PaymentLog + OperationLog 时间线）-->
        <NTabPane name="lifecycle" :tab="$t('page.payment.order.lifecycle')">
          <div v-if="lifecycleLoading" class="flex-center min-h-300px">
            <NSpin />
          </div>
          <div v-else-if="lifecycle && lifecycle.events.length" class="pt-8px">
            <NTimeline size="large">
              <NTimelineItem
                v-for="(ev, i) in lifecycle.events"
                :key="`${ev.createdAt}-${ev.source}-${i}`"
                :type="timelineType(ev)"
                :time="formatDateTime(ev.createdAt)"
              >
                <div class="flex flex-wrap items-center gap-8px">
                  <!-- 分图标：机机通道=payment，行为者=person -->
                  <icon-ic-round-payment v-if="ev.source === 'PAYMENT_LOG'" class="text-16px" />
                  <icon-ic-round-person v-else class="text-16px" />
                  <span class="font-500">{{ eventTitle(ev) }}</span>
                  <!-- 分色 outcome tag -->
                  <NTag v-if="ev.source === 'PAYMENT_LOG'" size="tiny" :type="ev.success === false ? 'error' : ev.success === true ? 'success' : 'default'">
                    {{ ev.success === false ? $t('page.payment.lifecycle.fail') : ev.success === true ? $t('page.payment.lifecycle.success') : $t('page.payment.lifecycle.unknown') }}
                  </NTag>
                  <NTag v-else size="tiny" :type="resultTagType(ev.result)">
                    {{ ev.result || '-' }}
                  </NTag>
                </div>
                <!-- 机机通道事件 meta -->
                <div v-if="ev.source === 'PAYMENT_LOG'" class="mt-4px flex flex-col gap-2px text-12px text-[var(--n-text-color-3)]">
                  <span v-if="ev.bankInterface">{{ $t('page.payment.lifecycle.bankInterface') }}: {{ ev.bankInterface }}</span>
                  <span v-if="ev.returnCode || ev.returnMsg">
                    {{ $t('page.payment.lifecycle.returnCode') }}: {{ ev.returnCode || '-' }}
                    <span v-if="ev.returnMsg"> · {{ ev.returnMsg }}</span>
                  </span>
                  <span>{{ $t('page.payment.lifecycle.executionTime') }}: {{ formatExecMs(ev.executionTime) }}</span>
                </div>
                <!-- 行为者操作事件 meta -->
                <div v-else class="mt-4px flex flex-col gap-2px text-12px text-[var(--n-text-color-3)]">
                  <span v-if="ev.operatorName">
                    {{ $t('page.payment.lifecycle.operator') }}: {{ ev.operatorName
                    }}<span v-if="ev.operatorSystem"> ({{ ev.operatorSystem }})</span>
                  </span>
                  <span v-if="ev.remark">{{ $t('page.payment.lifecycle.remark') }}: {{ ev.remark }}</span>
                </div>
              </NTimelineItem>
            </NTimeline>
          </div>
          <NEmpty v-else :description="$t('page.payment.lifecycle.noEvents')" />
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
