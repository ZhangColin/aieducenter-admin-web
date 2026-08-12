<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import {
  fetchDisableApp,
  fetchDisableSsoClient,
  fetchEnableApp,
  fetchEnableSsoClient,
  fetchGenerateApiKey,
  fetchGetAppDetail,
  fetchProvisionSsoCredentials,
  fetchUpdateApp,
  fetchUpdateSsoClientConfig
} from '@/service/api';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';
import { formatDateTime } from '@/utils/common';
import StatusSwitch from '@/views/manage/components/status-switch.vue';
import { enableStatusRecord } from '@/constants/business';

defineOptions({
  name: 'AppDetailModal'
});

const visible = defineModel<boolean>('visible', { default: false });

interface Props {
  appId: string;
  /** 创建流程注入的详情种子（与 GET /apps/{id} 同构），复用创建响应省一次请求；列表「详情」入口不传 → 走 GET */
  initialDetail?: Api.SystemManage.AppDetail | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  saved: [];
}>();

// ---- data loading ----
const detail = ref<Api.SystemManage.AppDetail | null>(null);
const loading = ref(false);

async function loadDetail() {
  if (!props.appId) return;
  loading.value = true;
  const { data, error } = await fetchGetAppDetail(props.appId);
  if (!error && data) {
    detail.value = data;
    initEditableFields();
  }
  loading.value = false;
}

watch(visible, async val => {
  if (val) {
    if (props.initialDetail) {
      // 创建响应已含整份 AppDetailResponse（与 GET /apps/{id} 同构）——直接复用，跳过冗余 GET
      detail.value = props.initialDetail;
      initEditableFields();
    } else {
      await loadDetail();
    }
  } else {
    detail.value = null;
  }
});

// ---- Block 1: Basic Info ----
const { formRef: basicFormRef, validate: validateBasic, restoreValidation: restoreBasicValidation } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();

const basicModel = ref({ name: '', description: '' });
const basicRules = {
  name: [defaultRequiredRule, { max: 128, message: $t('page.manage.app.appNameLengthRule'), trigger: 'input' }],
  description: { max: 512, message: $t('page.manage.app.appDescriptionLengthRule'), trigger: 'input' }
};

// Block 3 配置表单模型：整份替换 redirectUris/postLogoutRedirectUris/scopes/grants（不碰凭证与状态）
const ssoModel = ref({
  redirectUris: [] as string[],
  postLogoutRedirectUris: [] as string[],
  scopes: [] as string[],
  grants: [] as string[]
});

function initEditableFields() {
  if (!detail.value) return;
  basicModel.value.name = detail.value.name;
  basicModel.value.description = detail.value.description ?? '';
  // 配置表单回显：未开通 SSO 时 ssoClient 为 null，置空（表单本就不渲染）
  const sso = detail.value.ssoClient;
  ssoModel.value = sso
    ? {
        redirectUris: [...sso.redirectUris],
        postLogoutRedirectUris: [...sso.postLogoutRedirectUris],
        scopes: [...sso.scopes],
        grants: [...sso.grants]
      }
    : { redirectUris: [], postLogoutRedirectUris: [], scopes: [], grants: [] };
  restoreBasicValidation();
}

const savingBasic = ref(false);

async function saveBasic() {
  await validateBasic();
  savingBasic.value = true;
  try {
    const { error } = await fetchUpdateApp(props.appId, {
      name: basicModel.value.name,
      description: basicModel.value.description || null
    });
    if (!error) {
      window.$message?.success?.($t('common.updateSuccess'));
      emit('saved');
      await loadDetail();
    }
  } finally {
    savingBasic.value = false;
  }
}

async function handleToggleStatus(next: number) {
  const { error } = await (next === 1 ? fetchEnableApp : fetchDisableApp)(props.appId);
  if (!error) {
    window.$message?.success?.(next === 1 ? $t('page.manage.common.enableSuccess') : $t('page.manage.common.disableSuccess'));
    emit('saved');
  }
  await loadDetail();
}

