<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { AlertCircle, Loader2 } from 'lucide-vue-next';
import { extractApiError } from '@/services/api';
import { publicApi } from '@/services/weddingApi';
import { resolveTemplateComponent } from '@/templates/registry';
import type { PersonalizedGuestContext, PublicInvitationBundle } from '@/types/wedding';

const route = useRoute();
const loading = ref(true);
const errorMessage = ref('');
const guestLinkError = ref('');
const bundle = ref<PublicInvitationBundle | null>(null);
const guestContext = ref<PersonalizedGuestContext | null>(null);

const slugParam = computed(() => (route.params.slug ? String(route.params.slug) : ''));
const tokenParam = computed(() => (route.params.token ? String(route.params.token) : ''));
const guestSlugParam = computed(() =>
  route.params.guestSlug ? String(route.params.guestSlug) : ''
);

const activeTemplateComponent = computed(() => {
  if (!bundle.value) return null;
  return resolveTemplateComponent(bundle.value.template.key);
});

function updateDocumentSeo(inv: PublicInvitationBundle) {
  const title = inv.invitation.seoTitle || inv.invitation.title;
  document.title = title;
  const desc = inv.invitation.seoDescription || inv.invitation.heroSubtitle;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', desc);
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', title);
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', desc);
}

async function loadInvitation() {
  loading.value = true;
  errorMessage.value = '';
  guestLinkError.value = '';
  guestContext.value = null;

  try {
    const data = slugParam.value
      ? await publicApi.getInvitationBySlug(slugParam.value)
      : await publicApi.getDefaultInvitation();

    bundle.value = data;
    updateDocumentSeo(data);

    if (guestSlugParam.value || tokenParam.value) {
      try {
        guestContext.value = guestSlugParam.value
          ? await publicApi.resolveGuestSlug(data.invitation.slug, guestSlugParam.value)
          : await publicApi.resolveGuestToken(data.invitation.slug, tokenParam.value);
      } catch (err) {
        guestLinkError.value = extractApiError(
          err,
          'Tautan undangan personal tidak valid atau sudah diperbarui.'
        );
      }
    }
  } catch (err) {
    bundle.value = null;
    errorMessage.value = extractApiError(err, 'Undangan tidak ditemukan.');
  } finally {
    loading.value = false;
  }
}

watch([slugParam, tokenParam, guestSlugParam], () => {
  void loadInvitation();
});

onMounted(() => {
  void loadInvitation();
});
</script>

<template>
  <div class="min-h-screen bg-[#FBF9F5]">
    <!-- Loading State -->
    <div v-if="loading" class="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-stone-600">
      <Loader2 class="h-6 w-6 animate-spin text-stone-700" />
      <p class="text-sm tracking-wide">Memuat undangan pernikahan...</p>
    </div>

    <!-- Error State (Not Found / Unpublished) -->
    <div
      v-else-if="errorMessage"
      class="flex min-h-screen flex-col items-center justify-center px-6 text-center"
    >
      <div class="max-w-md border border-stone-200 bg-white p-8">
        <AlertCircle class="mx-auto h-7 w-7 text-stone-500" />
        <h1 class="font-display mt-4 text-3xl font-medium text-stone-900">
          Undangan Tidak Tersedia
        </h1>
        <p class="mt-2 text-sm leading-relaxed text-stone-600">
          {{ errorMessage }}
        </p>
        <div class="mt-6 flex justify-center gap-3">
          <router-link
            to="/"
            class="border border-stone-900 px-5 py-2.5 text-xs font-medium tracking-wider uppercase text-stone-900 hover:bg-stone-900 hover:text-white transition-colors"
          >
            Beranda Utama
          </router-link>
          <router-link
            to="/admin/login"
            class="border border-stone-300 px-5 py-2.5 text-xs font-medium tracking-wider uppercase text-stone-700 hover:bg-stone-100 transition-colors"
          >
            Login Admin
          </router-link>
        </div>
      </div>
    </div>

    <!-- Invalid personalized guest link safe gate -->
    <div
      v-else-if="guestLinkError && bundle"
      class="flex min-h-screen flex-col items-center justify-center px-6 text-center"
    >
      <div class="max-w-md border border-stone-200 bg-white p-8">
        <AlertCircle class="mx-auto h-7 w-7 text-amber-700" />
        <h1 class="font-display mt-4 text-3xl font-medium text-stone-900">
          Tautan Personal Tidak Valid
        </h1>
        <p class="mt-2 text-sm leading-relaxed text-stone-600">
          {{ guestLinkError }}
        </p>
        <div class="mt-6">
          <router-link
            :to="`/${bundle.invitation.slug}`"
            class="inline-flex min-h-[44px] items-center bg-stone-900 px-6 py-2.5 text-xs font-medium tracking-wider uppercase text-white hover:bg-stone-800 transition-colors"
          >
            Buka Undangan Publik
          </router-link>
        </div>
      </div>
    </div>

    <!-- Active Template Renderer -->
    <component
      :is="activeTemplateComponent"
      v-else-if="bundle && activeTemplateComponent"
      :bundle="bundle"
      :guest-token="tokenParam || null"
      :guest-slug="guestSlugParam || null"
      :guest-context="guestContext"
    />
  </div>
</template>
