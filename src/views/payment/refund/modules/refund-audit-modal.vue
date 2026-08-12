<script setup lang="ts">
/**
 * 退款审核弹窗（T4 / #48）。
 *
 * 抽屉头部「审核」按钮打开独立弹窗（issue #48 验收：审核走独立弹窗，approve/reject radio + reason，
 * reject 必填一次提交）。前端只发**决策意图**（agreed + remark）——审核人身份由 admin 服务端从
 * RequestContext 注入、前端不可伪造（见 payment-admin spec「操作者身份透传」）。
 *
 * - approve（agreed=true）：remark 选填；
 * - reject（agreed=false）：remark **必填**——经 NForm 条件 required 规则校验，空则提交被拦
 *   （验收「reject 必填 reason、空则禁提交」），并配 ≤512 长度上限（对齐后端 RefundAuditCommand）；
 * - 成功后 emit `success` 携带最新详情（状态已推进），抽屉/列表据此刷新。
 */
import { computed, ref, watch } from 'vue';
import { fetchAuditRefund } from '@/service/api';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({ name: 'RefundAuditModal' });

const props = defineProps<{
  refundOrderNo: string;
}>();

const emit = defineEmits<{
  success: [detail: Api.Payment.RefundOrderDetail];
}>();

const visible = defineModel<boolean>('visible', { default: false });

const { formRef, validate, restoreValidation } = useNaiveForm();

type Decision = 'approve' | 'reject';

const decision = ref<Decision>('approve');
const remark = ref('');
const submitting = ref(false);

/** reject 时 remark 必填；approve 选填——required 跟随 decision 动态变化 */
const remarkRules = computed<App.Global.FormRule[]>(() => [
  {
    required: decision.value === 'reject',
    message: $t('page.payment.refund.auditReasonRequired'),
    trigger: ['input', 'blur']
  },
  { max: 512, message: $t('page.payment.refund.auditReasonMax'), trigger: 'input' }
]);

function reset() {
  decision.value = 'approve';
  remark.value = '';
  submitting.value = false;
  restoreValidation();
}

async function handleSubmit() {
  if (!props.refundOrderNo) return;
  await validate();
  submitting.value = true;
  const trimmed = remark.value.trim();
  const { data, error } = await fetchAuditRefund(props.refundOrderNo, {
    agreed: decision.value === 'approve',
    // 空串不发（approve 选填、后端按 null/空等价处理；省带宽）
    remark: trimmed ? trimmed : undefined
  });
  submitting.value = false;
  if (!error && data) {
    window.$message?.success?.($t('page.payment.refund.auditSuccess'));
    emit('success', data);
    visible.value = false;
  }
}

watch(visible, val => {
  if (val) reset();
});
</script>

<template>
  <NModal
    v-model:show="visible"
    preset="card"
    :title="$t('page.payment.refund.auditTitle')"
    class="w-520px"
    :mask-closable="false"
    :close-on-esc="false"
  >
    <NForm ref="formRef" :model="{ remark }" label-placement="top">
      <NFormItem :label="$t('page.payment.refund.auditDecision')">
        <NRadioGroup v-model:value="decision">
          <NSpace :size="16">
            <NRadio value="approve">{{ $t('page.payment.refund.auditApprove') }}</NRadio>
            <NRadio value="reject">{{ $t('page.payment.refund.auditReject') }}</NRadio>
          </NSpace>
        </NRadioGroup>
      </NFormItem>
      <NFormItem :label="$t('page.payment.refund.auditReason')" path="remark" :rule="remarkRules">
        <NInput
          v-model:value="remark"
          type="textarea"
          :rows="3"
          :maxlength="512"
          show-count
          :placeholder="$t('page.payment.refund.auditReasonPlaceholder')"
        />
      </NFormItem>
    </NForm>
    <template #footer>
      <NSpace justify="end" :size="16">
        <NButton @click="visible = false">{{ $t('common.cancel') }}</NButton>
        <NButton type="primary" :loading="submitting" @click="handleSubmit">
          {{ $t('common.confirm') }}
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped></style>
