<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { NButton, NDivider, NTag } from 'naive-ui';
import {
  fetchDisableApp,
  fetchEnableApp,
  fetchGenerateApiKey,
  fetchGetAppDetail,
  fetchSaveSsoClient,
  fetchUpdateApp
} from '@/service/api';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';
import StatusSwitch from '@/views/manage/components/status-switch.vue';

defineOptions({
  name: 'AppDetail'
});

interface Props {
  id: string;
}

const props = defineProps<Props>();

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
  basicModel.value.name = detail.value.app.name;
  basicModel.value.description = detail.value.app.description ?? '';
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
const hasSsoClient = computed(() => detail.value?.ssoClient !== null);

onMounted(() => {
  loadDetail();
});
</script>

<template>
  <div v-if="loading" class="flex-center min-h-300px">
    <NSpin />
  </div>

  <NSpace v-else-if="detail" vertical :size="16">
    <!-- Block 1: Basic Info -->
    <NCard :title="$t('page.manage.app.basicInfo')" :bordered="false" size="small" class="card-wrapper">
      <NForm ref="basicFormRef" :model="basicModel" :rules="basicRules" label-placement="left" :label-width="100">
        <NGrid :x-gap="24" :cols="2" responsive="screen">
          <NFormItemGi span="2 m:1" :label="$t('page.manage.app.appCode')">
            <span class="text-14px">{{ detail.app.appCode }}</span>
          </NFormItemGi>
          <NFormItemGi span="2 m:1" :label="$t('page.manage.app.status')">
            <StatusSwitch :value="detail.app.status" @confirm="handleToggleStatus" />
          </NFormItemGi>
          <NFormItemGi span="2" path="name" :label="$t('page.manage.app.appName')">
            <NInput v-model:value="basicModel.name" />
          </NFormItemGi>
          <NFormItemGi span="2" path="description" :label="$t('page.manage.app.description')">
            <NInput v-model:value="basicModel.description" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" />
          </NFormItemGi>
          <NFormItemGi span="2 m:1" :label="$t('page.manage.app.createdAt')">
            <span class="text-14px text-disabled">{{ detail.app.createdAt || '-' }}</span>
          </NFormItemGi>
          <NFormItemGi span="2 m:1" :label="$t('page.manage.app.updatedAt')">
            <span class="text-14px text-disabled">{{ detail.app.updatedAt || '-' }}</span>
          </NFormItemGi>
        </NGrid>
      </NForm>
      <div class="flex justify-end mt-16px">
        <NButton type="primary" :loading="savingBasic" @click="saveBasic">{{ $t('page.manage.app.save') }}</NButton>
      </div>
    </NCard>

    <!-- Block 2: API Key -->
    <NCard :title="$t('page.manage.app.apiKey')" :bordered="false" size="small" class="card-wrapper">
      <NGrid :x-gap="24" :cols="2" responsive="screen">
        <NGi span="2 m:1">
          <div class="text-12px text-disabled mb-4px">{{ $t('page.manage.app.appCode') }}</div>
          <div class="text-14px">{{ detail.apiKey.apiKey }}</div>
        </NGi>
        <NGi span="2 m:1">
          <div class="text-12px text-disabled mb-4px">{{ $t('page.manage.app.apiSecret') }}</div>
          <div class="text-14px">
            <template v-if="hasApiSecret">
              <span class="text-disabled">••••••••</span>
            </template>
            <template v-else>
              <NTag type="warning" size="small">{{ $t('page.manage.app.notGenerated') }}</NTag>
            </template>
          </div>
        </NGi>
        <NGi span="2 m:1">
          <div class="text-12px text-disabled mb-4px">{{ $t('page.manage.app.status') }}</div>
          <NTag :type="detail.apiKey.status === 1 ? 'success' : 'default'" size="small">
            {{ detail.apiKey.statusName }}
          </NTag>
        </NGi>
      </NGrid>
      <div class="flex justify-end mt-16px">
        <NButton :type="hasApiSecret ? 'warning' : 'primary'" :loading="generatingApiKey" @click="handleGenerateApiKey">
          {{ hasApiSecret ? $t('page.manage.app.resetSecret') : $t('page.manage.app.generateSecret') }}
        </NButton>
      </div>
    </NCard>

    <!-- Block 3: SSO Client -->
    <NCard :title="$t('page.manage.app.ssoClient')" :bordered="false" size="small" class="card-wrapper">
      <template v-if="hasSsoClient">
        <NGrid :x-gap="24" :cols="2" responsive="screen">
          <NGi span="2 m:1">
            <div class="text-12px text-disabled mb-4px">{{ $t('page.manage.app.clientId') }}</div>
            <div class="text-14px">{{ detail.ssoClient!.clientId }}</div>
          </NGi>
          <NGi span="2 m:1">
            <div class="text-12px text-disabled mb-4px">{{ $t('page.manage.app.status') }}</div>
            <NTag :type="detail.ssoClient!.status === 1 ? 'success' : 'default'" size="small">
              {{ detail.ssoClient!.statusName }}
            </NTag>
          </NGi>
        </NGrid>
        <NDivider />

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
      </template>

      <template v-else>
        <div class="text-14px text-disabled mb-16px">{{ $t('page.manage.app.notGenerated') }}</div>
      </template>

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
</template>

<style scoped></style>
