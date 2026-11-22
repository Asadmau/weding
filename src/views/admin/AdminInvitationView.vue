<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { Loader2, Save, Upload } from 'lucide-vue-next';
import { extractApiError } from '@/services/api';
import { adminApi } from '@/services/weddingApi';
import { useToastStore } from '@/stores/toast';
import type { TemplateDto } from '@/types/wedding';

const toast = useToastStore();
const loading = ref(true);
const savingInv = ref(false);
const savingCouple = ref(false);
const uploadingRole = ref<'groom' | 'bride' | 'hero' | null>(null);
const templates = ref<TemplateDto[]>([]);

const invForm = reactive({
  title: '',
  slug: '',
  templateId: '',
  isPublished: true,
  heroSubtitle: '',
  heroImageUrl: '',
  openingQuote: '',
  openingQuoteAuthor: '',
  seoTitle: '',
  seoDescription: '',
  ogImageUrl: '',
  musicUrl: '',
  musicTitle: '',
  isMusicEnabled: true,
  primaryDate: '',
  countdownTarget: '',
});

const coupleForm = reactive({
  groomFullName: '',
  groomNickName: '',
  groomParents: '',
  groomBio: '',
  groomInstagram: '',
  groomPhotoUrl: '',
  brideFullName: '',
  brideNickName: '',
  brideParents: '',
  brideBio: '',
  brideInstagram: '',
  bridePhotoUrl: '',
});

async function loadData() {
  loading.value = true;
  try {
    const [bundle, tplRes] = await Promise.all([
      adminApi.getInvitationBundle(),
      adminApi.getTemplates(),
    ]);
    templates.value = tplRes.templates;
    Object.assign(invForm, bundle.invitation);
    if (bundle.couple) {
      Object.assign(coupleForm, bundle.couple);
    }
  } catch (err) {
    toast.push(extractApiError(err, 'Gagal memuat data undangan'), 'error');
  } finally {
    loading.value = false;
  }
}

async function saveInvitation() {
  savingInv.value = true;
  try {
    await adminApi.updateInvitation({ ...invForm });
    toast.push('Pengaturan undangan & SEO berhasil disimpan.', 'success');
  } catch (err) {
    toast.push(extractApiError(err, 'Gagal menyimpan undangan'), 'error');
  } finally {
    savingInv.value = false;
  }
}

async function saveCouple() {
  savingCouple.value = true;
  try {
    await adminApi.updateCouple({ ...coupleForm });
    toast.push('Profil mempelai berhasil disimpan.', 'success');
  } catch (err) {
    toast.push(extractApiError(err, 'Gagal menyimpan profil mempelai'), 'error');
  } finally {
    savingCouple.value = false;
  }
}

async function handlePhotoUpload(event: Event, target: 'groom' | 'bride' | 'hero') {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  uploadingRole.value = target;
  try {
    if (target === 'hero') {
      const uploaded = await adminApi.uploadImage(file);
      invForm.heroImageUrl = uploaded.publicUrl;
      invForm.ogImageUrl = uploaded.publicUrl;
      toast.push('Foto sampul diunggah. Klik Simpan Undangan untuk menerapkan.', 'info');
    } else {
      const updated = await adminApi.uploadCouplePhoto(target, file);
      coupleForm.groomPhotoUrl = updated.groomPhotoUrl;
      coupleForm.bridePhotoUrl = updated.bridePhotoUrl;
      toast.push('Foto mempelai berhasil diperbarui.', 'success');
    }
  } catch (err) {
    toast.push(extractApiError(err, 'Gagal mengunggah gambar'), 'error');
  } finally {
    uploadingRole.value = null;
    input.value = '';
  }
}

onMounted(loadData);
</script>

