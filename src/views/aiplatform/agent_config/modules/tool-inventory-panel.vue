<script setup lang="tsx">
/**
 * 工具面面板（#69，#65 技能域 T3）——NTabs 工具面签内容：按槽位三块小表。
 *
 * GET /agent-tools（进入即加载）：slotName 契约直读作块题；工具名 mono / kind tag（string
 * 裸值三态端侧映射：SKELETON=骨架 / ENHANCEMENT=增强 / HARNESS_BUILTIN=内建）/ 挂载态 /
 * 描述。开关仅 ENHANCEMENT 可操作（骨架/harness 内建结构性锁死——disabled 恒开；无
 * agent-tool:toggle 码 disabled）；受控 NSwitch（:value 非 v-model——值随回读走）即时
 * PUT /agent-tools/{toolName} 无确认弹窗：成功 toast＋清单回读，失败 onError 透传 toast、
 * 开关视觉态不动（受控值未变＝失败回滚）。
 */
import { onMounted, ref } from 'vue';
import { NSwitch, NTag } from 'naive-ui';
import type { DataTableColumn } from 'naive-ui';
import { AGENT_TOOL_TOGGLE_AUTH, agentToolKindLabel, agentToolKindTagColor } from '@/constants/aiplatform';
import { fetchGetAiplatformAgentTools, fetchToggleAiplatformAgentTool } from '@/service/api';
import { useAuth } from '@/hooks/business/auth';
import { $t } from '@/locales';

defineOptions({ name: 'ToolInventoryPanel' });

const { hasAuth } = useAuth();

const slots = ref<Api.Aiplatform.AgentToolSlot[]>([]);
const loading = ref(false);
/** 在途开关的工具注册名（行级 NSwitch loading 呈现）。 */
const togglingTool = ref('');

const columns: DataTableColumn<Api.Aiplatform.AgentTool>[] = [
  {
    key: 'name',
    title: $t('page.aiplatform.agentConfig.tool.name'),
    align: 'center',
    width: 180,
    render: row => <span class="font-mono">{row.name}</span>
  },
  {
    // kind 端侧三值映射（string 裸值无 *Name——constants 单点：label + 配色）
    key: 'kind',
    title: $t('page.aiplatform.agentConfig.tool.kind'),
    align: 'center',
    width: 90,
    render: row => (
      <NTag type={agentToolKindTagColor[row.kind]} size="small">
        {$t(agentToolKindLabel[row.kind])}
      </NTag>
    )
  },
  {
    // 挂载态：增强＝受控开关（值随回读走，失败视觉态不动）；骨架/内建＝disabled 恒开
    key: 'enabled',
    title: $t('page.aiplatform.agentConfig.tool.enabled'),
    align: 'center',
    width: 90,
    render: row =>
      row.kind === 'ENHANCEMENT' ? (
        <NSwitch
          value={row.enabled}
          disabled={!hasAuth(AGENT_TOOL_TOGGLE_AUTH)}
          loading={togglingTool.value === row.name}
          onUpdateValue={(val: boolean) => handleToggle(row, val)}
        />
      ) : (
        <NSwitch value={true} disabled />
      )
  },
  {
    key: 'description',
    title: $t('page.aiplatform.agentConfig.tool.description'),
    align: 'center',
    minWidth: 260,
    ellipsis: { tooltip: true },
    render: row => row.description
  }
];

async function load() {
  loading.value = true;
  const { data, error } = await fetchGetAiplatformAgentTools();
  if (!error) slots.value = data ?? [];
  loading.value = false;
}

/** 即时开关（无确认弹窗）：PUT → toast＋清单回读；失败透传 toast、受控值不动（失败回滚）。 */
async function handleToggle(row: Api.Aiplatform.AgentTool, val: boolean) {
  togglingTool.value = row.name;
  const { error } = await fetchToggleAiplatformAgentTool(row.name, { enabled: val });
  togglingTool.value = '';
  if (!error) {
    window.$message?.success(
      $t('page.aiplatform.agentConfig.tool.toggled', {
        tool: row.name,
        state: $t(val ? 'page.aiplatform.agentConfig.tool.stateOn' : 'page.aiplatform.agentConfig.tool.stateOff')
      })
    );
    load();
  }
}

onMounted(load);
</script>

<template>
  <div class="flex-col-stretch gap-12px">
    <div v-if="loading" class="flex-center min-h-200px">
      <NSpin />
    </div>
    <NCard v-for="slotItem in slots" :key="slotItem.slot" :title="slotItem.slotName" :bordered="false" size="small">
      <NDataTable :columns="columns" :data="slotItem.tools" size="small" />
    </NCard>
  </div>
</template>
