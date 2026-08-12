<script setup lang="ts">
/**
 * 支付订单筛选条。
 *
 * ~10 字段：paymentOrderNo / businessOrderNo / businessSystemName / status(多选) / payMode /
 * accessType / paymentChannel / 金额区间 / createdAt 区间 / paidAt 区间。
 *
 * NCollapse 默认折叠——常驻钉住「支付订单号 + 状态」（最常用），其余收入「更多筛选」展开。
 * （spec「露 keyword + status」——payment 无单一 keyword，钉语义等价的订单号 + 状态。）
 *
 * 单位换算（搜索组件内独占 UI 状态、提交时清洗）：
 * - 金额：UI 为元（NInputNumber precision=2），提交 → 整数分（payment 域单位）；
 * - 时间：UI 为 NDatePicker datetimerange（毫秒时间戳），提交 → ISO 本地串 `YYYY-MM-DDTHH:mm:ss`（后端 LocalDateTime）。
 */
import { computed, ref } from 'vue';
import dayjs from 'dayjs';
import { accessTypeOptions, paymentChannelOptions, payModeOptions, paymentStatusOptions } from '@/constants/payment';
import { $t } from '@/locales';

defineOptions({ name: 'PaymentOrderSearch' });

const emit = defineEmits<{
  (e: 'search', filter: Api.Payment.PaymentOrderFilter): void;
}>();

// 常驻筛选
const paymentOrderNo = ref('');
const statuses = ref<Api.Payment.PaymentStatus[] | null>(null);

// 更多筛选
const businessOrderNo = ref('');
const businessSystemName = ref('');
const payMode = ref<Api.Payment.PayMode | null>(null);
const accessType = ref<Api.Payment.AccessType | null>(null);
const paymentChannel = ref<Api.Payment.PaymentChannel | null>(null);
const amountMinYuan = ref<number | null>(null);
const amountMaxYuan = ref<number | null>(null);
const createdAtRange = ref<[number, number] | null>(null);
const paidAtRange = ref<[number, number] | null>(null);

/** NSelect 选项渲染时翻译（option.label 为 i18n key；语言切换可响应） */
const statusSelectOptions = computed(() => paymentStatusOptions.map(o => ({ ...o, label: $t(o.label) })));
const payModeSelectOptions = computed(() => payModeOptions.map(o => ({ ...o, label: $t(o.label) })));
const accessTypeSelectOptions = computed(() => accessTypeOptions.map(o => ({ ...o, label: $t(o.label) })));
const paymentChannelSelectOptions = computed(() => paymentChannelOptions.map(o => ({ ...o, label: $t(o.label) })));

/** 元 → 整数分 */
function yuanToCents(yuan: number | null): number | undefined {
  return yuan == null ? undefined : Math.round(yuan * 100);
}

/** 时间戳 → 后端 LocalDateTime ISO 串（本地墙上时钟、无时区后缀） */
function tsToIso(ts: number | undefined): string | undefined {
  return ts == null ? undefined : dayjs(ts).format('YYYY-MM-DDTHH:mm:ss');
}

/** 清洗 UI 状态为提交载荷：去空、单位换算 */
function buildFilter(): Api.Payment.PaymentOrderFilter {
  const amountMin = yuanToCents(amountMinYuan.value);
  const amountMax = yuanToCents(amountMaxYuan.value);
  return {
    ...(paymentOrderNo.value.trim() ? { paymentOrderNo: paymentOrderNo.value.trim() } : {}),
    ...(businessOrderNo.value.trim() ? { businessOrderNo: businessOrderNo.value.trim() } : {}),
    ...(businessSystemName.value.trim() ? { businessSystemName: businessSystemName.value.trim() } : {}),
    ...(statuses.value && statuses.value.length ? { statuses: statuses.value } : {}),
    ...(payMode.value ? { payMode: payMode.value } : {}),
    ...(accessType.value ? { accessType: accessType.value } : {}),
    ...(paymentChannel.value ? { paymentChannel: paymentChannel.value } : {}),
    ...(amountMin != null ? { amountMin } : {}),
    ...(amountMax != null ? { amountMax } : {}),
    ...(createdAtRange.value
      ? { createdAtFrom: tsToIso(createdAtRange.value[0]), createdAtTo: tsToIso(createdAtRange.value[1]) }
      : {}),
    ...(paidAtRange.value
      ? { paidAtFrom: tsToIso(paidAtRange.value[0]), paidAtTo: tsToIso(paidAtRange.value[1]) }
      : {})
  };
}

