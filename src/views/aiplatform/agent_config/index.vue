<script setup lang="ts">
/**
 * AI 平台智能体配置页（#69，#65 技能域 T3）。
 *
 * NTabs 三签：main / executor 两座智能体（各含编辑卡＋留痕时间线卡，面板自管：进入/切签
 * 即加载对应 GET）＋工具面签（三槽位工具清单＋两增强工具即时开关）。覆盖标记「已覆盖/默认」
 * ＋默认值灰字预览；清空字段提交即回落默认（PUT 全量终态语义）。保存四字段全量回传——
 * 两工具 flag 以 GET 回显原值透传（契约「缺省＝true 开」，防静默误开）；工具开关独走
 * tool 端点（agent-tool:toggle 码），config 表单不动两 flag。
 */
import { AGENT_KEYS, agentKeyLabel } from '@/constants/aiplatform';
import { $t } from '@/locales';
import AgentConfigPanel from './modules/agent-config-panel.vue';
import ToolInventoryPanel from './modules/tool-inventory-panel.vue';

defineOptions({ name: 'AiplatformAgentConfig' });
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <NCard :title="$t('page.aiplatform.agentConfig.title')" :bordered="false" size="small" class="card-wrapper">
      <!-- display-directive 缺省 if：切签卸载重挂＝进入/切签即加载对应座读面（T2 指派页同款） -->
      <NTabs type="line">
        <NTabPane v-for="key in AGENT_KEYS" :key="key" :name="key" :tab="$t(agentKeyLabel[key])">
          <AgentConfigPanel :agent-key="key" />
        </NTabPane>
        <NTabPane name="tools" :tab="$t('page.aiplatform.agentConfig.tab.tools')">
          <ToolInventoryPanel />
        </NTabPane>
      </NTabs>
    </NCard>
  </div>
</template>
