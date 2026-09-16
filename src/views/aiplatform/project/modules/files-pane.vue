<script setup lang="ts">
/**
 * 项目详情抽屉·交付文件 pane（#59）——文件树（按 path 折叠、行内显 size）+ 文本查看器 + 下载文件包。
 *
 * 契约（api-docs）：files 只列文件 [{path,size}]（目录由前端按路径段合成，服务端路径稳定排序）；
 * content 只收文本且限 1 MiB——只读策略全归 provider 裁决。#56 grilling 定案：不按业务码分支——
 * 机密/超限/非文本三类拒读**一态兜底**（统一「无法预览」+ 透传 message；onError toast 是全局
 * 兜底不抑止，本组件在查看器内锚定展示）。文件区挂项目不挂订单：未下单可浏览、归档照读。
 */
import { computed, h, onMounted, ref } from 'vue';
import { NButton, NEmpty } from 'naive-ui';
import type { TreeOption } from 'naive-ui';
import {
  fetchDownloadProjectFilesPackage,
  fetchGetAiplatformProjectFileContent,
  fetchGetAiplatformProjectFiles
} from '@/service/api';
import { useAuth } from '@/hooks/business/auth';
import { $t } from '@/locales';
import { formatFileSize, saveBlobFile } from '@/utils/common';

defineOptions({ name: 'ProjectFilesPane' });

const props = defineProps<{
  projectId: string;
}>();

/** 文件树节点：目录合成节点（无 path/size）与文件叶子（path = 工作区相对路径，content 请求原样回传）。 */
interface FileTreeNode extends TreeOption {
  key: string;
  label: string;
  isLeaf?: boolean;
  /** Long（字节）→ JSON string；仅文件叶子有 */
  size?: string;
  /** 完整工作区相对路径；仅文件叶子有 */
  path?: string;
  children?: FileTreeNode[];
}

const treeLoading = ref(false);

/** key → 节点平铺索引（选中回调只给 key，叶子判别 + 取 path 用）。 */
const nodeIndex = new Map<string, FileTreeNode>();

/** 目录 key 加前缀防与同名文件叶子 path 冲突；顺带单次递归铺平索引。 */
function buildTree(entries: Api.Aiplatform.FileEntry[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];
  const dirMap = new Map<string, FileTreeNode>();
  for (const file of entries) {
    const segments = file.path.split('/');
    const name = segments.pop() as string;
    let siblings = root;
    let currentPath = '';
    for (const segment of segments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      let dir = dirMap.get(currentPath);
      if (!dir) {
        dir = { key: `dir:${currentPath}`, label: segment, children: [] };
        dirMap.set(currentPath, dir);
        siblings.push(dir);
      }
      siblings = dir.children as FileTreeNode[];
    }
    siblings.push({ key: file.path, label: name, isLeaf: true, size: file.size, path: file.path });
  }
  nodeIndex.clear();
  const indexNodes = (node: FileTreeNode) => {
    nodeIndex.set(node.key, node);
    for (const child of node.children ?? []) indexNodes(child);
  };
  for (const node of root) indexNodes(node);
  return root;
}

const treeData = ref<FileTreeNode[]>([]);
/** 根级目录默认展开（v-else 树随数据后挂载，default-expanded 生效于挂载时）。 */
const defaultExpandedKeys = ref<string[]>([]);

async function loadTree() {
  treeLoading.value = true;
  const { data, error } = await fetchGetAiplatformProjectFiles(props.projectId);
  treeLoading.value = false;
  if (error) return;
  treeData.value = buildTree(data.files);
  defaultExpandedKeys.value = treeData.value.filter(node => !node.isLeaf).map(node => node.key);
  resetViewer();
}

/* ---------------- 查看器（点文本文件内嵌只读；拒读一态兜底） ---------------- */

const selectedKeys = ref<string[]>([]);
const contentLoading = ref(false);
const content = ref<Api.Aiplatform.FileContent | null>(null);
/** 拒读/读取失败 message——三类拒读同态展示（不按业务码分支），null = 非拒读态。 */
const previewUnavailableMsg = ref<string | null>(null);

function resetViewer() {
  selectedKeys.value = [];
  content.value = null;
  previewUnavailableMsg.value = null;
}

function handleSelect(keys: string[]) {
  selectedKeys.value = keys;
  const node = nodeIndex.get(keys[0] as string);
  if (!node?.isLeaf || !node.path) {
    // 目录/取消选中：回提示态（防旧内容/拒读态残留——目录不可看）
    content.value = null;
    previewUnavailableMsg.value = null;
    return;
  }
  loadFileContent(node.path);
}

