<script setup lang="ts">
/**
 * AI 平台沙箱详情抽屉（#60）——观测面全量字段：期望态/实态两列分示 + 置备状态（失败带原因）+
 * 卷用量/封存信息 + 中间件资源清单（连接串原文）+ 所属项目引用（软引用可空）。
 *
 * 四写按钮按态门控（availableWorkspaceActions 单点）+ hasAuth 逐写码；确认与请求收口在父页
 * （$dialog 单点，行下拉与抽屉共用）；写成功父页直接 applyDetail(动作后观测详情)——响应即新事实，免二次回读。
 */
import { computed, ref, watch } from 'vue';
import { NButton, NDrawer, NDrawerContent, NEmpty, NTag } from 'naive-ui';
import {
  containerStateTagColor,
  desiredStateTagColor,
  middlewareKindLabel,
  provisioningStatusTagColor,
  availableWorkspaceActions,
  workspaceWriteAuth
} from '@/constants/aiplatform';
import { fetchGetAiplatformWorkspace } from '@/service/api';
import { useAuth } from '@/hooks/business/auth';
import { $t } from '@/locales';
import { formatDateTime, formatFileSize } from '@/utils/common';

defineOptions({ name: 'WorkspaceDetailDrawer' });

const props = defineProps<{
  workspaceId: string;
}>();

const emit = defineEmits<{
  /** 请求四写之一（$dialog 确认 + 请求在父页单点收口；containerName 供确认框对账锚点）。 */
  action: [action: Api.Aiplatform.WorkspaceAction, workspaceId: string, containerName: string];
}>();

const visible = defineModel<boolean>('visible', { default: false });

const { hasAuth } = useAuth();

const detail = ref<Api.Aiplatform.WorkspaceDetail | null>(null);
const loading = ref(false);

async function loadDetail() {
  loading.value = true;
  const { data, error } = await fetchGetAiplatformWorkspace(props.workspaceId);
  loading.value = false;
  if (!error) detail.value = data;
}

watch(visible, val => {
  if (val) {
    detail.value = null;
    loadDetail();
  }
});

/** 四写按态门控（单点 helper）∩ 逐写 hasAuth——不可达/无权限不出现。 */
const availableActions = computed(() => {
  const d = detail.value;
  if (!d) return [];
  return availableWorkspaceActions(d).filter(action => hasAuth(workspaceWriteAuth[action]));
});

const resourceRows = computed(() =>
  (detail.value?.resources ?? []).map(r => ({
    kind: middlewareKindLabel[r.kind],
    containerName: r.containerName,
    internalUrl: r.internalUrl
  }))
);

defineExpose({
  reload: loadDetail,
  /** 写成功直填（四写响应＝动作后的观测详情，免二次回读）。 */
  applyDetail: (next: Api.Aiplatform.WorkspaceDetail) => {
    detail.value = next;
  }
});
</script>

