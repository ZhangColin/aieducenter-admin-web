<script setup lang="ts">
/**
 * 退款订单筛选条。
 *
 * 9 字段：refundOrderNo / paymentOrderNo / businessOrderNo / businessSystemName / status(多选) /
 * auditType / auditorId / 退款金额区间 / createdAt 区间。
 *
 * NCollapse 默认折叠——常驻钉住「退款订单号 + 状态」（最常用），其余收入「更多筛选」展开。
 * （spec「露 keyword + status」——refund 无单一 keyword，钉语义等价的退款订单号 + 状态。）
 *
 * 单位换算（搜索组件内独占 UI 状态、提交时清洗）：
 * - 金额：UI 为元（NInputNumber precision=2），提交 → 整数分（payment 域单位）；
 * - 时间：UI 为 NDatePicker datetimerange（毫秒时间戳），提交 → ISO 本地串 `YYYY-MM-DDTHH:mm:ss`（后端 LocalDateTime）。
 * - auditorId：Long 雪花 id，用 NInput（文本）持有 → 提交字符串，后端绑 Long（防 JS number 精度丢失）。
 */
import { computed, ref } from 'vue';
import dayjs from 'dayjs';
import { auditTypeOptions, refundStatusOptions } from '@/constants/payment';
import { $t } from '@/locales';

defineOptions({ name: 'PaymentRefundSearch' });

const emit = defineEmits<{
  (e: 'search', filter: Api.Payment.RefundOrderFilter): void;
}>();

// 常驻筛选
const refundOrderNo = ref('');
const statuses = ref<Api.Payment.RefundStatus[] | null>(null);

// 更多筛选
const paymentOrderNo = ref('');
const businessOrderNo = ref('');
const businessSystemName = ref('');
const auditType = ref<Api.Payment.AuditType | null>(null);
const auditorId = ref('');
const refundAmountMinYuan = ref<number | null>(null);
const refundAmountMaxYuan = ref<number | null>(null);
const createdAtRange = ref<[number, number] | null>(null);

/** NSelect 选项渲染时翻译（option.label 为 i18n key；语言切换可响应） */
const statusSelectOptions = computed(() => refundStatusOptions.map(o => ({ ...o, label: $t(o.label) })));
const auditTypeSelectOptions = computed(() => auditTypeOptions.map(o => ({ ...o, label: $t(o.label) })));

/** 元 → 整数分 */
function yuanToCents(yuan: number | null): number | undefined {
  return yuan == null ? undefined : Math.round(yuan * 100);
}

/** 时间戳 → 后端 LocalDateTime ISO 串（本地墙上时钟、无时区后缀） */
function tsToIso(ts: number | undefined): string | undefined {
  return ts == null ? undefined : dayjs(ts).format('YYYY-MM-DDTHH:mm:ss');
}

/** 清洗 UI 状态为提交载荷：去空、单位换算 */
function buildFilter(): Api.Payment.RefundOrderFilter {
  const refundAmountMin = yuanToCents(refundAmountMinYuan.value);
  const refundAmountMax = yuanToCents(refundAmountMaxYuan.value);
  return {
    ...(refundOrderNo.value.trim() ? { refundOrderNo: refundOrderNo.value.trim() } : {}),
    ...(paymentOrderNo.value.trim() ? { paymentOrderNo: paymentOrderNo.value.trim() } : {}),
    ...(businessOrderNo.value.trim() ? { businessOrderNo: businessOrderNo.value.trim() } : {}),
    ...(businessSystemName.value.trim() ? { businessSystemName: businessSystemName.value.trim() } : {}),
    ...(statuses.value && statuses.value.length ? { statuses: statuses.value } : {}),
    ...(auditType.value ? { auditType: auditType.value } : {}),
    ...(auditorId.value.trim() ? { auditorId: auditorId.value.trim() } : {}),
    ...(refundAmountMin != null ? { refundAmountMin } : {}),
    ...(refundAmountMax != null ? { refundAmountMax } : {}),
    ...(createdAtRange.value
      ? { createdAtFrom: tsToIso(createdAtRange.value[0]), createdAtTo: tsToIso(createdAtRange.value[1]) }
      : {})
  };
}

function search() {
  emit('search', buildFilter());
}