// ---- Block 2: API Key ----
const secretModalVisible = ref(false);
const secretModalTitle = ref('');
const secretValue = ref('');
const generatingApiKey = ref(false);

async function handleGenerateApiKey() {
  generatingApiKey.value = true;
  try {
    const { data, error } = await fetchGenerateApiKey(props.appId);
    if (!error && data) {
      secretModalTitle.value = $t('page.manage.app.secretModal.title');
      secretValue.value = data.apiSecret;
      secretModalVisible.value = true;
      emit('saved');
      await loadDetail();
    }
  } finally {
    generatingApiKey.value = false;
  }
}

// ---- Clipboard ----
const copiedKey = ref('');
const copyFeedbackTimer = ref<ReturnType<typeof setTimeout>>();

async function copyToClipboard(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    copiedKey.value = label;
    window.$message?.success?.($t('page.manage.app.copySuccess'));
    if (copyFeedbackTimer.value) clearTimeout(copyFeedbackTimer.value);
    copyFeedbackTimer.value = setTimeout(() => {
      copiedKey.value = '';
    }, 2000);
  } catch {
    // clipboard API not available — user can still select + Ctrl+C
  }
}

onBeforeUnmount(() => {
  if (copyFeedbackTimer.value) clearTimeout(copyFeedbackTimer.value);
});

// ---- Block 3: SSO Client（凭证轴：开通 / 重置密钥；启停用；配置表单）----
const provisioningSso = ref(false);

async function handleProvisionSso() {
  provisioningSso.value = true;
  try {
    const { data, error } = await fetchProvisionSsoCredentials(props.appId);
    if (!error && data) {
      // 凭证端点返回一次性明文 clientSecret，复用共享密钥展示弹窗；clientId 经下方 loadDetail 揭示
      secretModalTitle.value = $t('page.manage.app.secretModal.title');
      secretValue.value = data.clientSecret;
      secretModalVisible.value = true;
      emit('saved');
      await loadDetail();
    }
  } finally {
    provisioningSso.value = false;
  }
}

/**
 * SSO 启停用——与所属应用启停用相互独立（各自独立端点、不级联、不动凭证/配置）。
 * 开关仅在 hasSsoClient 时渲染 → 未开通 404 不可达；StatusSwitch 只许切反态 → 同态 409 不可达，
 * 故异常只走 onError 通用兜底，不特判。成功后刷新详情（开关反映新状态）+ emit('saved') 刷新列表。
 */
async function handleToggleSsoStatus(next: number) {
  const { error } = await (next === 1 ? fetchEnableSsoClient : fetchDisableSsoClient)(props.appId);
  if (!error) {
    window.$message?.success?.(next === 1 ? $t('page.manage.app.ssoEnableSuccess') : $t('page.manage.app.ssoDisableSuccess'));
    emit('saved');
  }
  await loadDetail();
}

const savingSsoConfig = ref(false);

/**
 * 保存 SSO 配置：整份 PUT 替换 redirectUris/postLogoutRedirectUris/scopes/grants，不轮换 secret、不改 status。
 * 两 URI 列表前端兜底非空（空白条目忽略）；权威校验在后端（app-registry @NotEmpty），错误透传 onError。
 * 成功后刷新详情（回显服务端权威态）+ emit('saved') 刷新列表。
 */
async function saveSsoConfig() {
  const normalizeUris = (uris: string[]) => uris.map(uri => uri.trim()).filter(Boolean);
  const redirectUris = normalizeUris(ssoModel.value.redirectUris);
  const postLogoutRedirectUris = normalizeUris(ssoModel.value.postLogoutRedirectUris);
  if (redirectUris.length === 0 || postLogoutRedirectUris.length === 0) {
    window.$message?.warning?.($t('page.manage.app.uriRequired'));
    return;
  }
  savingSsoConfig.value = true;
  try {
    const { error } = await fetchUpdateSsoClientConfig(props.appId, {
      redirectUris,
      postLogoutRedirectUris,
      scopes: ssoModel.value.scopes,
      grants: ssoModel.value.grants
    });
    if (!error) {
      window.$message?.success?.($t('common.updateSuccess'));
      emit('saved');
      await loadDetail();
    }
  } finally {
    savingSsoConfig.value = false;
  }
}

