<script setup lang="ts">
import { ref, watch } from 'vue';
import { NPopconfirm, NSwitch } from 'naive-ui';
import { enableStatusRecord } from '@/constants/business';
import { $t } from '@/locales';

/**
 * 启停开关 + 二次确认。
 *
 * NaiveUI 的 NSwitch 无前置拦截钩子（点击即乐观切换、无 before-change），
 * 故用受控副本 `inner` 接管 NSwitch：
 * - 点击 → `inner` 切到目标值（开关乐观跟随）+ NPopconfirm 弹确认气泡；
 * - 确认 → emit 目标值给父调启停接口，随后回滚 `inner`（父 `getData` 成功后 `value`
 *   变化经 watch 同步到目标值；失败则 `value` 不变、`inner` 已回滚，显示真实旧值）；
 * - 取消 / 点外 → 回滚 `inner`。
 *
 * label 走 `$t(enableStatusRecord[...])`（启用/禁用），同列渲染范式。
 */
interface Props {
  /** 当前状态：1=启用 / 0=禁用 */
  value: number;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), { disabled: false });

const emit = defineEmits<{
  /** 用户确认后发出目标状态，由父调启停接口 */
  confirm: [next: number];
}>();

const inner = ref(props.value);
watch(
  () => props.value,
  v => {
    inner.value = v;
  }
);

function onUpdate(val: number) {
  inner.value = val;
}

function onConfirm() {
  const next = inner.value;
  emit('confirm', next);
  // 回滚乐观态：成功由父 getData 驱动 value 变化同步；失败 value 不变、保持真实旧值
  inner.value = props.value;
}

function rollback() {
  inner.value = props.value;
}
</script>

<template>
  <NPopconfirm
    :positive-text="$t('common.confirm')"
    :negative-text="$t('common.cancel')"
    @positive-click="onConfirm"
    @negative-click="rollback"
    @clickoutside="rollback"
  >
    <template #trigger>
      <NSwitch :value="inner" :checked-value="1" :unchecked-value="0" :disabled="disabled" @update:value="onUpdate">
        <template #checked>{{ $t(enableStatusRecord[1]) }}</template>
        <template #unchecked>{{ $t(enableStatusRecord[0]) }}</template>
      </NSwitch>
    </template>
    <!-- 弹出时 inner = 目标态（已点击切换）：启用→0 显示「禁用?」；禁用→1 显示「启用?」 -->
    <span>{{ $t(enableStatusRecord[inner]) }}?</span>
  </NPopconfirm>
</template>
