<script setup lang="ts">
/**
 * AI 平台素材详情抽屉（#63）——治理读内容面：元数据（类别/来源项目引用/标题/状态/首沉淀时间/
 * 最近管理动作操作者）+ 素材全文 content（块按 seq 空行拼接——pre 原样呈现，同项目 PRD pane 形）。
 *
 * 三写按钮按状态门控（停用⇄启用可逆切换 + 删除恒在）+ hasAuth 逐写码；确认与请求收口在父页
 * （$dialog 单点，行按钮与抽屉共用）。写回执是 summary（无 content）——父页成功后调 reload
 * 二次回读详情（区别于沙箱域回执直填）。
 */
import { computed, ref, watch } from 'vue';
import { NButton, NDrawer, NDrawerContent, NSpin, NTag } from 'naive-ui';
import { materialStatusTagColor, materialWriteAuth } from '@/constants/aiplatform';
import { fetchGetAiplatformMaterial } from '@/service/api';
import { useAuth } from '@/hooks/business/auth';
import { $t } from '@/locales';
import { formatDateTime } from '@/utils/common';

defineOptions({ name: 'MaterialDetailDrawer' });

const props = defineProps<{
  materialId: string;
}>();

const emit = defineEmits<{
  /** 请求三写之一（$dialog 确认 + 请求在父页单点收口；title 供确认框对账锚点）。 */
  action: [action: Api.Aiplatform.MaterialAction, materialId: string, title: string];
}>();

const visible = defineModel<boolean>('visible', { default: false });

const { hasAuth } = useAuth();

const detail = ref<Api.Aiplatform.MaterialDetail | null>(null);
const loading = ref(false);

async function loadDetail() {
  loading.value = true;
  const { data, error } = await fetchGetAiplatformMaterial(props.materialId);
  loading.value = false;
  if (!error) detail.value = data;
}

watch(visible, val => {
  if (val) {
    detail.value = null;
    loadDetail();
  }
});

/** 停用⇄启用按状态切换（启用态给停用、停用态给启用）∩ 逐写 hasAuth；删除单独判码恒在。 */
const canDisable = computed(() => detail.value?.status === 1 && hasAuth(materialWriteAuth.disable));
const canEnable = computed(() => detail.value?.status === 2 && hasAuth(materialWriteAuth.enable));
const canDelete = computed(() => detail.value !== null && hasAuth(materialWriteAuth.delete));

defineExpose({
  /** 写成功后二次回读（回执是 summary 无 content，详情须重取）。 */
  reload: loadDetail
});
</script>

<template>
  <NDrawer v-model:show="visible" :width="720">
    <NDrawerContent :title="$t('page.aiplatform.material.detailTitle')" closable>
      <div v-if="loading" class="flex-center min-h-300px">
        <NSpin />
      </div>
      <div v-else-if="detail" class="flex-col-stretch gap-16px">
        <!-- 操作行：按状态门控（停用⇄启用可逆切换）+ hasAuth 逐写码 -->
        <div class="action-row flex flex-wrap gap-8px">
          <NButton v-if="canDisable" type="warning" ghost size="small" @click="emit('action', 'disable', detail.id, detail.title)">
            {{ $t('page.aiplatform.material.action.disable') }}
          </NButton>
          <NButton v-if="canEnable" type="primary" ghost size="small" @click="emit('action', 'enable', detail.id, detail.title)">
            {{ $t('page.aiplatform.material.action.enable') }}
          </NButton>
          <NButton v-if="canDelete" type="error" ghost size="small" @click="emit('action', 'delete', detail.id, detail.title)">
            {{ $t('page.aiplatform.material.action.delete') }}
          </NButton>
        </div>

        <!-- 元数据（治理面全量字段） -->
        <div class="grid grid-cols-[110px_1fr] gap-x-16px gap-y-10px text-14px">
          <span class="text-right text-#999">{{ $t('page.aiplatform.material.id') }}</span>
          <span class="font-mono">{{ detail.id }}</span>
          <span class="text-right text-#999">{{ $t('page.aiplatform.material.kind') }}</span>
          <span>{{ detail.kind }}</span>
          <span class="text-right text-#999">{{ $t('page.aiplatform.material.materialTitle') }}</span>
          <span>{{ detail.title }}</span>
          <span class="text-right text-#999">{{ $t('page.aiplatform.material.projectId') }}</span>
          <span class="font-mono">{{ detail.projectId }}</span>
          <span class="text-right text-#999">{{ $t('page.aiplatform.material.projectName') }}</span>
          <span>{{ detail.projectName }}</span>
          <span class="text-right text-#999">{{ $t('page.aiplatform.material.status') }}</span>
          <span>
            <NTag :type="materialStatusTagColor[detail.status]" size="small">{{ detail.statusName }}</NTag>
          </span>
          <span class="text-right text-#999">{{ $t('page.aiplatform.material.sunkAt') }}</span>
          <span>{{ formatDateTime(detail.sunkAt) }}</span>
          <span class="text-right text-#999">{{ $t('page.aiplatform.material.operator') }}</span>
          <span v-if="detail.operatorName" class="flex flex-col">
            <span>{{ detail.operatorName }}</span>
            <span class="font-mono text-12px text-gray-400">{{ detail.operatorId }}</span>
          </span>
          <span v-else>-</span>
        </div>

        <!-- 素材全文（块按 seq 空行拼接——段落级重组，内容无损） -->
        <div>
          <div class="mb-8px font-600">{{ $t('page.aiplatform.material.drawer.content') }}</div>
          <pre class="max-h-60vh overflow-auto whitespace-pre-wrap rounded-8px bg-#f5f5f5 p-12px text-13px leading-6">{{ detail.content }}</pre>
        </div>
      </div>
    </NDrawerContent>
  </NDrawer>
</template>
