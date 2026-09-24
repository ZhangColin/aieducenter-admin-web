<script setup lang="ts">
/**
 * AI 平台技能更新回执 modal（#67）——显式更新（POST /skills/update）的回执态呈现：
 * from→to（from==to 显式「远端未前进，未落痕」——幂等无痕）/ removedSkillNames（空显「无移除」）/
 * 终态行集 skills[]（更新后该来源包全部条目——同名行原地翻新、新增行插入、消失行移除）。
 * 确认与请求收口在父页（$dialog 单点）；409 SKL_013 走 onError 透传 toast，不至此。
 */
import { NAlert, NModal, NTag } from 'naive-ui';
import { skillStatusTagColor } from '@/constants/aiplatform';
import { $t } from '@/locales';

defineOptions({ name: 'SkillUpdateReceiptModal' });

defineProps<{
  /** 更新回执（父页 $dialog 确认→请求成功后置入；null 时弹窗空态不渲染）。 */
  receipt: Api.Aiplatform.SkillUpdateReceipt | null;
}>();

const visible = defineModel<boolean>('visible', { default: false });
</script>

<template>
  <NModal
    v-model:show="visible"
    :title="$t('page.aiplatform.skill.updateModal.title')"
    preset="dialog"
    :positive-text="$t('page.aiplatform.skill.updateModal.done')"
  >
    <div v-if="receipt" class="flex-col-stretch gap-12px pt-8px">
      <!-- 幂等分型：from==to＝远端未前进（未落痕未写行）；否则＝快照翻新落痕 -->
      <NAlert :type="receipt.fromVersion === receipt.toVersion ? 'info' : 'success'" :show-icon="false">
        {{
          receipt.fromVersion === receipt.toVersion
            ? $t('page.aiplatform.skill.updateModal.noOp')
            : $t('page.aiplatform.skill.updateModal.updatedNote')
        }}
      </NAlert>

      <!-- 来源包 + from→to + 操作者 -->
      <div class="grid grid-cols-[90px_1fr] gap-x-12px gap-y-8px text-14px">
        <span class="text-right text-#999">{{ $t('page.aiplatform.skill.sourcePackage') }}</span>
        <span class="break-all font-mono text-13px">{{ receipt.sourcePackage }}</span>
        <span class="text-right text-#999">{{ $t('page.aiplatform.skill.version') }}</span>
        <span class="break-all font-mono text-13px">{{ receipt.fromVersion }} → {{ receipt.toVersion }}</span>
        <span class="text-right text-#999">{{ $t('page.aiplatform.skill.operator') }}</span>
        <span>{{ receipt.operatorName }}</span>
      </div>

      <!-- 移除名单：空显「无移除」 -->
      <div class="flex flex-wrap items-center gap-8px text-14px">
        <span class="text-#999">{{ $t('page.aiplatform.skill.updateModal.removed') }}</span>
        <template v-if="receipt.removedSkillNames.length">
          <NTag v-for="name in receipt.removedSkillNames" :key="name" type="error" size="small">{{ name }}</NTag>
        </template>
        <span v-else class="text-gray-400">{{ $t('page.aiplatform.skill.updateModal.removedEmpty') }}</span>
      </div>

      <!-- 终态行集（更新后该来源包全部条目） -->
      <div>
        <div class="mb-8px font-600">{{ $t('page.aiplatform.skill.updateModal.terminal') }}</div>
        <div class="flex-col-stretch gap-6px">
          <div v-for="row in receipt.skills" :key="row.id" class="flex items-center gap-8px rounded-4px border border-gray-200 px-12px py-6px dark:border-gray-700">
            <span class="font-500">{{ row.name }}</span>
            <span class="font-mono text-12px text-gray-400">{{ row.version }}</span>
            <NTag :type="skillStatusTagColor[row.status]" size="small" class="ml-auto">{{ row.statusName }}</NTag>
          </div>
        </div>
      </div>
    </div>
  </NModal>
</template>
