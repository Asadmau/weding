<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ArrowRight, Loader2 } from 'lucide-vue-next';
import { extractApiError } from '@/services/api';
import { adminApi } from '@/services/weddingApi';
import type { AdminDashboardDto } from '@/types/wedding';

const loading = ref(true);
const errorMessage = ref('');
const dashboard = ref<AdminDashboardDto | null>(null);

async function fetchDashboard() {
  loading.value = true;
  errorMessage.value = '';
  try {
    dashboard.value = await adminApi.getDashboard();
  } catch (err) {
    errorMessage.value = extractApiError(err, 'Gagal memuat ringkasan dashboard.');
  } finally {
    loading.value = false;
  }
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

onMounted(fetchDashboard);
</script>

<template>
  <div>
    <div v-if="loading" class="flex items-center gap-3 py-16 text-sm text-stone-500">
      <Loader2 class="h-5 w-5 animate-spin" />
      <span>Memuat statistik undangan...</span>
    </div>

    <div v-else-if="errorMessage" class="border border-red-200 bg-red-50 p-6 text-sm text-red-800">
      {{ errorMessage }}
    </div>

    <div v-else-if="dashboard" class="space-y-8">
      <!-- Top Invitation Banner -->
      <div class="flex flex-col justify-between gap-4 border border-stone-200 bg-white p-6 sm:flex-row sm:items-center">
        <div>
          <p class="text-xs uppercase tracking-widest text-stone-500">
            Undangan Aktif · {{ dashboard.invitation.isPublished ? 'Dipublikasikan' : 'Draft' }}
          </p>
          <h1 class="font-display mt-1 text-3xl font-medium text-stone-900">
            {{ dashboard.invitation.title }}
          </h1>
          <p class="mt-1 text-xs text-stone-500">
            URL Publik: <span class="font-mono text-stone-800">/{{ dashboard.invitation.slug }}</span>
            <span aria-hidden="true"> · </span>
            Template: <span class="font-medium text-stone-800">{{ dashboard.invitation.templateName }}</span>
          </p>
        </div>

        <div class="flex flex-wrap gap-3">
          <router-link
            to="/admin/templates"
            class="inline-flex min-h-[40px] items-center border border-stone-300 px-4 py-2 text-xs font-medium text-stone-800 hover:border-stone-800 whitespace-nowrap"
          >
            Ganti Template
          </router-link>
          <router-link
            to="/admin/guests"
            class="inline-flex min-h-[40px] items-center gap-1.5 bg-stone-900 px-4 py-2 text-xs font-medium text-white hover:bg-stone-800 whitespace-nowrap"
          >
            <span>Kelola Tamu</span>
            <ArrowRight class="h-3.5 w-3.5" />
          </router-link>
        </div>
      </div>

      <!-- KPI Grid -->
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div class="border border-stone-200 bg-white p-5">
          <p class="text-xs uppercase tracking-wider text-stone-500">Total Tamu Terdaftar</p>
          <p class="font-mono tabular-nums mt-2 text-3xl font-medium text-stone-900">
            {{ dashboard.metrics.totalGuests }}
          </p>
          <p class="mt-1 text-xs text-stone-500">
            {{ dashboard.metrics.pendingGuestRsvps }} belum konfirmasi
          </p>
        </div>

        <div class="border border-stone-200 bg-white p-5">
          <p class="text-xs uppercase tracking-wider text-stone-500">Konfirmasi Hadir</p>
          <p class="font-mono tabular-nums mt-2 text-3xl font-medium text-emerald-800">
            {{ dashboard.metrics.attendingCount }}
          </p>
          <p class="mt-1 text-xs text-stone-500 tabular-nums">
            Total {{ dashboard.metrics.totalHeadcount }} estimasi kursi
          </p>
        </div>

        <div class="border border-stone-200 bg-white p-5">
          <p class="text-xs uppercase tracking-wider text-stone-500">Ucapan Menunggu</p>
          <p class="font-mono tabular-nums mt-2 text-3xl font-medium text-amber-700">
            {{ dashboard.metrics.pendingWishes }}
          </p>
          <p class="mt-1 text-xs text-stone-500 tabular-nums">
            {{ dashboard.metrics.approvedWishes }} ucapan disetujui
          </p>
        </div>

        <div class="border border-stone-200 bg-white p-5">
          <p class="text-xs uppercase tracking-wider text-stone-500">Konten Terpasang</p>
          <p class="font-mono tabular-nums mt-2 text-3xl font-medium text-stone-900">
            {{ dashboard.metrics.galleryCount }}
          </p>
          <p class="mt-1 text-xs text-stone-500 tabular-nums">
            Foto galeri · {{ dashboard.metrics.eventsCount }} acara
          </p>
        </div>
      </div>

      <!-- Recent Activity Tables -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section class="border border-stone-200 bg-white">
          <div class="flex items-center justify-between border-b border-stone-200 px-5 py-4">
            <h2 class="text-sm font-semibold text-stone-900">RSVP Terbaru</h2>
            <router-link to="/admin/rsvps" class="text-xs text-stone-600 hover:text-stone-900 hover:underline">
              Lihat Semua
            </router-link>
          </div>
          <div class="divide-y divide-stone-100">
            <div v-if="dashboard.recentRsvps.length === 0" class="p-6 text-center text-sm text-stone-500">
              Belum ada konfirmasi RSVP.
            </div>
            <div
              v-for="rsvp in dashboard.recentRsvps"
              :key="rsvp.id"
              class="flex items-center justify-between px-5 py-3.5 text-sm"
            >
              <div>
                <p class="font-medium text-stone-900">{{ rsvp.guestName }}</p>
                <p class="text-xs text-stone-500">
                  {{ rsvp.attendanceStatus === 'ATTENDING' ? `Hadir (${rsvp.guestCount} orang)` : 'Tidak Hadir' }}
                  · {{ formatDateTime(rsvp.updatedAt) }}
                </p>
              </div>
              <span
                :class="rsvp.attendanceStatus === 'ATTENDING' ? 'text-emerald-700' : 'text-stone-500'"
                class="text-xs font-medium"
              >
                {{ rsvp.attendanceStatus === 'ATTENDING' ? 'Hadir' : 'Berhalangan' }}
              </span>
            </div>
          </div>
        </section>

        <section class="border border-stone-200 bg-white">
          <div class="flex items-center justify-between border-b border-stone-200 px-5 py-4">
            <h2 class="text-sm font-semibold text-stone-900">Ucapan Terbaru</h2>
            <router-link to="/admin/wishes" class="text-xs text-stone-600 hover:text-stone-900 hover:underline">
              Moderasi
            </router-link>
          </div>
          <div class="divide-y divide-stone-100">
            <div v-if="dashboard.recentWishes.length === 0" class="p-6 text-center text-sm text-stone-500">
              Belum ada ucapan masuk.
            </div>
            <div
              v-for="wish in dashboard.recentWishes"
              :key="wish.id"
              class="px-5 py-3.5 text-sm"
            >
              <div class="flex items-center justify-between gap-3">
                <p class="font-medium text-stone-900">{{ wish.authorName }}</p>
                <span
                  :class="
                    wish.status === 'APPROVED'
                      ? 'text-emerald-700'
                      : wish.status === 'REJECTED'
                        ? 'text-red-700'
                        : 'text-amber-700'
                  "
                  class="text-xs font-medium"
                >
                  {{ wish.status }}
                </span>
              </div>
              <p class="mt-1 line-clamp-2 text-xs text-stone-600">{{ wish.message }}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
