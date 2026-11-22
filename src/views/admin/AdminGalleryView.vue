<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { Loader2, Trash2, Upload } from 'lucide-vue-next';
import { extractApiError } from '@/services/api';
import { adminApi } from '@/services/weddingApi';
import { useToastStore } from '@/stores/toast';
import type { GalleryItemDto } from '@/types/wedding';

const toast = useToastStore();
const loading = ref(true);
const uploading = ref(false);
const items = ref<GalleryItemDto[]>([]);
const selectedFile = ref<File | null>(null);

const form = reactive({
  title: '',
  caption: '',
  sortOrder: 0,
});

async function loadGalleries() {
  loading.value = true;
  try {
    items.value = await adminApi.getGalleries();
  } catch (err) {
    toast.push(extractApiError(err, 'Gagal memuat galeri'), 'error');
  } finally {
    loading.value = false;
  }
}

function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  selectedFile.value = input.files?.[0] || null;
}

async function handleUpload() {
  if (!selectedFile.value) {
    toast.push('Silakan pilih file gambar JPG, PNG, atau WebP.', 'error');
    return;
  }

  uploading.value = true;
  try {
    const fd = new FormData();
    fd.append('title', form.title.trim());
    fd.append('caption', form.caption.trim());
    fd.append('sortOrder', String(form.sortOrder));
    fd.append('image', selectedFile.value);

    const created = await adminApi.uploadGallery(fd);
    items.value = [created, ...items.value];
    form.title = '';
    form.caption = '';
    selectedFile.value = null;
    toast.push('Foto berhasil diunggah ke galeri.', 'success');
  } catch (err) {
    toast.push(extractApiError(err, 'Gagal mengunggah foto'), 'error');
  } finally {
    uploading.value = false;
  }
}

async function removePhoto(id: string) {
  try {
    await adminApi.deleteGallery(id);
    items.value = items.value.filter((i) => i.id !== id);
    toast.push('Foto dihapus dari galeri.', 'info');
  } catch (err) {
    toast.push(extractApiError(err, 'Gagal menghapus foto'), 'error');
  }
}

onMounted(loadGalleries);
</script>

<template>
  <div class="space-y-6">
    <form class="border border-stone-200 bg-white p-6" @submit.prevent="handleUpload">
      <h1 class="font-display text-2xl font-medium text-stone-900">Unggah Foto Galeri</h1>
      <p class="mt-1 text-xs text-stone-500">Format yang didukung: JPG, PNG, WebP (maksimal 5 MB).</p>

      <div class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label class="block text-xs font-medium uppercase text-stone-600">Judul Foto</label>
          <input v-model="form.title" type="text" required placeholder="Prewedding Taman" class="mt-1 w-full border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-xs font-medium uppercase text-stone-600">Keterangan</label>
          <input v-model="form.caption" type="text" placeholder="Momen senja bersama" class="mt-1 w-full border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-xs font-medium uppercase text-stone-600">File Gambar</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            class="mt-1 block w-full border border-stone-300 px-3 py-1.5 text-xs text-stone-700"
            @change="onFileSelected"
          />
        </div>
      </div>

      <div class="mt-4 flex justify-end">
        <button
          type="submit"
          :disabled="uploading"
          class="inline-flex min-h-[40px] items-center gap-2 bg-stone-900 px-5 py-2 text-xs font-medium uppercase tracking-wider text-white hover:bg-stone-800 disabled:opacity-60 cursor-pointer"
        >
          <Loader2 v-if="uploading" class="h-4 w-4 animate-spin" />
          <Upload v-else class="h-4 w-4" />
          <span>Unggah Foto</span>
        </button>
      </div>
    </form>

    <div v-if="loading" class="flex items-center gap-3 py-12 text-sm text-stone-500">
      <Loader2 class="h-5 w-5 animate-spin" />
      <span>Memuat foto galeri...</span>
    </div>

    <div v-else-if="items.length === 0" class="border border-stone-200 bg-white p-10 text-center text-sm text-stone-500">
      Belum ada foto di galeri.
    </div>

    <div v-else class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <article v-for="item in items" :key="item.id" class="border border-stone-200 bg-white">
        <div class="aspect-[4/3] overflow-hidden bg-stone-100">
          <img :src="item.imageUrl" :alt="item.title" class="h-full w-full object-cover" />
        </div>
        <div class="flex items-center justify-between gap-3 p-4">
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-stone-900">{{ item.title }}</p>
            <p class="truncate text-xs text-stone-500">{{ item.caption || 'Tanpa keterangan' }}</p>
          </div>
          <button
            type="button"
            aria-label="Hapus foto"
            class="shrink-0 border border-red-200 p-2 text-red-700 hover:bg-red-50 cursor-pointer"
            @click="removePhoto(item.id)"
          >
            <Trash2 class="h-4 w-4" />
          </button>
        </div>
      </article>
    </div>
  </div>
</template>
