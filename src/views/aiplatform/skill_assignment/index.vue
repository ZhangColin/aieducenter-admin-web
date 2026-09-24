<script setup lang="ts">
/**
 * AI 平台指派配置页（#68，#65 技能域 T2）。
 *
 * 三职能槽位（main=主智能体 / executor=run 执行体 / subagent=子智能体——响应无 slotName，
 * label 端侧映射）NTabs 三签；每签一张可勾选技能表（面板自管：进入/切签即加载对应
 * GET /skills/assignments/{slot} 预填、每签直接 PUT 整包保存）。选项集＝技能清单**安装行**
 * （builtin 不列——builtin 指派 400 SKL_011，门控可达即排除）；清单页面级拉一次共享三签
 * （指派不改技能行，保存后无需重拉清单）。装配生效语义＝动态查库：变更后智能体下一轮自然生效。
 */
import { onMounted, ref } from 'vue';
import { SKILL_SLOTS, skillSlotLabel } from '@/constants/aiplatform';
import { fetchGetAiplatformSkillList } from '@/service/api';
import { $t } from '@/locales';
import SlotAssignmentPanel from './modules/slot-assignment-panel.vue';

defineOptions({ name: 'AiplatformSkillAssignment' });

/** 选项集＝技能清单安装行（source=2；清单服务端排序内置在前，过滤后安装行序保持）。 */
const installedSkills = ref<Api.Aiplatform.SkillSummary[]>([]);
const optionsLoading = ref(false);

async function loadOptions() {
  optionsLoading.value = true;
  const { data, error } = await fetchGetAiplatformSkillList();
  if (!error) {
    installedSkills.value = (data ?? []).filter(row => row.source === 2);
  }
  optionsLoading.value = false;
}

onMounted(loadOptions);
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <NCard
      :title="$t('page.aiplatform.skillAssignment.title')"
      :bordered="false"
      size="small"
      class="card-wrapper"
    >
      <!-- display-directive 缺省 if：切签卸载重挂＝进入/切签即加载对应槽位 GET（预填勾选） -->
      <NTabs type="line">
        <NTabPane v-for="slot in SKILL_SLOTS" :key="slot" :name="slot" :tab="$t(skillSlotLabel[slot])">
          <SlotAssignmentPanel :skill-slot="slot" :skills="installedSkills" :options-loading="optionsLoading" />
        </NTabPane>
      </NTabs>
    </NCard>
  </div>
</template>
