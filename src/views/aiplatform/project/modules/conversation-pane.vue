<script setup lang="ts">
/**
 * 项目详情抽屉·对话史 pane（#58）——全量同序（id 升序=对话序，服务端定死不开放分页）。
 *
 * 渲染契约四字段 text/kind/answered/at：kind 用响应 kindName 直读（ADR-0009）+ 语义色 tag；
 * answered 仅问答卡（kind=3）有语义——true=已答 / false=待答（挂起）双态 tag，其余 kind 恒 false 不渲染；
 * question/closing/attachments 为事件载荷原样——REQ-20（admin#75）swagger 空对象未文档化，**跳过不渲染**
 * （question/closing 条目 text=null，正文区渲染 '-' 占位）。
 */
import { onMounted, ref } from 'vue';
import { NTag } from 'naive-ui';
import { fetchGetAiplatformProjectConversation } from '@/service/api';
import { conversationKindTagColor } from '@/constants/aiplatform';
import { $t } from '@/locales';
import { formatDateTime } from '@/utils/common';

defineOptions({ name: 'ProjectConversationPane' });

const props = defineProps<{
  projectId: string;
}>();

const entries = ref<Api.Aiplatform.ConversationEntry[]>([]);
const loading = ref(false);

async function load() {
  loading.value = true;
  const { data, error } = await fetchGetAiplatformProjectConversation(props.projectId);
  loading.value = false;
  if (!error) entries.value = data;
}

onMounted(load);
</script>

<template>
  <div v-if="loading" class="flex-center min-h-300px">
    <NSpin />
  </div>
  <NEmpty v-else-if="!entries.length" :description="$t('page.aiplatform.project.drawer.emptyConversation')" />
  <div v-else class="flex-col-stretch gap-12px">
    <div v-for="entry in entries" :key="entry.id" class="conversation-entry rounded-8px border border-#e5e5e5 p-12px dark:border-#2a2a2a">
      <div class="mb-6px flex flex-wrap items-center gap-8px">
        <NTag :type="conversationKindTagColor[entry.kind]" size="small">{{ entry.kindName }}</NTag>
        <!-- 问答卡作答双态：已答 / 待答（挂起）——仅 kind=3 渲染 -->
        <NTag v-if="entry.kind === 3" :type="entry.answered ? 'success' : 'warning'" size="small" :bordered="false">
          {{ entry.answered ? $t('page.aiplatform.project.drawer.answered') : $t('page.aiplatform.project.drawer.pendingAnswer') }}
        </NTag>
        <span v-if="entry.runId" class="font-mono text-12px text-#999">{{ entry.runId }}</span>
        <span class="ml-auto text-12px text-#999">{{ formatDateTime(entry.at) }}</span>
      </div>
      <!-- question/closing 条目 text=null（载荷跳过）——'-' 占位照订单域 null 先例 -->
      <pre class="m-0 whitespace-pre-wrap text-13px leading-6">{{ entry.text ?? '-' }}</pre>
    </div>
  </div>
</template>