async function loadFileContent(path: string) {
  contentLoading.value = true;
  content.value = null;
  previewUnavailableMsg.value = null;
  const { data, error } = await fetchGetAiplatformProjectFileContent(props.projectId, path);
  contentLoading.value = false;
  if (error) {
    // 透传 provider message（HTTP 非 2xx 时 error.response.data = ApiResponse）；网络层异常兜底 axios 通用串
    const respData = error.response?.data as { message?: string } | undefined;
    previewUnavailableMsg.value = respData?.message ?? error.message;
    return;
  }
  content.value = data;
}

/** 行内显 size（仅文件叶子；目录合成节点无 size）。TreeOption 索引签名下 size 为 unknown，收窄回树节点类型。 */
function renderSizeSuffix({ option }: { option: TreeOption }) {
  const { isLeaf, size } = option as FileTreeNode;
  return isLeaf && size ? h('span', { class: 'ml-8px text-12px text-#999' }, formatFileSize(size)) : null;
}

const selectedNode = computed(() => nodeIndex.get(selectedKeys.value[0] as string) ?? null);

/* ---------------- 下载文件包（tar.gz 二进制流，读码门控） ---------------- */

const { hasAuth } = useAuth();
const canDownload = computed(() => hasAuth('admin:aiplatform:project:read'));
const downloading = ref(false);

/** 文件包：tar.gz 无信封 blob；文件名以服务端 Content-Disposition 为准（provider 决定 -archive/-source 两态），缺失时端侧兜底。 */
async function handleDownload() {
  downloading.value = true;
  const { data, error, response } = await fetchDownloadProjectFilesPackage(props.projectId);
  downloading.value = false;
  if (error || !data) return;
  const disposition = String(response?.headers?.['content-disposition'] ?? '');
  const filename = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? `${props.projectId}-files.tar.gz`;
  saveBlobFile(data, filename);
  window.$message?.success($t('page.aiplatform.project.success.downloaded'));
}

onMounted(loadTree);
</script>

<template>
  <div v-if="treeLoading" class="flex-center min-h-300px">
    <NSpin />
  </div>
  <NEmpty v-else-if="!treeData.length" :description="$t('page.aiplatform.project.drawer.filesEmpty')" />
  <div v-else class="flex-col-stretch gap-12px">
    <div class="flex justify-end">
      <NButton v-if="canDownload" size="small" :loading="downloading" @click="handleDownload">
        {{ $t('page.aiplatform.project.drawer.downloadPackage') }}
      </NButton>
    </div>

    <div class="flex gap-12px">
      <!-- 文件树：按 path 折叠（目录合成）+ 行内 size -->
      <div class="files-tree h-480px w-260px flex-shrink-0 overflow-auto pr-8px">
        <NTree
          :data="treeData"
          :selected-keys="selectedKeys"
          :default-expanded-keys="defaultExpandedKeys"
          block-line
          expand-on-click
          selectable
          :render-suffix="renderSizeSuffix"
          @update:selected-keys="handleSelect"
        />
      </div>

      <!-- 查看器：加载 / 拒读一态兜底 / 内嵌只读正文 / 未选文件提示（目录选中同态） -->
      <div class="file-viewer h-480px min-w-0 flex-1">
        <div v-if="contentLoading" class="flex-center h-full">
          <NSpin />
        </div>
        <div v-else-if="previewUnavailableMsg" class="file-unavailable flex-col-center h-full gap-8px">
          <div class="font-600">{{ $t('page.aiplatform.project.drawer.previewUnavailable') }}</div>
          <div class="text-13px text-#999">{{ previewUnavailableMsg }}</div>
        </div>
        <template v-else-if="content">
          <div class="mb-8px flex items-center justify-between gap-8px">
            <span class="truncate font-mono text-12px">{{ content.path }}</span>
            <span class="flex-shrink-0 text-12px text-#999">{{ formatFileSize(selectedNode?.size) }}</span>
          </div>
          <pre class="file-content m-0 max-h-440px overflow-auto whitespace-pre-wrap rounded-8px bg-#f5f5f5 p-12px font-mono text-13px leading-6">{{ content.content }}</pre>
        </template>
        <div v-else class="flex-center h-full">
          <NEmpty :description="$t('page.aiplatform.project.drawer.filesSelectHint')" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