function reset() {
  refundOrderNo.value = '';
  statuses.value = null;
  paymentOrderNo.value = '';
  businessOrderNo.value = '';
  businessSystemName.value = '';
  auditType.value = null;
  auditorId.value = '';
  refundAmountMinYuan.value = null;
  refundAmountMaxYuan.value = null;
  createdAtRange.value = null;
  emit('search', buildFilter());
}
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper">
    <NForm label-placement="left" :label-width="110">
      <!-- 常驻筛选：退款订单号 + 状态（多选）+ 操作 -->
      <NGrid responsive="screen" item-responsive>
        <NFormItemGi span="24 s:12 m:8" :label="$t('page.payment.refund.refundOrderNo')" class="pr-24px">
          <NInput v-model:value="refundOrderNo" :placeholder="$t('page.payment.refund.form.refundOrderNo')" clearable />
        </NFormItemGi>
        <NFormItemGi span="24 s:12 m:8" :label="$t('page.payment.refund.status')" class="pr-24px">
          <NSelect
            v-model:value="statuses"
            multiple
            :options="statusSelectOptions"
            :placeholder="$t('page.payment.refund.form.status')"
            clearable
          />
        </NFormItemGi>
        <NFormItemGi span="24 m:8" class="pr-24px">
          <NSpace class="w-full" justify="end">
            <NButton @click="reset">
              <template #icon>
                <icon-ic-round-refresh class="text-icon" />
              </template>
              {{ $t('common.reset') }}
            </NButton>
            <NButton type="primary" ghost @click="search">
              <template #icon>
                <icon-ic-round-search class="text-icon" />
              </template>
              {{ $t('common.search') }}
            </NButton>
          </NSpace>
        </NFormItemGi>
      </NGrid>
      <!-- 更多筛选（默认折叠） -->
      <NCollapse :default-expanded-names="[]" arrow-placement="right" class="mt-8px">
        <NCollapseItem name="more" :title="$t('page.payment.refund.moreFilters')">
          <NGrid responsive="screen" item-responsive>
            <NFormItemGi span="24 s:12 m:8" :label="$t('page.payment.refund.paymentOrderNo')" class="pr-24px">
              <NInput
                v-model:value="paymentOrderNo"
                :placeholder="$t('page.payment.refund.form.paymentOrderNo')"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:8" :label="$t('page.payment.refund.businessOrderNo')" class="pr-24px">
              <NInput
                v-model:value="businessOrderNo"
                :placeholder="$t('page.payment.refund.form.businessOrderNo')"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:8" :label="$t('page.payment.refund.businessSystemName')" class="pr-24px">
              <NInput
                v-model:value="businessSystemName"
                :placeholder="$t('page.payment.refund.form.businessSystemName')"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:8" :label="$t('page.payment.refund.auditType')" class="pr-24px">
              <NSelect
                v-model:value="auditType"
                :options="auditTypeSelectOptions"
                :placeholder="$t('page.payment.refund.form.auditType')"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:8" :label="$t('page.payment.refund.auditorId')" class="pr-24px">
              <NInput
                v-model:value="auditorId"
                :placeholder="$t('page.payment.refund.form.auditorId')"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:8" :label="$t('page.payment.refund.refundAmountRange')" class="pr-24px">
              <div class="flex items-center gap-8px w-full">
                <NInputNumber
                  v-model:value="refundAmountMinYuan"
                  :placeholder="$t('page.payment.refund.refundAmountMin')"
                  :precision="2"
                  :min="0"
                  class="flex-1"
                  clearable
                />
                <span class="text-icon">~</span>
                <NInputNumber
                  v-model:value="refundAmountMaxYuan"
                  :placeholder="$t('page.payment.refund.refundAmountMax')"
                  :precision="2"
                  :min="0"
                  class="flex-1"
                  clearable
                />
              </div>
            </NFormItemGi>
            <NFormItemGi span="24 m:16" :label="$t('page.payment.refund.createdAt')" class="pr-24px">
              <NDatePicker
                v-model:value="createdAtRange"
                type="datetimerange"
                clearable
                class="w-full"
                :placeholder="$t('page.payment.refund.form.createdAt')"
              />
            </NFormItemGi>
          </NGrid>
        </NCollapseItem>
      </NCollapse>
    </NForm>
  </NCard>
</template>

<style scoped></style>