<template>
  <NDrawer v-model:show="visible" :width="720">
    <NDrawerContent :title="$t('page.aiplatform.workspace.detailTitle')" closable>
      <div v-if="detail" class="flex-col-stretch gap-16px">
        <!-- 操作行：按态 + hasAuth 门控（唤醒恒在——封存走深度唤醒、漂移走幂等重建；重活三写拒置备中/封存态） -->
        <div class="action-row flex flex-wrap gap-8px">
          <NButton
            v-for="action in availableActions"
            :key="action"
            :type="action === 'seal' ? 'warning' : action === 'rebuild' ? 'error' : 'primary'"
            :ghost="action === 'hibernate' || action === 'seal'"
            size="small"
            @click="emit('action', action, detail.workspaceId, detail.containerName)"
          >
            {{ $t(`page.aiplatform.workspace.action.${action}`) }}
          </NButton>
        </div>

        <!-- 基本信息（观测面全量字段） -->
        <div class="grid grid-cols-[110px_1fr] gap-x-16px gap-y-10px text-14px">
          <span class="text-right text-#999">{{ $t('page.aiplatform.workspace.workspaceId') }}</span>
          <span class="font-mono">{{ detail.workspaceId }}</span>
          <span class="text-right text-#999">{{ $t('page.aiplatform.workspace.containerName') }}</span>
          <span class="font-mono">{{ detail.containerName }}</span>
          <span class="text-right text-#999">{{ $t('page.aiplatform.workspace.networkName') }}</span>
          <span class="font-mono">{{ detail.networkName }}</span>
          <span class="text-right text-#999">{{ $t('page.aiplatform.workspace.kind') }}</span>
          <span>{{ detail.kindName }}</span>
          <span class="text-right text-#999">{{ $t('page.aiplatform.workspace.status') }}</span>
          <span>
            <NTag :type="provisioningStatusTagColor[detail.status]" size="small">{{ detail.statusName }}</NTag>
          </span>
          <template v-if="detail.provisionError">
            <span class="text-right text-#999">{{ $t('page.aiplatform.workspace.provisionError') }}</span>
            <span>{{ detail.provisionError }}</span>
          </template>
          <span class="text-right text-#999">{{ $t('page.aiplatform.workspace.desiredState') }}</span>
          <span>
            <NTag :type="desiredStateTagColor[detail.desiredState]" size="small">{{ detail.desiredStateName }}</NTag>
          </span>
          <span class="text-right text-#999">{{ $t('page.aiplatform.workspace.containerState') }}</span>
          <span>
            <NTag :type="containerStateTagColor[detail.containerState]" size="small">
              {{ detail.containerStateName }}
            </NTag>
          </span>
          <span class="text-right text-#999">{{ $t('page.aiplatform.workspace.lastTouchAt') }}</span>
          <span>{{ formatDateTime(detail.lastTouchAt) }}</span>
          <span class="text-right text-#999">{{ $t('page.aiplatform.workspace.volumeSize') }}</span>
          <span>{{ formatFileSize(detail.volumeSizeBytes) }}</span>
          <template v-if="detail.sealedAt">
            <span class="text-right text-#999">{{ $t('page.aiplatform.workspace.sealedAt') }}</span>
            <span>{{ formatDateTime(detail.sealedAt) }}</span>
            <span class="text-right text-#999">{{ $t('page.aiplatform.workspace.archivePath') }}</span>
            <span class="break-all font-mono">{{ detail.archivePath }}</span>
            <span class="text-right text-#999">{{ $t('page.aiplatform.workspace.archiveSize') }}</span>
            <span>{{ formatFileSize(detail.archiveSizeBytes) }}</span>
          </template>
          <span class="text-right text-#999">{{ $t('page.aiplatform.workspace.createdAt') }}</span>
          <span>{{ formatDateTime(detail.createdAt) }}</span>
          <span class="text-right text-#999">{{ $t('page.aiplatform.workspace.updatedAt') }}</span>
          <span>{{ formatDateTime(detail.updatedAt) }}</span>
        </div>

        <!-- 所属项目引用（软引用可空——工作区先于项目存在） -->
        <div>
          <div class="mb-8px font-600">{{ $t('page.aiplatform.workspace.drawer.project') }}</div>
          <template v-if="detail.project">
            <div class="grid grid-cols-[110px_1fr] gap-x-16px gap-y-10px text-14px">
              <span class="text-right text-#999">{{ $t('page.aiplatform.workspace.drawer.projectId') }}</span>
              <span class="font-mono">{{ detail.project.projectId }}</span>
              <span class="text-right text-#999">{{ $t('page.aiplatform.workspace.drawer.projectName') }}</span>
              <span>{{ detail.project.name }}</span>
              <span class="text-right text-#999">{{ $t('page.aiplatform.workspace.drawer.projectArchived') }}</span>
              <span>
                {{ detail.project.archived ? $t('page.aiplatform.workspace.drawer.projectArchivedYes') : $t('page.aiplatform.workspace.drawer.projectArchivedNo') }}
              </span>
            </div>
          </template>
          <NEmpty v-else :description="$t('page.aiplatform.workspace.drawer.noProject')" size="small" />
        </div>

        <!-- 中间件资源清单（连接串原文，容器内回环形态——排障用） -->
        <div>
          <div class="mb-8px font-600">{{ $t('page.aiplatform.workspace.drawer.resources') }}</div>
          <NEmpty v-if="resourceRows.length === 0" :description="$t('page.aiplatform.workspace.drawer.resourcesEmpty')" size="small" />
          <div v-else class="flex-col-stretch gap-8px">
            <div v-for="r in resourceRows" :key="r.containerName" class="grid grid-cols-[90px_1fr] gap-x-12px text-13px">
              <NTag size="small">{{ r.kind }}</NTag>
              <div class="flex flex-col">
                <span class="font-mono">{{ r.containerName }}</span>
                <span class="break-all font-mono text-#999">{{ r.internalUrl }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </NDrawerContent>
  </NDrawer>
</template>
