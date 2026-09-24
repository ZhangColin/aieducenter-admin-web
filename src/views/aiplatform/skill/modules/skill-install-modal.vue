<script setup lang="ts">
/**
 * AI 平台技能安装 modal（#67）——单步表单：repoUrl（git 地址）＋ excludeDirs（目录段 tag 手输——
 * 契约无 ref/tag 字段，版本恒＝装时 HEAD commit，排除段命中仓库相对路径任一段即不入库）。
 *
 * 成功**不关窗切回执态**（reprice-modal 先例）：「本次装入 N 项」表（name/version/sourcePackage）
 * ＋ 完成即关＋父页刷新（success 钩子在回执落地时即发）；失败（SKL_002~007 安装失败族）留窗，
 * onError 统一透传 message，可修正重试。clone 走网络可能慢——按钮 loading 诚实。
 */
import { computed, ref, watch } from 'vue';
import { NAlert, NForm, NFormItem, NInput, NModal, NSelect } from 'naive-ui';
import { fetchInstallAiplatformSkill } from '@/service/api';
import { $t } from '@/locales';

defineOptions({ name: 'SkillInstallModal' });

const emit = defineEmits<{
  /** 安装成功（父页刷清单；回执呈现留本弹窗）。 */
  success: [];
}>();

const visible = defineModel<boolean>('visible', { default: false });

const repoUrl = ref('');
const excludeDirs = ref<string[]>([]);
const submitting = ref(false);
/** 成功回执（非 null 即回执态——本次装入条目）。 */
const receipt = ref<Api.Aiplatform.SkillSummary[] | null>(null);

watch(visible, val => {
  if (!val) return;
  repoUrl.value = '';
  excludeDirs.value = [];
  receipt.value = null;
});

const isValid = computed(() => repoUrl.value.trim() !== '');

/** 回执视图态：正按钮=完成（自动关）；表单态：安装（成功后 return false 留弹窗切回执）。 */
async function handlePositiveClick() {
  if (receipt.value) return true;
  if (!isValid.value) return false;
  const command: Api.Aiplatform.InstallSkillCommand = { repoUrl: repoUrl.value.trim() };
  if (excludeDirs.value.length) {
    command.excludeDirs = excludeDirs.value;
  }
  submitting.value = true;
  const { data, error } = await fetchInstallAiplatformSkill(command);
  submitting.value = false;
  if (!error && data) {
    receipt.value = data;
    emit('success');
    return false;
  }
  // 失败：onError 已统一弹透传 message（SKL_002~007 等）；返回 false 阻止自动关（可修正重试）
  return false;
}
</script>

<template>
  <NModal
    v-model:show="visible"
    :title="receipt ? $t('page.aiplatform.skill.installModal.receiptTitle') : $t('page.aiplatform.skill.installModal.title')"
    preset="dialog"
    :positive-text="receipt ? $t('page.aiplatform.skill.installModal.done') : $t('page.aiplatform.skill.installModal.confirm')"
    :negative-text="receipt ? undefined : $t('common.cancel')"
    :positive-button-props="{ disabled: !receipt && !isValid, loading: submitting }"
    @positive-click="handlePositiveClick"
  >
    <!-- 回执视图：本次装入条目（name/version/sourcePackage） -->
    <template v-if="receipt">
      <NAlert type="success" :show-icon="false" class="mb-12px">
        {{ $t('page.aiplatform.skill.installModal.receiptNote', { count: receipt.length }) }}
      </NAlert>
      <div class="flex-col-stretch gap-8px">
        <div
          v-for="row in receipt"
          :key="row.id"
          class="rounded-4px border border-gray-200 px-12px py-8px dark:border-gray-700"
        >
          <div class="flex items-center gap-8px">
            <span class="font-500">{{ row.name }}</span>
            <span class="font-mono text-12px text-gray-400">{{ row.version }}</span>
          </div>
          <div class="mt-2px break-all font-mono text-12px text-gray-400">{{ row.sourcePackage }}</div>
        </div>
      </div>
    </template>
    <!-- 表单视图 -->
    <NForm v-else label-placement="top" class="pt-12px">
      <div class="mb-12px text-13px text-gray-500">{{ $t('page.aiplatform.skill.installModal.tip') }}</div>
      <NFormItem :label="$t('page.aiplatform.skill.installModal.repoUrl')" required>
        <NInput
          v-model:value="repoUrl"
          :placeholder="$t('page.aiplatform.skill.installModal.repoUrlPlaceholder')"
          clearable
          class="w-full"
        />
      </NFormItem>
      <NFormItem :label="$t('page.aiplatform.skill.installModal.excludeDirs')">
        <!-- tag 模式手输目录段：无预置 options，输入回车即成段 -->
        <NSelect
          v-model:value="excludeDirs"
          multiple
          tag
          filterable
          clearable
          :options="[]"
          :placeholder="$t('page.aiplatform.skill.installModal.excludeDirsPlaceholder')"
          class="w-full"
        />
      </NFormItem>
    </NForm>
  </NModal>
</template>
