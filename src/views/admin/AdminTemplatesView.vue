<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Check, ExternalLink, Loader2 } from 'lucide-vue-next';
import { extractApiError } from '@/services/api';
import { adminApi } from '@/services/weddingApi';
import { useToastStore } from '@/stores/toast';
import type { TemplateDto } from '@/types/wedding';

const toast = useToastStore();
const loading = ref(true);
const activatingId = ref<string | null>(null);
const activeTemplateId = ref('');
const templates = ref<TemplateDto[]>([]);

async function loadTemplates() {
  loading.value = true;
  try {
    const res = await adminApi.getTemplates();
    activeTemplateId.value = res.activeTemplateId;
    templates.value = res.templates;
  } catch (err) {
    toast.push(extractApiError(err, 'Gagal memuat katalog template'), 'error');
  } finally {
    loading.value = false;
  }
}

async function selectTemplate(tpl: TemplateDto) {
  if (tpl.id === activeTemplateId.value) return;
  activatingId.value = tpl.id;
  try {
    await adminApi.activateTemplate(tpl.id);
    activeTemplateId.value = tpl.id;
    toast.push(`Template "${tpl.name}" berhasil diaktifkan.`, 'success');
  } catch (err) {
    toast.push(extractApiError(err, 'Gagal mengaktifkan template'), 'error');
  } finally {
    activatingId.value = null;
  }
}

onMounted(loadTemplates);
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col justify-between gap-4 border border-stone-200 bg-white p-6 sm:flex-row sm:items-center">
      <div>
        <h1 class="font-display text-2xl font-medium text-stone-900">Katalog Template Undangan</h1>
        <p class="mt-1 text-xs text-stone-500">
          Pilih desain undangan aktif. Seluruh data mempelai, acara, galeri, dan RSVP tetap terjaga saat berganti template.
        </p>
      </div>
      <router-link
        to="/"
        target="_blank"
        class="inline-flex min-h-[40px] items-center gap-1.5 border border-stone-300 px-4 py-2 text-xs font-medium text-stone-800 hover:border-stone-800 whitespace-nowrap"
      >
        <span>Pratinjau Live</span>
        <ExternalLink class="h-3.5 w-3.5" />
      </router-link>
    </div>

    <div v-if="loading" class="flex items-center gap-3 py-12 text-sm text-stone-500">
      <Loader2 class="h-5 w-5 animate-spin" />
      <span>Memuat template...</span>
    </div>

    <div v-else class="grid grid-cols-1 gap-6 md:grid-cols-3">
      <article
        v-for="tpl in templates"
        :key="tpl.id"
        :class="tpl.id === activeTemplateId ? 'border-stone-900' : 'border-stone-200'"
        class="flex flex-col justify-between border bg-white"
      >
        <div>
          <div class="aspect-[4/3] overflow-hidden bg-stone-100">
            <img
              :src="tpl.previewImageUrl"
              :alt="tpl.name"
              referrerpolicy="no-referrer"
              class="h-full w-full object-cover"
            />
          </div>
          <div class="p-6">
            <div class="flex items-center justify-between gap-2">
              <h2 class="font-display text-2xl font-medium text-stone-900">{{ tpl.name }}</h2>
              <span
                class="h-3.5 w-3.5 shrink-0 border border-stone-300"
                :style="{ backgroundColor: tpl.accentColor }"
                :title="tpl.accentColor"
              />
            </div>
            <p class="mt-2 text-sm leading-relaxed text-stone-600">{{ tpl.description }}</p>
          </div>
        </div>

        <div class="border-t border-stone-100 px-6 py-4">
          <button
            type="button"
            :disabled="tpl.id === activeTemplateId || activatingId === tpl.id"
            :class="
              tpl.id === activeTemplateId
                ? 'bg-emerald-800 text-white cursor-default'
                : 'bg-stone-900 text-white hover:bg-stone-800 cursor-pointer'
            "
            class="inline-flex min-h-[42px] w-full items-center justify-center gap-2 px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors disabled:opacity-90"
            @click="selectTemplate(tpl)"
          >
            <Loader2 v-if="activatingId === tpl.id" class="h-4 w-4 animate-spin" />
            <Check v-else-if="tpl.id === activeTemplateId" class="h-4 w-4" />
            <span>{{ tpl.id === activeTemplateId ? 'Template Aktif' : 'Aktifkan Template' }}</span>
          </button>
        </div>
      </article>
    </div>
  </div>
</template>
