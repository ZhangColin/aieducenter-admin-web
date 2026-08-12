<script setup lang="ts">
/**
 * 订单操作记录筛选条（OperationLog）。
 *
 * 7 字段：targetType / targetNo / operation(单选) / operatorId / operatorSystem / result / createdAt 区间。
 *
 * ⚠️ `operation` 为**单选**：payment 的 OperationLogQuery.operation 是单个 OperationType（EQUAL），
 * issue 文案的「operation 多选」以 payment 实现契约为准收敛为单值（多值会静默丢过滤条件）。
 *
 * NCollapse 默认折叠——常驻钉住「目标单号 + 操作类型」（最常用），其余收入「更多筛选」展开。
 * （spec「露 keyword + status」——operation log 无单一 keyword，钉语义等价的目标单号 + 操作类型。）
 *
 * 单位换算（搜索组件内独占 UI 状态、提交时清洗）：
 * - 时间：UI 为 NDatePicker datetimerange（毫秒时间戳），提交 → ISO 本地串 `YYYY-MM-DDTHH:mm:ss`（后端 LocalDateTime）。
 * - operatorId：Long 雪花 id，用 NInput（文本）持有 → 提交字符串，后端绑 Long（防 JS number 精度丢失）。
 * - result：自由稳定 token（非闭合集合），走文本输入、原值透传。
 */
import { computed, ref } from 'vue';
import dayjs from 'dayjs';
import { operationTargetTypeOptions, operationTypeOptions } from '@/constants/payment';
import { $t } from '@/locales';

defineOptions({ name: 'PaymentOperationSearch' });

const emit = defineEmits<{
  (e: 'search', filter: Api.Payment.OperationLogFilter): void;
}>();

// 常驻筛选
const targetNo = ref('');
const operation = ref<Api.Payment.OperationType | null>(null);

// 更多筛选
const targetType = ref<Api.Payment.OperationTargetType | null>(null);
const operatorId = ref('');
const operatorSystem = ref('');
const result = ref('');
const createdAtRange = ref<[number, number] | null>(null);

/** NSelect 选项渲染时翻译（option.label 为 i18n key；语言切换可响应） */
const operationSelectOptions = computed(() => operationTypeOptions.map(o => ({ ...o, label: $t(o.label) })));
const targetTypeSelectOptions = computed(() =>
  operationTargetTypeOptions.map(o => ({ ...o, label: $t(o.label) }))
);

/** 时间戳 → 后端 LocalDateTime ISO 串（本地墙上时钟、无时区后缀） */
function tsToIso(ts: number | undefined): string | undefined {
  return ts == null ? undefined : dayjs(ts).format('YYYY-MM-DDTHH:mm:ss');
}

/** 清洗 UI 状态为提交载荷：去空、单位换算 */
function buildFilter(): Api.Payment.OperationLogFilter {
  return {
    ...(targetType.value ? { targetType: targetType.value } : {}),
    ...(targetNo.value.trim() ? { targetNo: targetNo.value.trim() } : {}),
    ...(operation.value ? { operation: operation.value } : {}),
    ...(operatorId.value.trim() ? { operatorId: operatorId.value.trim() } : {}),
    ...(operatorSystem.value.trim() ? { operatorSystem: operatorSystem.value.trim() } : {}),
    ...(result.value.trim() ? { result: result.value.trim() } : {}),
    ...(createdAtRange.value
      ? { createdAtFrom: tsToIso(createdAtRange.value[0]), createdAtTo: tsToIso(createdAtRange.value[1]) }
      : {})
  };
}

function search() {
  emit('search', buildFilter());
}

function reset() {
  targetNo.value = '';
  operation.value = null;
  targetType.value = null;
  operatorId.value = '';
  operatorSystem.value = '';
  result.value = '';
  createdAtRange.value = null;
  emit('search', buildFilter());
}
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper">
    <NForm label-placement="left" :label-width="110">
      <!-- 常驻筛选：目标单号 + 操作类型（单选）+ 操作 -->
      <NGrid responsive="screen" item-responsive>
        <NFormItemGi span="24 s:12 m:8" :label="$t('page.payment.operation.targetNo')" class="pr-24px">
          <NInput v-model:value="targetNo" :placeholder="$t('page.payment.operation.form.targetNo')" clearable />
        </NFormItemGi>
        <NFormItemGi span="24 s:12 m:8" :label="$t('page.payment.operation.operation')" class="pr-24px">
          <NSelect
            v-model:value="operation"
            :options="operationSelectOptions"
            :placeholder="$t('page.payment.operation.form.operation')"
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
        <NCollapseItem name="more" :title="$t('page.payment.operation.moreFilters')">
          <NGrid responsive="screen" item-responsive>
            <NFormItemGi span="24 s:12 m:8" :label="$t('page.payment.operation.targetType')" class="pr-24px">
              <NSelect
                v-model:value="targetType"
                :options="targetTypeSelectOptions"
                :placeholder="$t('page.payment.operation.form.targetType')"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:8" :label="$t('page.payment.operation.form.operatorId')" class="pr-24px">
              <NInput
                v-model:value="operatorId"
                :placeholder="$t('page.payment.operation.form.operatorId')"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:8" :label="$t('page.payment.operation.operatorSystem')" class="pr-24px">
              <NInput
                v-model:value="operatorSystem"
                :placeholder="$t('page.payment.operation.form.operatorSystem')"
                clearable
              />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:8" :label="$t('page.payment.operation.result')" class="pr-24px">
              <NInput v-model:value="result" :placeholder="$t('page.payment.operation.form.result')" clearable />
            </NFormItemGi>
            <NFormItemGi span="24 m:16" :label="$t('page.payment.operation.createdAt')" class="pr-24px">
              <NDatePicker
                v-model:value="createdAtRange"
                type="datetimerange"
                clearable
                class="w-full"
                :placeholder="$t('page.payment.operation.form.createdAt')"
              />
            </NFormItemGi>
          </NGrid>
        </NCollapseItem>
      </NCollapse>
    </NForm>
  </NCard>
</template>

<style scoped></style>
