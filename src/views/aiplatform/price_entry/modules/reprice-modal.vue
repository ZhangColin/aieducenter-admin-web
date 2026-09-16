<script setup lang="ts">
/**
 * 单价行原子改价弹窗（#62）——unitPrice + currency + effectiveFrom（必填，默认即时；未来时点=预发布）。
 *
 * 契约要点（api-docs + REQ-20 #75）：unitPrice **响应 string 明文小数 / 请求 number**（BigDecimal 语义）——
 * 预填保响应原串直灌输入框（勿经 Number() 往返渲染：微小价位如 0.000000014 会落科学计数法形），
 * 提交时才转 number。effectiveFrom ISO-8601 Instant UTC 带 Z（tsToUtcInstant——成本域时间窗同形）。
 * 起点早于被关行起点/区间重叠由 provider 裁决（METER_005/008），前端只做基础正数/必填拦截，失败透传 toast。
 *
 * 成功后弹窗**不关**，切换回执视图呈现 closed/opened 两行（同事务库内事实——closed 保留原开行操作者、
 * effectiveTo=新起点；opened 敞口生效），完成即关。列表刷新由父页 success 钩子承担。
 */
import { computed, ref, watch } from 'vue';
import { NAlert, NDatePicker, NForm, NFormItem, NInput, NModal, NTag } from 'naive-ui';
import { fetchRepriceAiplatformPriceEntry } from '@/service/api';
import { $t } from '@/locales';
import { formatDateTime, tsToUtcInstant } from '@/utils/common';

defineOptions({ name: 'PriceEntryRepriceModal' });

const props = defineProps<{
  /** 改价目标（当前行；打开时必有值） */
  entry: Api.Aiplatform.UnitPriceEntry | null;
}>();

const emit = defineEmits<{
  /** 改价成功（父页 toast + 刷列表；回执呈现留本弹窗） */
  success: [];
}>();

const visible = defineModel<boolean>('visible', { default: false });

const unitPriceText = ref('');
const currency = ref('');
const effectiveFromTs = ref<number | null>(null);
const submitting = ref(false);
/** 成功回执（非 null 即回执视图态） */
const receipt = ref<Api.Aiplatform.RepriceReceipt | null>(null);

watch(visible, val => {
  if (!val || !props.entry) return;
  // 预填：unitPrice 响应原串直灌（string→number 仅发生在提交时）
  unitPriceText.value = props.entry.unitPrice;
  currency.value = props.entry.currency;
  // effectiveFrom 必填（AC）：默认即时（Date.now），未来时点=预发布
  effectiveFromTs.value = Date.now();
  receipt.value = null;
});

/** 正数明文小数（≤12 位）即合法——BigDecimal 语义原样提交，无分/元换算。 */
const parsedUnitPrice = computed(() => {
  const text = unitPriceText.value.trim();
  if (!/^\d+(\.\d{1,12})?$/.test(text)) return null;
  const n = Number(text);
  return n > 0 ? n : null;
});

const isValid = computed(
  () => parsedUnitPrice.value !== null && currency.value.trim() !== '' && effectiveFromTs.value !== null
);

/** 回执视图态：正按钮=完成（自动关）；表单态：确认改价（成功后 return false 留弹窗切回执）。 */
async function handlePositiveClick() {
  if (receipt.value) return true;
  if (!isValid.value || effectiveFromTs.value === null || !props.entry) return false;
  const command: Api.Aiplatform.RepriceCommand = {
    unitPrice: parsedUnitPrice.value as number,
    currency: currency.value.trim(),
    effectiveFrom: tsToUtcInstant(effectiveFromTs.value)
  };
  submitting.value = true;
  const { data, error } = await fetchRepriceAiplatformPriceEntry(props.entry.id, command);
  submitting.value = false;
  if (!error && data) {
    receipt.value = data;
    emit('success');
    return false;
  }
  // 失败：onError 已统一弹透传 message；返回 false 阻止自动关（用户可修正重试）
  return false;
}

