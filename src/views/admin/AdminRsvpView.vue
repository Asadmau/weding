<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { Download, Loader2, Search } from 'lucide-vue-next';
import { extractApiError } from '@/services/api';
import { adminApi } from '@/services/weddingApi';
import { useToastStore } from '@/stores/toast';
import type { RsvpListResponse } from '@/types/wedding';

const toast = useToastStore();
const loading = ref(true);
const search = ref('');
const statusFilter = ref('ALL');
const data = ref<RsvpListResponse | null>(null);

async function loadRsvps(page = 1) {
  loading.value = true;
  try {
    data.value = await adminApi.getRsvps({
      page,
      limit: 20,
      search: search.value.trim(),
      status: statusFilter.value,
    });
  } catch (err) {
    toast.push(extractApiError(err, 'Gagal memuat data RSVP'), 'error');
  } finally {
    loading.value = false;
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

let timer: ReturnType<typeof setTimeout> | null = null;
watch([search, statusFilter], () => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    void loadRsvps(1);
  }, 250);
});

onMounted(() => loadRsvps(1));
</script>

<template>
  <div class="space-y-6">
    <!-- Stats Summary -->
    <div v-if="data" class="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <div class="border border-stone-200 bg-white p-4">
        <p class="text-xs uppercase tracking-wider text-stone-500">Total Respon</p>
        <p class="font-mono tabular-nums mt-1 text-2xl font-medium text-stone-900">{{ data.summary.totalResponses }}</p>
      </div>
      <div class="border border-stone-200 bg-white p-4">
        <p class="text-xs uppercase tracking-wider text-stone-500">Hadir</p>
        <p class="font-mono tabular-nums mt-1 text-2xl font-medium text-emerald-800">{{ data.summary.attendingCount }}</p>
      </div>
      <div class="border border-stone-200 bg-white p-4">
        <p class="text-xs uppercase tracking-wider text-stone-500">Tidak Hadir</p>
        <p class="font-mono tabular-nums mt-1 text-2xl font-medium text-red-700">{{ data.summary.notAttendingCount }}</p>
      </div>
      <div class="border border-stone-200 bg-white p-4">
        <p class="text-xs uppercase tracking-wider text-stone-500">Belum Konfirmasi</p>
        <p class="font-mono tabular-nums mt-1 text-2xl font-medium text-amber-700">{{ data.summary.pendingGuestCount }}</p>
      </div>
      <div class="border border-stone-200 bg-white p-4 col-span-2 lg:col-span-1">
        <p class="text-xs uppercase tracking-wider text-stone-500">Total Kursi Tamu</p>
        <p class="font-mono tabular-nums mt-1 text-2xl font-medium text-stone-900">{{ data.summary.totalHeadcount }}</p>
      </div>
    </div>

    <!-- Filter & Export Bar -->
    <div class="flex flex-col justify-between gap-4 border border-stone-200 bg-white p-5 sm:flex-row sm:items-center">
      <div class="flex flex-1 flex-wrap items-center gap-3">
        <div class="relative flex-1 min-w-[200px] max-w-sm">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            v-model="search"
            type="search"
            placeholder="Cari nama tamu atau pesan..."
            class="w-full border border-stone-300 py-2 pl-9 pr-3 text-sm focus:border-stone-900 focus:outline-none"
          />
        </div>
        <select
          v-model="statusFilter"
          class="border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-900 focus:outline-none"
        >
          <option value="ALL">Semua Kehadiran</option>
          <option value="ATTENDING">Hadir</option>
          <option value="NOT_ATTENDING">Tidak Hadir</option>
        </select>
      </div>

      <a
        href="/api/v1/admin/rsvps/export"
        download="wedding-rsvps.csv"
        class="inline-flex min-h-[40px] items-center gap-2 border border-stone-900 bg-stone-900 px-4 py-2 text-xs font-medium uppercase tracking-wider text-white hover:bg-stone-800 whitespace-nowrap shrink-0"
      >
        <Download class="h-4 w-4" />
        <span>Export CSV</span>
      </a>
    </div>

    <!-- RSVP Table -->
    <div class="overflow-x-auto border border-stone-200 bg-white">
      <div v-if="loading" class="flex items-center gap-3 p-8 text-sm text-stone-500">
        <Loader2 class="h-5 w-5 animate-spin" />
        <span>Memuat data RSVP...</span>
      </div>

      <div v-else-if="!data || data.items.length === 0" class="p-10 text-center text-sm text-stone-500">
        Belum ada data RSVP.
      </div>

      <table v-else class="w-full border-collapse text-left text-sm">
        <thead>
          <tr class="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
            <th class="px-4 py-3 font-medium">Nama Tamu</th>
            <th class="px-4 py-3 font-medium">Grup</th>
            <th class="px-4 py-3 font-medium">Kehadiran</th>
            <th class="px-4 py-3 font-medium text-right">Jumlah</th>
            <th class="px-4 py-3 font-medium">Catatan</th>
            <th class="px-4 py-3 font-medium text-right">Diperbarui</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-stone-100">
          <tr v-for="item in data.items" :key="item.id" class="hover:bg-stone-50/70">
            <td class="px-4 py-3.5">
              <p class="font-medium text-stone-900">{{ item.guestName }}</p>
              <p v-if="item.guestPhone" class="font-mono text-xs text-stone-500">{{ item.guestPhone }}</p>
            </td>
            <td class="px-4 py-3.5 text-stone-600">{{ item.groupName }}</td>
            <td class="px-4 py-3.5">
              <span
                :class="item.attendanceStatus === 'ATTENDING' ? 'text-emerald-700 font-medium' : 'text-red-700 font-medium'"
                class="text-xs"
              >
                {{ item.attendanceStatus === 'ATTENDING' ? 'Hadir' : 'Tidak Hadir' }}
              </span>
            </td>
            <td class="px-4 py-3.5 text-right font-mono tabular-nums text-stone-800">{{ item.guestCount }}</td>
            <td class="px-4 py-3.5 max-w-xs truncate text-stone-600">{{ item.message || '—' }}</td>
            <td class="px-4 py-3.5 text-right font-mono tabular-nums text-xs text-stone-500">
              {{ formatDate(item.updatedAt) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