// ---- computed ----
const hasApiKey = computed(() => detail.value?.apiKey != null);
const hasApiSecret = computed(() => detail.value?.apiKey?.status === 1);
const hasSsoClient = computed(() => detail.value?.ssoClient != null);

const modalTitle = computed(() => {
  if (!detail.value) return $t('page.manage.app.detail');
  return `${detail.value.name} (${$t(enableStatusRecord[detail.value.status])})`;
});

function confirmResetApiKey() {
  window.$dialog?.warning({
    title: $t('page.manage.app.resetSecretConfirm.title'),
    content: $t('page.manage.app.resetSecretConfirm.content'),
    positiveText: $t('common.confirm'),
    negativeText: $t('common.cancel'),
    positiveButtonProps: { type: 'error' },
    onPositiveClick: () => handleGenerateApiKey()
  });
}

/**
 * Secret 按钮入口：已生成（重置）路径前置二次确认，防误点让线上旧密钥立即失效；
 * 首次「生成」无确认、一键直达（新应用本就无密钥）。
 */
function handleSecretButtonClick() {
  if (hasApiSecret.value) {
    confirmResetApiKey();
  } else {
    handleGenerateApiKey();
  }
}

function confirmResetSsoSecret() {
  window.$dialog?.warning({
    title: $t('page.manage.app.resetSsoSecretConfirm.title'),
    content: $t('page.manage.app.resetSsoSecretConfirm.content'),
    positiveText: $t('common.confirm'),
    negativeText: $t('common.cancel'),
    positiveButtonProps: { type: 'error' },
    onPositiveClick: () => handleProvisionSso()
  });
}

/**
 * SSO 凭证控件入口：已开通（重置密钥）路径前置二次确认，防误点让线上旧 client_secret 立即失效；
 * 首次「开通」无确认、一键直达（本就无 SsoClient 可破坏）。复刻既有 apiSecret 的 handleSecretButtonClick 模式。
 */
function handleSsoCredentialClick() {
  if (hasSsoClient.value) {
    confirmResetSsoSecret();
  } else {
    handleProvisionSso();
  }
}
</script>

