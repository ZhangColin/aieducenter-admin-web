<script setup lang="ts">
/**
 * AI 平台技能详情抽屉（#67）——安装审核面：所见即运行时注入面。
 *
 * 720 单栏三节：基本信息（清单行全字段，id mono——opaque 串两形制直读）/ Frontmatter 泛型键值
 * （自由 map：原始键直出、值按类型格式化——string 原样、number/boolean String、数组逗号并、
 * 对象 JSON 串）/ 正文全文（frontmatter 剥离后 SKILL.md 原文，pre 只读——素材全文同形）。
 * 写动作收口在父页（操作下拉单点），本抽屉纯读面。
 */
import { computed, ref, watch } from 'vue';
import { NDrawer, NDrawerContent, NSpin, NTag } from 'naive-ui';
import { skillStatusTagColor } from '@/constants/aiplatform';
import { fetchGetAiplatformSkill } from '@/service/api';
import { $t } from '@/locales';

defineOptions({ name: 'SkillDetailDrawer' });

const props = defineProps<{
  skillId: string;
}>();

const visible = defineModel<boolean>('visible', { default: false });

const detail = ref<Api.Aiplatform.SkillDetail | null>(null);
const loading = ref(false);

async function loadDetail() {
  loading.value = true;
  const { data, error } = await fetchGetAiplatformSkill(props.skillId);
  loading.value = false;
  if (!error) detail.value = data;
}

watch(visible, val => {
  if (val) {
    detail.value = null;
    loadDetail();
  }
});

/** frontmatter 自由 map → 键值对数组（原始键直出；插入序即渲染序）。 */
const frontmatterEntries = computed(() => (detail.value?.frontmatter ? Object.entries(detail.value.frontmatter) : []));

/** 值按类型格式化：string 原样 / number·boolean String / 数组逗号并（元素递归）/ 对象 JSON 串。 */
function formatFmValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(item => formatFmValue(item)).join(', ');
  return JSON.stringify(value);
}
</script>

<template>
  <NDrawer v-model:show="visible" :width="720">
    <NDrawerContent :title="$t('page.aiplatform.skill.detailTitle')" closable>
      <div v-if="loading" class="flex-center min-h-300px">
        <NSpin />
      </div>
      <div v-else-if="detail" class="flex-col-stretch gap-16px">
        <!-- 一、基本信息（清单行全字段；id 为 opaque 串两形制 mono 直读） -->
        <div>
          <div class="mb-8px font-600">{{ $t('page.aiplatform.skill.drawer.basic') }}</div>
          <div class="grid grid-cols-[110px_1fr] gap-x-16px gap-y-10px text-14px">
            <span class="text-right text-#999">{{ $t('page.aiplatform.skill.id') }}</span>
            <span class="break-all font-mono">{{ detail.id }}</span>
            <span class="text-right text-#999">{{ $t('page.aiplatform.skill.name') }}</span>
            <span>{{ detail.name }}</span>
            <span class="text-right text-#999">{{ $t('page.aiplatform.skill.description') }}</span>
            <span>{{ detail.description }}</span>
            <span class="text-right text-#999">{{ $t('page.aiplatform.skill.source') }}</span>
            <span>{{ detail.sourceName }}</span>
            <span class="text-right text-#999">{{ $t('page.aiplatform.skill.sourcePackage') }}</span>
            <span v-if="detail.sourcePackage" class="break-all font-mono">{{ detail.sourcePackage }}</span>
            <span v-else>-</span>
            <span class="text-right text-#999">{{ $t('page.aiplatform.skill.version') }}</span>
            <span v-if="detail.version" class="break-all font-mono">{{ detail.version }}</span>
            <span v-else>-</span>
            <span class="text-right text-#999">{{ $t('page.aiplatform.skill.status') }}</span>
            <span>
              <NTag :type="skillStatusTagColor[detail.status]" size="small">{{ detail.statusName }}</NTag>
            </span>
            <span class="text-right text-#999">{{ $t('page.aiplatform.skill.operator') }}</span>
            <span v-if="detail.operatorName" class="flex flex-col">
              <span>{{ detail.operatorName }}</span>
              <span class="font-mono text-12px text-gray-400">{{ detail.operatorId }}</span>
            </span>
            <span v-else>-</span>
            <span class="text-right text-#999">{{ $t('page.aiplatform.skill.updateAvailable') }}</span>
            <span>
              <NTag v-if="detail.updateAvailable === true" type="warning" size="small">
                {{ $t('page.aiplatform.skill.updatable') }}
              </NTag>
              <span v-else>-</span>
            </span>
          </div>
        </div>

        <!-- 二、Frontmatter 泛型键值（解析态自由 map——审核面所见即运行时注入面） -->
        <div>
          <div class="mb-8px font-600">{{ $t('page.aiplatform.skill.drawer.frontmatter') }}</div>
          <div v-if="frontmatterEntries.length" class="grid grid-cols-[140px_1fr] gap-x-16px gap-y-10px text-14px">
            <template v-for="[key, value] in frontmatterEntries" :key="key">
              <span class="break-all text-right font-mono text-13px text-#999">{{ key }}</span>
              <span class="break-all">{{ formatFmValue(value) }}</span>
            </template>
          </div>
          <span v-else class="text-13px text-gray-400">{{ $t('page.aiplatform.skill.drawer.frontmatterEmpty') }}</span>
        </div>

        <!-- 三、正文全文（frontmatter 剥离后原文，只读） -->
        <div>
          <div class="mb-8px font-600">{{ $t('page.aiplatform.skill.drawer.content') }}</div>
          <pre class="max-h-60vh overflow-auto whitespace-pre-wrap rounded-8px bg-#f5f5f5 p-12px text-13px leading-6">{{ detail.content }}</pre>
        </div>
      </div>
    </NDrawerContent>
  </NDrawer>
</template>