<template>
  <div class="space-y-8">
    <div v-if="loading" class="flex items-center gap-3 py-12 text-sm text-stone-500">
      <Loader2 class="h-5 w-5 animate-spin" />
      <span>Memuat konfigurasi undangan...</span>
    </div>

    <template v-else>
      <!-- Invitation & SEO Form -->
      <section class="border border-stone-200 bg-white p-6 sm:p-8">
        <div class="mb-6 flex items-center justify-between border-b border-stone-200 pb-4">
          <div>
            <h1 class="font-display text-2xl font-medium text-stone-900">Pengaturan Undangan &amp; SEO</h1>
            <p class="mt-1 text-xs text-stone-500">Kelola judul, slug URL publik, kutipan pembuka, musik, dan metadata SEO.</p>
          </div>
          <label class="flex items-center gap-2 text-xs font-medium text-stone-700 cursor-pointer">
            <input v-model="invForm.isPublished" type="checkbox" class="h-4 w-4 accent-stone-900" />
            <span>Publikasikan Undangan</span>
          </label>
        </div>

        <form class="space-y-5" @submit.prevent="saveInvitation">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-medium uppercase tracking-wider text-stone-600">Judul Undangan</label>
              <input v-model="invForm.title" type="text" required class="mt-1.5 w-full border border-stone-300 px-3.5 py-2 text-sm focus:border-stone-900 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs font-medium uppercase tracking-wider text-stone-600">Slug URL</label>
              <input v-model="invForm.slug" type="text" required pattern="^[a-z0-9-]+$" class="mt-1.5 w-full border border-stone-300 px-3.5 py-2 font-mono text-sm focus:border-stone-900 focus:outline-none" />
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label class="block text-xs font-medium uppercase tracking-wider text-stone-600">Tanggal Utama</label>
              <input v-model="invForm.primaryDate" type="date" required class="mt-1.5 w-full border border-stone-300 px-3.5 py-2 text-sm focus:border-stone-900 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs font-medium uppercase tracking-wider text-stone-600">Target Countdown (ISO)</label>
              <input v-model="invForm.countdownTarget" type="text" required class="mt-1.5 w-full border border-stone-300 px-3.5 py-2 font-mono text-sm focus:border-stone-900 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs font-medium uppercase tracking-wider text-stone-600">Template Aktif</label>
              <select v-model="invForm.templateId" class="mt-1.5 w-full border border-stone-300 bg-white px-3.5 py-2 text-sm focus:border-stone-900 focus:outline-none">
                <option v-for="tpl in templates" :key="tpl.id" :value="tpl.id">{{ tpl.name }}</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium uppercase tracking-wider text-stone-600">Subjudul Hero</label>
            <textarea v-model="invForm.heroSubtitle" rows="2" class="mt-1.5 w-full border border-stone-300 px-3.5 py-2 text-sm focus:border-stone-900 focus:outline-none" />
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-medium uppercase tracking-wider text-stone-600">Foto Hero URL</label>
              <div class="mt-1.5 flex gap-2">
                <input v-model="invForm.heroImageUrl" type="text" class="w-full border border-stone-300 px-3.5 py-2 text-sm focus:border-stone-900 focus:outline-none" />
                <label class="inline-flex shrink-0 items-center gap-1.5 border border-stone-300 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 cursor-pointer">
                  <Upload class="h-3.5 w-3.5" />
                  <span>{{ uploadingRole === 'hero' ? '...' : 'Unggah' }}</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="(e) => handlePhotoUpload(e, 'hero')" />
                </label>
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium uppercase tracking-wider text-stone-600">Judul Musik Latar</label>
              <input v-model="invForm.musicTitle" type="text" class="mt-1.5 w-full border border-stone-300 px-3.5 py-2 text-sm focus:border-stone-900 focus:outline-none" />
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-medium uppercase tracking-wider text-stone-600">Kutipan Pembuka</label>
              <textarea v-model="invForm.openingQuote" rows="2" class="mt-1.5 w-full border border-stone-300 px-3.5 py-2 text-sm focus:border-stone-900 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs font-medium uppercase tracking-wider text-stone-600">Sumber Kutipan</label>
              <input v-model="invForm.openingQuoteAuthor" type="text" class="mt-1.5 w-full border border-stone-300 px-3.5 py-2 text-sm focus:border-stone-900 focus:outline-none" />
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 border-t border-stone-200 pt-5 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-medium uppercase tracking-wider text-stone-600">SEO Title</label>
              <input v-model="invForm.seoTitle" type="text" class="mt-1.5 w-full border border-stone-300 px-3.5 py-2 text-sm focus:border-stone-900 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs font-medium uppercase tracking-wider text-stone-600">SEO Description</label>
              <input v-model="invForm.seoDescription" type="text" class="mt-1.5 w-full border border-stone-300 px-3.5 py-2 text-sm focus:border-stone-900 focus:outline-none" />
            </div>
          </div>

          <div class="flex justify-end">
            <button
              type="submit"
              :disabled="savingInv"
              class="inline-flex min-h-[42px] items-center gap-2 bg-stone-900 px-6 py-2 text-xs font-medium uppercase tracking-wider text-white hover:bg-stone-800 disabled:opacity-60 cursor-pointer"
            >
              <Loader2 v-if="savingInv" class="h-4 w-4 animate-spin" />
              <Save v-else class="h-4 w-4" />
              <span>Simpan Undangan</span>
            </button>
          </div>
        </form>
      </section>

      <!-- Couple Profile Form -->
      <section class="border border-stone-200 bg-white p-6 sm:p-8">
        <div class="mb-6 border-b border-stone-200 pb-4">
          <h2 class="font-display text-2xl font-medium text-stone-900">Profil Kedua Mempelai</h2>
          <p class="mt-1 text-xs text-stone-500">Perbarui nama lengkap, nama orang tua, bio, dan potret kedua mempelai.</p>
        </div>

        <form class="space-y-8" @submit.prevent="saveCouple">
          <div class="grid grid-cols-1 gap-8 md:grid-cols-2">
            <!-- Groom -->
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-semibold text-stone-900">Mempelai Pria</h3>
                <label class="inline-flex items-center gap-1.5 border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 cursor-pointer">
                  <Upload class="h-3.5 w-3.5" />
                  <span>{{ uploadingRole === 'groom' ? 'Mengunggah...' : 'Ganti Foto' }}</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="(e) => handlePhotoUpload(e, 'groom')" />
                </label>
              </div>
              <div v-if="coupleForm.groomPhotoUrl" class="h-40 w-32 overflow-hidden border border-stone-200 bg-stone-100">
                <img :src="coupleForm.groomPhotoUrl" alt="Foto Mempelai Pria" class="h-full w-full object-cover" />
              </div>
              <div>
                <label class="block text-xs font-medium uppercase text-stone-600">Nama Lengkap</label>
                <input v-model="coupleForm.groomFullName" type="text" required class="mt-1 w-full border border-stone-300 px-3.5 py-2 text-sm" />
              </div>
              <div>
                <label class="block text-xs font-medium uppercase text-stone-600">Nama Panggilan</label>
                <input v-model="coupleForm.groomNickName" type="text" required class="mt-1 w-full border border-stone-300 px-3.5 py-2 text-sm" />
              </div>
              <div>
                <label class="block text-xs font-medium uppercase text-stone-600">Nama Orang Tua</label>
                <input v-model="coupleForm.groomParents" type="text" class="mt-1 w-full border border-stone-300 px-3.5 py-2 text-sm" />
              </div>
              <div>
                <label class="block text-xs font-medium uppercase text-stone-600">Bio Singkat</label>
                <textarea v-model="coupleForm.groomBio" rows="2" class="mt-1 w-full border border-stone-300 px-3.5 py-2 text-sm" />
              </div>
            </div>

            <!-- Bride -->
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-semibold text-stone-900">Mempelai Wanita</h3>
                <label class="inline-flex items-center gap-1.5 border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 cursor-pointer">
                  <Upload class="h-3.5 w-3.5" />
                  <span>{{ uploadingRole === 'bride' ? 'Mengunggah...' : 'Ganti Foto' }}</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="(e) => handlePhotoUpload(e, 'bride')" />
                </label>
              </div>
              <div v-if="coupleForm.bridePhotoUrl" class="h-40 w-32 overflow-hidden border border-stone-200 bg-stone-100">
                <img :src="coupleForm.bridePhotoUrl" alt="Foto Mempelai Wanita" class="h-full w-full object-cover" />
              </div>
              <div>
                <label class="block text-xs font-medium uppercase text-stone-600">Nama Lengkap</label>
                <input v-model="coupleForm.brideFullName" type="text" required class="mt-1 w-full border border-stone-300 px-3.5 py-2 text-sm" />
              </div>
              <div>
                <label class="block text-xs font-medium uppercase text-stone-600">Nama Panggilan</label>
                <input v-model="coupleForm.brideNickName" type="text" required class="mt-1 w-full border border-stone-300 px-3.5 py-2 text-sm" />
              </div>
              <div>
                <label class="block text-xs font-medium uppercase text-stone-600">Nama Orang Tua</label>
                <input v-model="coupleForm.brideParents" type="text" class="mt-1 w-full border border-stone-300 px-3.5 py-2 text-sm" />
              </div>
              <div>
                <label class="block text-xs font-medium uppercase text-stone-600">Bio Singkat</label>
                <textarea v-model="coupleForm.brideBio" rows="2" class="mt-1 w-full border border-stone-300 px-3.5 py-2 text-sm" />
              </div>
            </div>
          </div>

          <div class="flex justify-end">
            <button
              type="submit"
              :disabled="savingCouple"
              class="inline-flex min-h-[42px] items-center gap-2 bg-stone-900 px-6 py-2 text-xs font-medium uppercase tracking-wider text-white hover:bg-stone-800 disabled:opacity-60 cursor-pointer"
            >
              <Loader2 v-if="savingCouple" class="h-4 w-4 animate-spin" />
              <Save v-else class="h-4 w-4" />
              <span>Simpan Profil Mempelai</span>
            </button>
          </div>
        </form>
      </section>
    </template>
  </div>
</template>