<template>
  <NModal v-model:show="visible" preset="card" :title="modalTitle" :mask-closable="false" :close-on-esc="false" style="width: 720px">
    <div v-if="loading" class="flex-center min-h-300px">
      <NSpin />
    </div>

    <template v-else-if="detail">
      <NSpace vertical :size="16">
        <!-- ===== Block 1: Basic Info ===== -->
        <NCard :title="$t('page.manage.app.basicInfo')" :bordered="false" size="small" class="card-wrapper">
          <template #header-extra>
            <NButton type="primary" size="small" :loading="savingBasic" @click="saveBasic">
              {{ $t('page.manage.app.save') }}
            </NButton>
          </template>

          <div class="desc-table mb-20px">
            <div class="desc-row">
              <div class="desc-label">{{ $t('page.manage.app.appCode') }}</div>
              <div class="desc-value"><span class="text-14px">{{ detail.appCode }}</span></div>
            </div>
            <div class="desc-row">
              <div class="desc-label">{{ $t('page.manage.app.status') }}</div>
              <div class="desc-value"><StatusSwitch :value="detail.status" @confirm="handleToggleStatus" /></div>
            </div>
            <div class="desc-row">
              <div class="desc-label">{{ $t('page.manage.app.createdAt') }}</div>
              <div class="desc-value"><span class="text-14px text-disabled">{{ formatDateTime(detail.createdAt) }}</span></div>
            </div>
            <div class="desc-row">
              <div class="desc-label">{{ $t('page.manage.app.updatedAt') }}</div>
              <div class="desc-value"><span class="text-14px text-disabled">{{ formatDateTime(detail.updatedAt) }}</span></div>
            </div>
          </div>

          <NForm ref="basicFormRef" :model="basicModel" :rules="basicRules" label-placement="left" :label-width="100">
            <NFormItem path="name" :label="$t('page.manage.app.appName')">
              <NInput v-model:value="basicModel.name" />
            </NFormItem>
            <NFormItem path="description" :label="$t('page.manage.app.description')">
              <NInput v-model:value="basicModel.description" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" />
            </NFormItem>
          </NForm>
        </NCard>

        <!-- ===== Block 2: API Key ===== -->
        <NCard :title="$t('page.manage.app.apiKey')" :bordered="false" size="small" class="card-wrapper">
          <template #header-extra>
            <NButton
              :type="hasApiSecret ? 'warning' : 'primary'"
              size="small"
              :loading="generatingApiKey"
              @click="handleSecretButtonClick"
            >
              {{ hasApiSecret ? $t('page.manage.app.resetSecret') : $t('page.manage.app.generateSecret') }}
            </NButton>
          </template>

          <div class="desc-table">
            <div class="desc-row">
              <div class="desc-label">{{ $t('page.manage.app.apiKey') }}</div>
              <div class="desc-value">
                <template v-if="hasApiKey">
                  <NInput :value="detail.apiKey!.apiKey" readonly size="small">
                    <template #suffix>
                      <NButton
                        text
                        size="tiny"
                        :type="copiedKey === 'apikey' ? 'success' : 'default'"
                        @click="copyToClipboard(detail.apiKey!.apiKey, 'apikey')"
                      >
                        {{ copiedKey === 'apikey' ? $t('page.manage.app.copySuccess') : $t('page.manage.app.copy') }}
                      </NButton>
                    </template>
                  </NInput>
                </template>
                <template v-else>
                  <NTag type="warning" size="small">{{ $t('page.manage.app.notGenerated') }}</NTag>
                </template>
              </div>
            </div>
            <div class="desc-row">
              <div class="desc-label">{{ $t('page.manage.app.apiSecret') }}</div>
              <div class="desc-value">
                <template v-if="hasApiSecret">
                  <span class="text-14px text-disabled">••••••••••••</span>
                  <NTag type="success" size="small" class="ml-8px">{{ $t('page.manage.app.masked') }}</NTag>
                </template>
                <template v-else>
                  <NTag type="warning" size="small">{{ $t('page.manage.app.notGenerated') }}</NTag>
                </template>
              </div>
            </div>
          </div>
        </NCard>

        <!-- ===== Block 3: SSO Client（凭证轴：开通 / 重置密钥；启停用；配置表单）===== -->
        <NCard :title="$t('page.manage.app.ssoClient')" :bordered="false" size="small" class="card-wrapper">
          <template #header-extra>
            <NButton
              :type="hasSsoClient ? 'warning' : 'primary'"
              size="small"
              :loading="provisioningSso"
              @click="handleSsoCredentialClick"
            >
              {{ hasSsoClient ? $t('page.manage.app.resetSsoSecret') : $t('page.manage.app.provisionSso') }}
            </NButton>
          </template>

          <template v-if="hasSsoClient">
            <div class="desc-table">
              <div class="desc-row">
                <div class="desc-label">{{ $t('page.manage.app.clientId') }}</div>
                <div class="desc-value">
                  <NInput :value="detail.ssoClient!.clientId" readonly size="small">
                    <template #suffix>
                      <NButton
                        text
                        size="tiny"
                        :type="copiedKey === 'clientid' ? 'success' : 'default'"
                        @click="copyToClipboard(detail.ssoClient!.clientId, 'clientid')"
                      >
                        {{ copiedKey === 'clientid' ? $t('page.manage.app.copySuccess') : $t('page.manage.app.copy') }}
                      </NButton>
                    </template>
                  </NInput>
                </div>
              </div>
              <div class="desc-row">
                <div class="desc-label">{{ $t('page.manage.app.status') }}</div>
                <div class="desc-value">
                  <StatusSwitch :value="detail.ssoClient!.status" @confirm="handleToggleSsoStatus" />
                </div>
              </div>
            </div>

            <!-- 配置轴：redirectUris / postLogoutRedirectUris（动态增删行）/ scopes / grants（动态标签），整份 PUT 替换 -->
            <NDivider title-placement="left" class="mt-16px">{{ $t('page.manage.app.ssoConfig') }}</NDivider>
            <NForm :model="ssoModel" label-placement="top" :show-feedback="false">
              <NFormItem :label="$t('page.manage.app.redirectUris')">
                <NDynamicInput v-model:value="ssoModel.redirectUris" :placeholder="$t('page.manage.app.uriPlaceholder')" :min="1" />
              </NFormItem>
              <NFormItem :label="$t('page.manage.app.postLogoutRedirectUris')" class="mt-12px">
                <NDynamicInput v-model:value="ssoModel.postLogoutRedirectUris" :placeholder="$t('page.manage.app.uriPlaceholder')" :min="1" />
              </NFormItem>
              <NFormItem :label="$t('page.manage.app.scopes')" class="mt-12px">
                <NDynamicTags v-model:value="ssoModel.scopes" />
              </NFormItem>
              <NFormItem :label="$t('page.manage.app.grants')" class="mt-12px">
                <NDynamicTags v-model:value="ssoModel.grants" />
              </NFormItem>
            </NForm>
            <div class="mt-16px flex justify-end">
              <NButton type="primary" size="small" :loading="savingSsoConfig" @click="saveSsoConfig">
                {{ $t('page.manage.app.saveSsoConfig') }}
              </NButton>
            </div>
          </template>

          <template v-else>
            <NEmpty :description="$t('page.manage.app.ssoNotProvisioned')">
              <template #extra>
                <div class="text-12px text-disabled text-center max-w-360px">
                  {{ $t('page.manage.app.ssoNotProvisionedHint') }}
                </div>
              </template>
            </NEmpty>
          </template>
        </NCard>
      </NSpace>
    </template>

    <!-- Secret Display Modal -->
    <NModal v-model:show="secretModalVisible" :title="secretModalTitle" preset="card" :mask-closable="false" :close-on-esc="false" style="width: 520px">
      <div class="text-14px mb-16px text-disabled">{{ $t('page.manage.app.secretModal.description') }}</div>
      <NInput :value="secretValue" type="textarea" readonly :autosize="{ minRows: 2, maxRows: 6 }" class="font-mono" />
      <template #footer>
        <NSpace :size="16" justify="end">
          <NButton type="primary" @click="copyToClipboard(secretValue, 'secret')">
            {{ $t('page.manage.app.copy') }}
          </NButton>
          <NButton @click="secretModalVisible = false; secretValue = ''">
            {{ $t('common.close') }}
          </NButton>
        </NSpace>
      </template>
    </NModal>
  </NModal>
</template>

<style scoped>
.desc-table {
  border: 1px solid var(--n-border-color);
  border-radius: var(--n-border-radius);
}
.desc-row {
  display: flex;
  border-bottom: 1px solid var(--n-border-color);
}
.desc-row:last-child {
  border-bottom: none;
}
.desc-label {
  flex-shrink: 0;
  width: 120px;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--n-text-color-3);
  background: var(--n-color-embedded);
  border-right: 1px solid var(--n-border-color);
}
.desc-value {
  flex: 1;
  min-width: 0;
  padding: 8px 12px;
  display: flex;
  align-items: center;
}

@media (max-width: 639px) {
  .desc-row {
    flex-direction: column;
  }
  .desc-label {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--n-border-color);
  }
}
</style>
