<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { Check, Loader2, Search, Trash2, X } from 'lucide-vue-next';
import { extractApiError } from '@/services/api';
import { adminApi } from '@/services/weddingApi';
import { useToastStore } from '@/stores/toast';
import type { AdminWishDto } from '@/types/wedding';

const toast = useToastStore();
const loading = ref(true);
const statusFilter = ref<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
const search = ref('');
const counts = ref({ all: 0, pending: 0, approved: 0, rejected: 0 });
const wishes = ref<AdminWishDto[]>([]);

async function loadWishes() {
  loading.value = true;
  try {
    const res = await adminApi.getWishes({
      status: statusFilter.value,
      search: search.value.trim(),
      limit: 50,
    });
    counts.value = res.counts;
    wishes.value = res.items;
  } catch (err) {
    toast.push(extractApiError(err, 'Gagal memuat ucapan'), 'error');
  } finally {
    loading.value = false;
  }
}

async function approve(id: string) {
  try {
    await adminApi.approveWish(id);
    toast.push('Ucapan disetujui dan tampil di undangan.', 'success');
    await loadWishes();
  } catch (err) {
    toast.push(extractApiError(err, 'Gagal menyetujui ucapan'), 'error');
  }
}

async function reject(id: string) {
  try {
    await adminApi.rejectWish(id);
    toast.push('Ucapan ditolak.', 'info');
    await loadWishes();
  } catch (err) {
    toast.push(extractApiError(err, 'Gagal menolak ucapan'), 'error');
  }
}

async function removeWish(id: string) {
  try {
    await adminApi.deleteWish(id);
    toast.push('Ucapan dihapus permanen.', 'info');
    await loadWishes();
  } catch (err) {
    toast.push(extractApiError(err, 'Gagal menghapus ucapan'), 'error');
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

let timer: ReturnType<typeof setTimeout> | null = null;
watch([statusFilter, search], () => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    void loadWishes();
  }, 200);
});

onMounted(loadWishes);
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col justify-between gap-4 border border-stone-200 bg-white p-5 sm:flex-row sm:items-center">
      <div class="inline-flex flex-wrap gap-1 border border-stone-200 bg-stone-50 p-1">
        <button
          v-for="tab in [
            { key: 'ALL', label: `Semua (${counts.all})` },
            { key: 'PENDING', label: `Menunggu (${counts.pending})` },
            { key: 'APPROVED', label: `Disetujui (${counts.approved})` },
            { key: 'REJECTED', label: `Ditolak (${counts.rejected})` },
          ]"
          :key="tab.key"
          type="button"
          :class="
            statusFilter === tab.key
              ? 'bg-white text-stone-900 shadow-sm'
              : 'text-stone-600 hover:text-stone-900'
          "
          class="px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
          @click="statusFilter = tab.key as typeof statusFilter"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="relative w-full sm:w-64">
        <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          v-model="search"
          type="search"
          placeholder="Cari nama atau ucapan..."
          class="w-full border border-stone-300 py-2 pl-9 pr-3 text-sm focus:border-stone-900 focus:outline-none"
        />
      </div>
    </div>

    <div class="border border-stone-200 bg-white">
      <div v-if="loading" class="flex items-center gap-3 p-8 text-sm text-stone-500">
        <Loader2 class="h-5 w-5 animate-spin" />
        <span>Memuat daftar ucapan...</span>
      </div>

      <div v-else-if="wishes.length === 0" class="p-10 text-center text-sm text-stone-500">
        Tidak ada ucapan pada kategori ini.
      </div>

      <div v-else class="divide-y divide-stone-200">
        <article
          v-for="wish in wishes"
          :key="wish.id"
          class="flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-start"
        >
          <div class="max-w-2xl">
            <div class="flex flex-wrap items-center gap-2 text-xs text-stone-500">
              <span class="font-semibold text-stone-900 text-sm">{{ wish.authorName }}</span>
              <template v-if="wish.relationLabel">
                <span aria-hidden="true">·</span>
                <span>{{ wish.relationLabel }}</span>
              </template>
              <span aria-hidden="true">·</span>
              <span>{{ formatDate(wish.createdAt) }}</span>
              <span aria-hidden="true">·</span>
              <span
                :class="
                  wish.status === 'APPROVED'
                    ? 'text-emerald-700 font-medium'
                    : wish.status === 'REJECTED'
                      ? 'text-red-700 font-medium'
                      : 'text-amber-700 font-medium'
                "
              >
                {{ wish.status }}
              </span>
            </div>
            <p class="mt-2 font-editorial text-base leading-relaxed text-stone-800">
              “{{ wish.message }}”
            </p>
          </div>

          <div class="flex shrink-0 items-center gap-2">
            <button
              v-if="wish.status !== 'APPROVED'"
              type="button"
              class="inline-flex items-center gap-1 border border-emerald-700 bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 cursor-pointer whitespace-nowrap"
              @click="approve(wish.id)"
            >
              <Check class="h-3.5 w-3.5" />
              <span>Setujui</span>
            </button>
            <button
              v-if="wish.status !== 'REJECTED'"
              type="button"
              class="inline-flex items-center gap-1 border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 cursor-pointer whitespace-nowrap"
              @click="reject(wish.id)"
            >
              <X class="h-3.5 w-3.5" />
              <span>Tolak</span>
            </button>
            <button
              type="button"
              aria-label="Hapus ucapan"
              class="border border-red-200 p-1.5 text-red-700 hover:bg-red-50 cursor-pointer"
              @click="removeWish(wish.id)"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>
