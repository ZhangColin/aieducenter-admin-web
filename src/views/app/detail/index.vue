<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import {
  fetchDisableApp,
  fetchEnableApp,
  fetchGenerateApiKey,
  fetchGetAppDetail,
  fetchSaveSsoClient,
  fetchUpdateApp
} from '@/service/api';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { useTabStore } from '@/store/modules/tab';
import { $t } from '@/locales';
import StatusSwitch from '@/views/manage/components/status-switch.vue';
import { enableStatusRecord } from '@/constants/business';

defineOptions({
  name: 'AppDetail'
});

interface Props {
  id: string;
}

const props = defineProps<Props>();

const tabStore = useTabStore();

function backToList() {
  tabStore.replaceTab('app_list');
}

// ---- data loading ----
const detail = ref<Api.SystemManage.AppDetail | null>(null);
const loading = ref(true);

async function loadDetail() {
  loading.value = true;
  const { data, error } = await fetchGetAppDetail(props.id);
  if (!error && data) {
    detail.value = data;
    initEditableFields();
    initSsoFields();
  }
  loading.value = false;
}

// ---- Block 1: Basic Info ----
const { formRef: basicFormRef, validate: validateBasic, restoreValidation: restoreBasicValidation } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();

const basicModel = ref({ name: '', description: '' });
const basicRules = {
  name: [defaultRequiredRule, { max: 128, message: $t('page.manage.app.appNameLengthRule'), trigger: 'input' }],
  description: { max: 512, message: $t('page.manage.app.appDescriptionLengthRule'), trigger: 'input' }
};

function initEditableFields() {
  if (!detail.value) return;
  basicModel.value.name = detail.value.name;
  basicModel.value.description = detail.value.description ?? '';
  restoreBasicValidation();
}

const savingBasic = ref(false);

async function saveBasic() {
  await validateBasic();
  savingBasic.value = true;
  try {
    const { error } = await fetchUpdateApp(props.id, {
      name: basicModel.value.name,
      description: basicModel.value.description || null
    });
    if (!error) {
      window.$message?.success?.($t('common.updateSuccess'));
      await loadDetail();
    }
  } finally {
    savingBasic.value = false;
  }
}