/** 回执行摘要（closed/opened 同构；单次映射，模板直读）。 */
function toReceiptRowMeta(row: Api.Aiplatform.UnitPriceEntry) {
  return {
    key: `${row.provider} / ${row.model} · ${row.tokenKindName}`,
    price: `${row.unitPrice} ${row.currency}`,
    range: row.effectiveTo ? `${formatDateTime(row.effectiveFrom)} → ${formatDateTime(row.effectiveTo)}` : formatDateTime(row.effectiveFrom),
    operator: row.operatorName ?? '-'
  };
}

const receiptRows = computed(() => (receipt.value ? [receipt.value.closed, receipt.value.opened].map(toReceiptRowMeta) : []));
</script>

<template>
  <NModal
    v-model:show="visible"
    :title="receipt ? $t('page.aiplatform.priceEntry.repriceModal.receiptTitle') : $t('page.aiplatform.priceEntry.repriceModal.title')"
    preset="dialog"
    :positive-text="receipt ? $t('page.aiplatform.priceEntry.repriceModal.done') : $t('page.aiplatform.priceEntry.repriceModal.confirm')"
    :negative-text="receipt ? undefined : $t('common.cancel')"
    :positive-button-props="{ disabled: !receipt && !isValid, loading: submitting }"
    @positive-click="handlePositiveClick"
  >
    <!-- 回执视图：closed/opened 两行库内事实 -->
    <template v-if="receipt">
      <NAlert type="success" :show-icon="false" class="mb-12px">
        {{ $t('page.aiplatform.priceEntry.repriceModal.receiptNote') }}
      </NAlert>
      <div
        v-for="(row, idx) in receiptRows"
        :key="idx"
        class="mb-8px rounded-4px border border-gray-200 px-12px py-8px dark:border-gray-700"
      >
        <div class="flex items-center gap-8px">
          <NTag :type="idx === 0 ? 'default' : 'success'" size="small">
            {{ idx === 0 ? $t('page.aiplatform.priceEntry.repriceModal.receiptClosed') : $t('page.aiplatform.priceEntry.repriceModal.receiptOpened') }}
          </NTag>
          <span class="font-mono text-13px">{{ row.key }}</span>
          <span class="ml-auto text-12px text-gray-400">{{ row.operator }}</span>
        </div>
        <div class="mt-4px flex items-center justify-between text-13px">
          <span class="font-mono">{{ row.price }}</span>
          <span class="flex items-center gap-8px">
            <span>{{ row.range }}</span>
            <NTag v-if="idx === 1" type="info" size="small">
              {{ $t('page.aiplatform.priceEntry.repriceModal.receiptOpen') }}
            </NTag>
          </span>
        </div>
      </div>
    </template>
    <!-- 表单视图 -->
    <NForm v-else label-placement="top" class="pt-12px">
      <div class="mb-12px text-13px text-gray-500">
        {{
          $t('page.aiplatform.priceEntry.target', {
            provider: entry?.provider,
            model: entry?.model,
            tokenKindName: entry?.tokenKindName
          })
        }}
      </div>
      <NFormItem :label="$t('page.aiplatform.priceEntry.repriceModal.unitPrice')">
        <NInput
          v-model:value="unitPriceText"
          :placeholder="$t('page.aiplatform.priceEntry.repriceModal.unitPricePlaceholder')"
          :input-props="{ inputmode: 'decimal' }"
          clearable
          class="w-full"
        />
      </NFormItem>
      <NFormItem :label="$t('page.aiplatform.priceEntry.repriceModal.currency')">
        <NInput v-model:value="currency" :placeholder="$t('page.aiplatform.priceEntry.repriceModal.currency')" class="w-160px" />
      </NFormItem>
      <NFormItem :label="$t('page.aiplatform.priceEntry.repriceModal.effectiveFrom')" required>
        <NDatePicker v-model:value="effectiveFromTs" type="datetime" class="w-full" />
      </NFormItem>
    </NForm>
  </NModal>
</template>
