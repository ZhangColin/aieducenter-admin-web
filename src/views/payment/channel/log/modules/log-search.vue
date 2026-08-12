<script setup lang="ts">
/**
 * 通道交互日志筛选条（PaymentLog）。
 *
 * 7 字段：paymentOrderNo / refundOrderNo / logType(多选) / bankInterface / success(布尔) /
 * returnCode / createdAt 区间。
 *
 * NCollapse 默认折叠——常驻钉住「支付订单号 + 日志类型（多选）」（最常用），其余收入「更多筛选」展开。
 * （spec「露 keyword + status」——payment log 无单一 keyword，钉语义等价的支付订单号 + 日志类型。）
 *
 * 单位换算（搜索组件内独占 UI 状态、提交时清洗）：
 * - 时间：UI 为 NDatePicker datetimerange（毫秒时间戳），提交 → ISO 本地串 `YYYY-MM-DDTHH:mm:ss`（后端 LocalDateTime）。
 * - success：UI 为布尔 NSelect（成功/失败），提交 boolean（null 剔除）。
 */
import { computed, ref } from 'vue';
import dayjs from 'dayjs';
import { logTypeOptions } from '@/constants/payment';
import { $t } from '@/locales';

defineOptions({ name: 'PaymentChannelLogSearch' });

const emit = defineEmits<{
  (e: 'search', filter: Api.Payment.PaymentLogFilter): void;
}>();

// 常驻筛选
const paymentOrderNo = ref('');
const logTypes = ref<Api.Payment.LogType[] | null>(null);

// 更多筛选
const refundOrderNo = ref('');
const bankInterface = ref('');
/** success 布尔筛选用字符串哨兵持有（NSelect Value 不接受 boolean），提交时转 boolean */
const successValue = ref<string | null>(null);
const returnCode = ref('');
const createdAtRange = ref<[number, number] | null>(null);

/** NSelect 选项渲染时翻译（option.label 为 i18n key；语言切换可响应） */
const logTypeSelectOptions = computed(() => logTypeOptions.map(o => ({ ...o, label: $t(o.label) })));
/** success 布尔 NSelect：成功 / 失败（字符串哨兵 'true'/'false'，复用 lifecycle 文案键） */
const successSelectOptions = computed(() => [
  { label: $t('page.payment.lifecycle.success'), value: 'true' },
  { label: $t('page.payment.lifecycle.fail'), value: 'false' }
]);

/** 时间戳 → 后端 LocalDateTime ISO 串（本地墙上时钟、无时区后缀） */
function tsToIso(ts: number | undefined): string | undefined {
  return ts == null ? undefined : dayjs(ts).format('YYYY-MM-DDTHH:mm:ss');
}

/** 清洗 UI 状态为提交载荷：去空、单位换算 */
function buildFilter(): Api.Payment.PaymentLogFilter {
  return {
    ...(paymentOrderNo.value.trim() ? { paymentOrderNo: paymentOrderNo.value.trim() } : {}),
    ...(refundOrderNo.value.trim() ? { refundOrderNo: refundOrderNo.value.trim() } : {}),
    ...(logTypes.value && logTypes.value.length ? { logTypes: logTypes.value } : {}),
    ...(bankInterface.value.trim() ? { bankInterface: bankInterface.value.trim() } : {}),
    ...(successValue.value ? { success: successValue.value === 'true' } : {}),
    ...(returnCode.value.trim() ? { returnCode: returnCode.value.trim() } : {}),
    ...(createdAtRange.value
      ? { createdAtFrom: tsToIso(createdAtRange.value[0]), createdAtTo: tsToIso(createdAtRange.value[1]) }
      : {})
  };
}

function search() {
  emit('search', buildFilter());
}

function reset() {
  paymentOrderNo.value = '';
  logTypes.value = null;
  refundOrderNo.value = '';
  bankInterface.value = '';
  successValue.value = null;
  returnCode.value = '';
  createdAtRange.value = null;
  emit('search', buildFilter());
}
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper">
    <NForm label-placement="left" :label-width="110">
      <!-- 常驻筛选：支付订单号 + 日志类型（多选）+ 操作 -->
      <NGrid responsive="screen" item-responsive>
        <NFormItemGi span="24 s:12 m:8" :label="$t('page.payment.channelLog.paymentOrderNo')" class="pr-24px">
          <NInput
            v-model:value="paymentOrderNo"
            :placeholder="$t('page.payment.channelLog.form.paymentOrderNo')"
            clearable
          />
        </NFormItemGi>
        <NFormItemGi span="24 s:12 m:8" :label="$t('page.payment.channelLog.logType')" class="pr-24px">
          <NSelect
            v-model:value="logTypes"
            multiple
            :options="logTypeSelectOptions"
            :placeholder="$t('page.payment.channelLog.form.logType')"
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
        <NCollapseItem name="more" :title="$t('page.payment.channelLog.moreFilters')">
          <NGrid responsive="screen" item-responsive>
            <NFormItemGi span="24 s:12 m:8" :label="$t('page.payment.channelLog.refundOrderNo')" class="pr-24px">
              <NInput
                v-model:value="refundOrderNo"
                :placeholder="$t('page.payment.channelLog.form.refundOrderNo')"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:8" :label="$t('page.payment.lifecycle.bankInterface')" class="pr-24px">
              <NInput
                v-model:value="bankInterface"
                :placeholder="$t('page.payment.channelLog.form.bankInterface')"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:8" :label="$t('page.payment.channelLog.success')" class="pr-24px">
              <NSelect
                v-model:value="successValue"
                :options="successSelectOptions"
                :placeholder="$t('page.payment.channelLog.form.success')"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:8" :label="$t('page.payment.lifecycle.returnCode')" class="pr-24px">
              <NInput
                v-model:value="returnCode"
                :placeholder="$t('page.payment.channelLog.form.returnCode')"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi span="24 m:16" :label="$t('page.payment.channelLog.createdAt')" class="pr-24px">
              <NDatePicker
                v-model:value="createdAtRange"
                type="datetimerange"
                clearable
                class="w-full"
                :placeholder="$t('page.payment.channelLog.form.createdAt')"
              />
            </NFormItemGi>
          </NGrid>
        </NCollapseItem>
      </NCollapse>
    </NForm>
  </NCard>
</template>

<style scoped></style>
