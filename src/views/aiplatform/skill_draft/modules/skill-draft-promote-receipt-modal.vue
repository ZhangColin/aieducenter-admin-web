<script setup lang="ts">
/**
 * AI 平台草稿晋升回执 modal（#71）——POST /skills/drafts/{id}/promote 的回执态呈现
 * （update-receipt-modal 先例：$dialog 确认与请求收口在父页，本弹窗纯回执态）：
 * 新技能库行（id mono——新技能柄）＋来源/版本（自产行＝self）＋状态 tag。
 * 409 SKL_016 撞名 / 409 SKL_017 已审结走 onError 透传 toast，不至此。
 */
import { NAlert, NModal, NTag } from 'naive-ui';
import { skillStatusTagColor } from '@/constants/aiplatform';
import { $t } from '@/locales';

defineOptions({ name: 'SkillDraftPromoteReceiptModal' });

defineProps<{
  /** 晋升回执（父页 $dialog 确认→请求成功后置入；null 时弹窗空态不渲染）。 */
  receipt: Api.Aiplatform.SkillSummary | null;
}>();

const visible = defineModel<boolean>('visible', { default: false });
</script>

<template>
  <NModal
    v-model:show="visible"
    :title="$t('page.aiplatform.skillDraft.promoteReceipt.title')"
    preset="dialog"
    :positive-text="$t('page.aiplatform.skillDraft.promoteReceipt.done')"
  >
    <div v-if="receipt" class="flex-col-stretch gap-12px pt-8px">
      <NAlert type="success" :show-icon="false">
        {{ $t('page.aiplatform.skillDraft.promoteReceipt.note') }}
      </NAlert>

      <!-- 新技能库行（回执＝SkillSummary；id mono＝新技能柄） -->
      <div class="grid grid-cols-[90px_1fr] gap-x-12px gap-y-8px text-14px">
        <span class="text-right text-#999">{{ $t('page.aiplatform.skill.name') }}</span>
        <span>{{ receipt.name }}</span>
        <span class="text-right text-#999">{{ $t('page.aiplatform.skill.id') }}</span>
        <span class="break-all font-mono">{{ receipt.id }}</span>
        <span class="text-right text-#999">{{ $t('page.aiplatform.skill.source') }}</span>
        <span>{{ receipt.sourceName }}</span>
        <span class="text-right text-#999">{{ $t('page.aiplatform.skill.version') }}</span>
        <span class="break-all font-mono">{{ receipt.version ?? '-' }}</span>
        <span class="text-right text-#999">{{ $t('page.aiplatform.skill.status') }}</span>
        <span>
          <NTag :type="skillStatusTagColor[receipt.status]" size="small">{{ receipt.statusName }}</NTag>
        </span>
      </div>
    </div>
  </NModal>
</template>
