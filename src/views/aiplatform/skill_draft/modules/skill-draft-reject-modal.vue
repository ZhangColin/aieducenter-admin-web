<script setup lang="ts">
/**
 * AI 平台草稿拒绝 modal（#71）——单弹窗双态（install/reprice 先例）：
 *
 * 表单态＝拒绝理由必填（终态留档拒绝须有据——前端 trim 拦截，空白 400 SKL_018 兜底走
 * onError 透传）；成功**不关窗切回执态**＝终态草稿详情留痕三件（审核操作者/落定时刻/
 * 拒绝理由——**唯一终态留痕呈现面**：在途清单不含终态、详情抽屉只开在途）。完成即关；
 * 失败留表单态可修正重试。写后（成功/失败）emit settled——父页无条件刷新在途清单
 * （不判码，也解他端审结 stale）。
 */
import { computed, ref, watch } from 'vue';
import { NAlert, NForm, NFormItem, NInput, NModal, NTag } from 'naive-ui';
import { fetchRejectAiplatformSkillDraft } from '@/service/api';
import { $t } from '@/locales';
import { formatDateTime } from '@/utils/common';

defineOptions({ name: 'SkillDraftRejectModal' });

const props = defineProps<{
  /** 拒绝目标（父页行/抽屉动作置入；null 时弹窗空态不渲染）。 */
  draft: Api.Aiplatform.SkillDraftSummary | null;
}>();

const emit = defineEmits<{
  /** 写后回调（成功/失败均刷新——不判码；ok＝成功，父页另关同目标抽屉）。 */
  settled: [draftId: string, ok: boolean];
}>();

const visible = defineModel<boolean>('visible', { default: false });

const reason = ref('');
const submitting = ref(false);
/** 终态回执（非 null 即回执态——终态草稿详情，留痕直读）。 */
const receipt = ref<Api.Aiplatform.SkillDraftDetail | null>(null);

watch(visible, val => {
  if (!val) return;
  reason.value = '';
  receipt.value = null;
});

/** 必填前端拦截：纯空白禁提交（SKL_018 服务端兜底不触达）。 */
const isValid = computed(() => reason.value.trim() !== '');

/** 回执视图态：正按钮=完成（自动关）；表单态：拒绝（成功后 return false 留弹窗切回执）。 */
async function handlePositiveClick() {
  if (receipt.value) return true;
  if (!props.draft || !isValid.value) return false;
  submitting.value = true;
  const { data, error } = await fetchRejectAiplatformSkillDraft(props.draft.id, { reason: reason.value.trim() });
  submitting.value = false;
  emit('settled', props.draft.id, !error);
  if (!error && data) {
    receipt.value = data;
    return false;
  }
  // 失败：onError 已统一弹透传 message（SKL_018 等）；返回 false 留表单态可修正重试
  return false;
}
</script>

<template>
  <NModal
    v-model:show="visible"
    :title="receipt ? $t('page.aiplatform.skillDraft.rejectModal.receiptTitle') : $t('page.aiplatform.skillDraft.rejectModal.title')"
    preset="dialog"
    :positive-text="receipt ? $t('page.aiplatform.skillDraft.rejectModal.done') : $t('page.aiplatform.skillDraft.rejectModal.confirm')"
    :negative-text="receipt ? undefined : $t('common.cancel')"
    :positive-button-props="{ disabled: !receipt && !isValid, loading: submitting }"
    @positive-click="handlePositiveClick"
  >
    <!-- 回执视图：终态详情留痕三件（唯一终态留痕呈现面） -->
    <template v-if="receipt">
      <NAlert type="warning" :show-icon="false" class="mb-12px">
        {{ $t('page.aiplatform.skillDraft.rejectModal.receiptNote') }}
      </NAlert>
      <div class="grid grid-cols-[90px_1fr] gap-x-12px gap-y-8px text-14px">
        <span class="text-right text-#999">{{ $t('page.aiplatform.skillDraft.name') }}</span>
        <span>{{ receipt.name }}</span>
        <span class="text-right text-#999">{{ $t('page.aiplatform.skillDraft.status') }}</span>
        <span>
          <NTag type="error" size="small">{{ receipt.statusName }}</NTag>
        </span>
        <span class="text-right text-#999">{{ $t('page.aiplatform.skillDraft.rejectModal.operator') }}</span>
        <span>
          {{ receipt.operatorName }}
          <span class="font-mono text-12px text-gray-400">{{ receipt.operatorId }}</span>
        </span>
        <span class="text-right text-#999">{{ $t('page.aiplatform.skillDraft.rejectModal.reviewedAt') }}</span>
        <span>{{ formatDateTime(receipt.reviewedAt) }}</span>
        <span class="text-right text-#999">{{ $t('page.aiplatform.skillDraft.rejectModal.rejectReason') }}</span>
        <span class="break-all">{{ receipt.rejectReason }}</span>
      </div>
    </template>
    <!-- 表单视图：理由必填 -->
    <NForm v-else label-placement="top" class="pt-12px">
      <NFormItem :label="$t('page.aiplatform.skillDraft.rejectModal.reason')" required>
        <NInput
          v-model:value="reason"
          type="textarea"
          :rows="3"
          :placeholder="$t('page.aiplatform.skillDraft.rejectModal.reasonPlaceholder')"
        />
      </NFormItem>
    </NForm>
  </NModal>
</template>