async function handleToggleStatus(next: number) {
  const { error } = await (next === 1 ? fetchEnableApp : fetchDisableApp)(props.id);
  if (!error) {
    window.$message?.success?.(next === 1 ? $t('page.manage.common.enableSuccess') : $t('page.manage.common.disableSuccess'));
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
    const { data, error } = await fetchGenerateApiKey(props.id);
    if (!error && data) {
      secretModalTitle.value = $t('page.manage.app.secretModal.title');
      secretValue.value = data.apiSecret;
      secretModalVisible.value = true;
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

// ---- Block 3: SSO Client ----
const ssoModel = ref({ redirectUris: [''] as string[], scopes: [] as string[], grants: [] as string[] });

function initSsoFields() {
  if (!detail.value) return;
  const sso = detail.value.ssoClient;
  if (sso) {
    ssoModel.value.redirectUris = sso.redirectUris.length > 0 ? [...sso.redirectUris] : [''];
    ssoModel.value.scopes = [...sso.scopes];
    ssoModel.value.grants = [...sso.grants];
  } else {
    ssoModel.value.redirectUris = [''];
    ssoModel.value.scopes = [];
    ssoModel.value.grants = [];
  }
}

function addRedirectUri() {
  ssoModel.value.redirectUris.push('');
}

function removeRedirectUri(index: number) {
  if (ssoModel.value.redirectUris.length > 1) {
    ssoModel.value.redirectUris.splice(index, 1);
  }
}

const savingSso = ref(false);

async function handleSaveSso() {
  const uris = ssoModel.value.redirectUris.filter(u => u.trim());
  if (uris.length === 0) {
    window.$message?.warning?.($t('page.manage.app.ssoRedirectUriRequired'));
    return;
  }
  savingSso.value = true;
  try {
    const { data, error } = await fetchSaveSsoClient(props.id, {
      redirectUris: uris,
      scopes: ssoModel.value.scopes.filter(s => s.trim()),
      grants: ssoModel.value.grants.filter(g => g.trim())
    });
    if (!error) {
      if (data?.clientSecret) {
        secretModalTitle.value = $t('page.manage.app.secretModal.title');
        secretValue.value = data.clientSecret;
        secretModalVisible.value = true;
      }
      window.$message?.success?.($t('common.updateSuccess'));
      await loadDetail();
    }
  } finally {
    savingSso.value = false;
  }
}

// ---- Secret Modal ----
const secretCopied = ref(false);

function handleCopySecret() {
  navigator.clipboard.writeText(secretValue.value).then(() => {
    secretCopied.value = true;
  });
}

function closeSecretModal() {
  secretModalVisible.value = false;
  secretValue.value = '';
  secretCopied.value = false;
}

// ---- computed ----
const hasApiSecret = computed(() => detail.value?.apiKey?.status === 1);
const hasSsoClient = computed(() => detail.value?.ssoClient != null);

onMounted(() => {
  loadDetail();
});
</script>

<template>
  <div class="detail-container">
    <!-- Loading -->
    <div v-if="loading" class="flex-center min-h-300px">
      <NSpin />
    </div>

    <template v-else-if="detail">
      <!-- ===== Page Header (non-card chrome) ===== -->
      <div class="flex flex-wrap items-center gap-x-12px gap-y-8px mb-20px lt-sm:flex-col lt-sm:items-start">
        <div class="flex items-center gap-8px min-w-0">
          <NButton text @click="backToList">
            <template #icon>
              <icon-ic-round-arrow-back class="text-icon" />
            </template>
          </NButton>
          <h1 class="text-18px font-semibold truncate">{{ detail.name }}</h1>
          <NTag :type="detail.status === 1 ? 'success' : 'default'" size="small">
            {{ $t(enableStatusRecord[detail.status]) }}
          </NTag>
        </div>
      </div>

      <NSpace vertical :size="16">
        <!-- ===== Block 1: Basic Info ===== -->
        <NCard :title="$t('page.manage.app.basicInfo')" :bordered="false" size="small" class="card-wrapper">
          <template #header-extra>
            <NButton type="primary" size="small" :loading="savingBasic" @click="saveBasic">
              {{ $t('page.manage.app.save') }}
            </NButton>
          </template>

          <!-- Read-only fields: label-value table -->
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
              <div class="desc-value"><span class="text-14px text-disabled">{{ detail.createdAt || '-' }}</span></div>
            </div>
            <div class="desc-row">
              <div class="desc-label">{{ $t('page.manage.app.updatedAt') }}</div>
              <div class="desc-value"><span class="text-14px text-disabled">{{ detail.updatedAt || '-' }}</span></div>
            </div>
          </div>

          <!-- Editable fields: NForm -->
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
              @click="handleGenerateApiKey"
            >
              {{ hasApiSecret ? $t('page.manage.app.resetSecret') : $t('page.manage.app.generateSecret') }}
            </NButton>
          </template>

          <div class="desc-table">
            <div class="desc-row">
              <div class="desc-label">{{ $t('page.manage.app.apiKey') }}</div>
              <div class="desc-value">
                <NInput :value="detail.apiKey.apiKey" readonly size="small">
                  <template #suffix>
                    <NButton
                      text
                      size="tiny"
                      :type="copiedKey === 'apikey' ? 'success' : 'default'"
                      @click="copyToClipboard(detail.apiKey.apiKey, 'apikey')"
                    >
                      {{ copiedKey === 'apikey' ? $t('page.manage.app.copySuccess') : $t('page.manage.app.copy') }}
                    </NButton>
                  </template>
                </NInput>
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

        <!-- ===== Block 3: SSO Client ===== -->
        <NCard :title="$t('page.manage.app.ssoClient')" :bordered="false" size="small" class="card-wrapper">
          <!-- Read-only info: clientId + status, only when SSO is configured -->
          <template v-if="hasSsoClient">
            <div class="desc-table mb-16px">
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
                  <NTag :type="detail.ssoClient!.status === 1 ? 'success' : 'default'" size="small">
                    {{ detail.ssoClient!.statusName }}
                  </NTag>
                </div>
              </div>
            </div>
            <NDivider />
          </template>

          <!-- Edit form: always visible so new SSO config can be filled in -->
          <div class="mb-8px text-14px font-medium">{{ $t('page.manage.app.redirectUris') }}</div>
          <div v-for="(uri, i) in ssoModel.redirectUris" :key="i" class="flex items-center gap-8px mb-8px">
            <NInput v-model:value="ssoModel.redirectUris[i]" placeholder="https://example.com/callback" class="flex-1" />
            <NButton size="small" :disabled="ssoModel.redirectUris.length <= 1" @click="removeRedirectUri(i)">-</NButton>
          </div>
          <NButton size="small" class="mb-16px" @click="addRedirectUri">{{ $t('page.manage.app.addRedirectUri') }}</NButton>

          <div class="mb-8px text-14px font-medium">{{ $t('page.manage.app.scopes') }}</div>
          <NDynamicTags v-model:value="ssoModel.scopes" class="mb-16px" />

          <div class="mb-8px text-14px font-medium">{{ $t('page.manage.app.grants') }}</div>
          <NDynamicTags v-model:value="ssoModel.grants" class="mb-16px" />

          <div class="flex justify-end gap-8px mt-16px">
            <NButton type="primary" :loading="savingSso" @click="handleSaveSso">
              {{ hasSsoClient ? $t('page.manage.app.updateSso') : $t('page.manage.app.configSso') }}
            </NButton>
            <NButton v-if="hasSsoClient" type="warning" :loading="savingSso" @click="handleSaveSso">
              {{ $t('page.manage.app.resetSso') }}
            </NButton>
          </div>
        </NCard>
      </NSpace>
    </template>

    <!-- Secret Display Modal -->
    <NModal v-model:show="secretModalVisible" :title="secretModalTitle" preset="card" style="width: 520px">
      <div class="text-14px mb-16px text-disabled">{{ $t('page.manage.app.secretModal.description') }}</div>
      <NInput :value="secretValue" type="textarea" readonly :autosize="{ minRows: 2, maxRows: 6 }" class="font-mono" />
      <template #footer>
        <NSpace :size="16" justify="end">
          <NButton v-if="!secretCopied" type="primary" @click="handleCopySecret">
            {{ $t('page.manage.app.secretModal.copied') }}
          </NButton>
          <NButton @click="closeSecretModal">
            {{ secretCopied ? $t('page.manage.app.secretModal.done') : $t('common.close') }}
          </NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
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