function search() {
  emit('search', buildFilter());
}

function reset() {
  paymentOrderNo.value = '';
  statuses.value = null;
  businessOrderNo.value = '';
  businessSystemName.value = '';
  payMode.value = null;
  accessType.value = null;
  paymentChannel.value = null;
  amountMinYuan.value = null;
  amountMaxYuan.value = null;
  createdAtRange.value = null;
  paidAtRange.value = null;
  emit('search', buildFilter());
}
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper">
    <NForm label-placement="left" :label-width="110">
      <!-- 常驻筛选：支付订单号 + 状态（多选）+ 操作 -->
      <NGrid responsive="screen" item-responsive>
        <NFormItemGi span="24 s:12 m:8" :label="$t('page.payment.order.paymentOrderNo')" class="pr-24px">
          <NInput v-model:value="paymentOrderNo" :placeholder="$t('page.payment.order.form.paymentOrderNo')" clearable />
        </NFormItemGi>
        <NFormItemGi span="24 s:12 m:8" :label="$t('page.payment.order.status')" class="pr-24px">
          <NSelect
            v-model:value="statuses"
            multiple
            :options="statusSelectOptions"
            :placeholder="$t('page.payment.order.form.status')"
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
        <NCollapseItem name="more" :title="$t('page.payment.order.moreFilters')">
          <NGrid responsive="screen" item-responsive>
            <NFormItemGi span="24 s:12 m:8" :label="$t('page.payment.order.businessOrderNo')" class="pr-24px">
              <NInput
                v-model:value="businessOrderNo"
                :placeholder="$t('page.payment.order.form.businessOrderNo')"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:8" :label="$t('page.payment.order.businessSystemName')" class="pr-24px">
              <NInput
                v-model:value="businessSystemName"
                :placeholder="$t('page.payment.order.form.businessSystemName')"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:8" :label="$t('page.payment.order.payMode')" class="pr-24px">
              <NSelect
                v-model:value="payMode"
                :options="payModeSelectOptions"
                :placeholder="$t('page.payment.order.form.payMode')"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:8" :label="$t('page.payment.order.accessType')" class="pr-24px">
              <NSelect
                v-model:value="accessType"
                :options="accessTypeSelectOptions"
                :placeholder="$t('page.payment.order.form.accessType')"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:8" :label="$t('page.payment.order.paymentChannel')" class="pr-24px">
              <NSelect
                v-model:value="paymentChannel"
                :options="paymentChannelSelectOptions"
                :placeholder="$t('page.payment.order.form.paymentChannel')"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:8" :label="$t('page.payment.order.amountRange')" class="pr-24px">
              <div class="flex items-center gap-8px w-full">
                <NInputNumber
                  v-model:value="amountMinYuan"
                  :placeholder="$t('page.payment.order.amountMin')"
                  :precision="2"
                  :min="0"
                  class="flex-1"
                  clearable
                />
                <span class="text-icon">~</span>
                <NInputNumber
                  v-model:value="amountMaxYuan"
                  :placeholder="$t('page.payment.order.amountMax')"
                  :precision="2"
                  :min="0"
                  class="flex-1"
                  clearable
                />
              </div>
            </NFormItemGi>
            <NFormItemGi span="24 m:16" :label="$t('page.payment.order.createdAt')" class="pr-24px">
              <NDatePicker
                v-model:value="createdAtRange"
                type="datetimerange"
                clearable
                class="w-full"
                :placeholder="$t('page.payment.order.form.createdAt')"
              />
            </NFormItemGi>
            <NFormItemGi span="24 m:16" :label="$t('page.payment.order.paidAt')" class="pr-24px">
              <NDatePicker
                v-model:value="paidAtRange"
                type="datetimerange"
                clearable
                class="w-full"
                :placeholder="$t('page.payment.order.form.paidAt')"
              />
            </NFormItemGi>
          </NGrid>
        </NCollapseItem>
      </NCollapse>
    </NForm>
  </NCard>
</template>

<style scoped></style>
