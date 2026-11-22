<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import {
  Copy,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-vue-next';
import { extractApiError } from '@/services/api';
import { adminApi } from '@/services/weddingApi';
import { useToastStore } from '@/stores/toast';
import type { GuestRecordDto, PaginationMeta } from '@/types/wedding';

const toast = useToastStore();
const loading = ref(true);
const guests = ref<GuestRecordDto[]>([]);
const meta = ref<PaginationMeta>({ page: 1, limit: 15, total: 0, totalPages: 1 });
const search = ref('');
const rsvpFilter = ref('ALL');
const whatsappTemplate = ref('');
const coupleNames = ref('Andi & Siti');

const editingId = ref<string | null>(null);
const showForm = ref(false);
const saving = ref(false);
const form = reactive({
  fullName: '',
  phone: '',
  email: '',
  groupName: 'Umum',
  maxGuests: 2,
  notes: '',
});

async function loadGuests(page = 1) {
  loading.value = true;
  try {
    const res = await adminApi.getGuests({
      page,
      limit: 15,
      search: search.value.trim(),
      rsvpStatus: rsvpFilter.value,
    });
    guests.value = res.data;
    meta.value = res.meta;
  } catch (err) {
    toast.push(extractApiError(err, 'Gagal memuat daftar tamu'), 'error');
  } finally {
    loading.value = false;
  }
}

async function loadContext() {
  try {
    const [settings, invBundle] = await Promise.all([
      adminApi.getSettings(),
      adminApi.getInvitationBundle(),
    ]);
    whatsappTemplate.value = settings.whatsappTemplate;
    if (invBundle.couple) {
      coupleNames.value = `${invBundle.couple.groomNickName} & ${invBundle.couple.brideNickName}`;
    }
  } catch {
    // Non-blocking
  }
}

function openCreate() {
  editingId.value = null;
  Object.assign(form, {
    fullName: '',
    phone: '',
    email: '',
    groupName: 'Umum',
    maxGuests: 2,
    notes: '',
  });
  showForm.value = true;
}

function openEdit(guest: GuestRecordDto) {
  editingId.value = guest.id;
  Object.assign(form, {
    fullName: guest.fullName,
    phone: guest.phone,
    email: guest.email,
    groupName: guest.groupName,
    maxGuests: guest.maxGuests,
    notes: guest.notes,
  });
  showForm.value = true;
}

async function saveGuest() {
  saving.value = true;
  try {
    if (editingId.value) {
      await adminApi.updateGuest(editingId.value, { ...form });
      toast.push('Data tamu diperbarui.', 'success');
    } else {
      await adminApi.createGuest({ ...form });
      toast.push('Tamu baru dan tautan personal dibuat.', 'success');
    }
    showForm.value = false;
    await loadGuests(meta.value.page);
  } catch (err) {
    toast.push(extractApiError(err, 'Gagal menyimpan data tamu'), 'error');
  } finally {
    saving.value = false;
  }
}

async function regenerateLink(guest: GuestRecordDto) {
  try {
    const updated = await adminApi.regenerateGuestToken(guest.id);
    guests.value = guests.value.map((g) => (g.id === updated.id ? updated : g));
    toast.push('Tautan personal baru berhasil dibuat.', 'success');
  } catch (err) {
    toast.push(extractApiError(err, 'Gagal memperbarui tautan'), 'error');
  }
}

async function removeGuest(id: string) {
  try {
    await adminApi.deleteGuest(id);
    toast.push('Tamu dihapus.', 'info');
    await loadGuests(meta.value.page);
  } catch (err) {
    toast.push(extractApiError(err, 'Gagal menghapus tamu'), 'error');
  }
}

function getFullInviteUrl(guest: GuestRecordDto): string {
  if (!guest.personalizedPath) return '';
  return `${window.location.origin}${guest.personalizedPath}`;
}

async function copyInviteLink(guest: GuestRecordDto) {
  const url = getFullInviteUrl(guest);
  if (!url) {
    toast.push('Klik perbarui tautan terlebih dahulu untuk membuat link baru.', 'info');
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    toast.push(`Tautan undangan untuk ${guest.fullName} disalin.`, 'success');
  } catch {
    toast.push('Gagal menyalin ke clipboard.', 'error');
  }
}

function getWhatsAppHref(guest: GuestRecordDto): string {
  const url = getFullInviteUrl(guest);
  const template =
    whatsappTemplate.value ||
    'Kepada Yth. {{guest_name}},\n\nKami mengundang Anda ke pernikahan {{couple_names}}.\nBuka undangan personal Anda di:\n{{invite_url}}';
  const message = template
    .replaceAll('{{guest_name}}', guest.fullName)
    .replaceAll('{{couple_names}}', coupleNames.value)
    .replaceAll('{{invite_url}}', url);

  const cleanPhone = guest.phone.replace(/[^\d]/g, '');
  const base = cleanPhone ? `https://wa.me/${cleanPhone}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(message)}`;
}

let searchDebounce: ReturnType<typeof setTimeout> | null = null;
watch([search, rsvpFilter], () => {
  if (searchDebounce) clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    void loadGuests(1);
  }, 250);
});

onMounted(async () => {
  await Promise.all([loadContext(), loadGuests(1)]);
});
</script>

<template>
  <div class="space-y-6">
    <!-- Top Controls -->
    <div class="flex flex-col justify-between gap-4 border border-stone-200 bg-white p-5 sm:flex-row sm:items-center">
      <div class="flex flex-1 flex-wrap items-center gap-3">
        <div class="relative flex-1 min-w-[200px] max-w-sm">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            v-model="search"
            type="search"
            placeholder="Cari nama, grup, atau nomor..."
            class="w-full border border-stone-300 py-2 pl-9 pr-3 text-sm focus:border-stone-900 focus:outline-none"
          />
        </div>
        <select
          v-model="rsvpFilter"
          class="border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-900 focus:outline-none"
        >
          <option value="ALL">Semua Status RSVP</option>
          <option value="ATTENDING">Hadir</option>
          <option value="NOT_ATTENDING">Tidak Hadir</option>
          <option value="PENDING">Belum Konfirmasi</option>
        </select>
      </div>

      <button
        type="button"
        class="inline-flex min-h-[40px] items-center gap-2 bg-stone-900 px-4 py-2 text-xs font-medium uppercase tracking-wider text-white hover:bg-stone-800 cursor-pointer whitespace-nowrap shrink-0"
        @click="openCreate"
      >
        <Plus class="h-4 w-4" />
        <span>Tambah Tamu</span>
      </button>
    </div>

    <!-- Add/Edit Form Drawer -->
    <form
      v-if="showForm"
      class="border border-stone-300 bg-white p-6"
      @submit.prevent="saveGuest"
    >
      <h2 class="font-display text-2xl font-medium text-stone-900">
        {{ editingId ? 'Edit Data Tamu' : 'Tambah Tamu Baru' }}
      </h2>
      <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label class="block text-xs font-medium uppercase text-stone-600">Nama Lengkap</label>
          <input v-model="form.fullName" type="text" required class="mt-1 w-full border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-xs font-medium uppercase text-stone-600">No. WhatsApp (628...)</label>
          <input v-model="form.phone" type="text" placeholder="628123456789" class="mt-1 w-full border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-xs font-medium uppercase text-stone-600">Grup / Kategori</label>
          <input v-model="form.groupName" type="text" class="mt-1 w-full border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-xs font-medium uppercase text-stone-600">Email (Opsional)</label>
          <input v-model="form.email" type="email" class="mt-1 w-full border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-xs font-medium uppercase text-stone-600">Kuota Maksimal Tamu</label>
          <input v-model.number="form.maxGuests" type="number" min="1" max="20" required class="mt-1 w-full border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-xs font-medium uppercase text-stone-600">Catatan</label>
          <input v-model="form.notes" type="text" class="mt-1 w-full border border-stone-300 px-3 py-2 text-sm" />
        </div>
      </div>

      <div class="mt-5 flex justify-end gap-2">
        <button type="button" class="border border-stone-300 px-4 py-2 text-xs text-stone-700 hover:bg-stone-100 cursor-pointer" @click="showForm = false">
          Batal
        </button>
        <button type="submit" :disabled="saving" class="inline-flex items-center gap-2 bg-stone-900 px-5 py-2 text-xs font-medium uppercase text-white hover:bg-stone-800 cursor-pointer">
          <Loader2 v-if="saving" class="h-3.5 w-3.5 animate-spin" />
          <span>Simpan Tamu</span>
        </button>
      </div>
    </form>

    <!-- Guests Table -->
    <div class="overflow-x-auto border border-stone-200 bg-white">
      <div v-if="loading" class="flex items-center gap-3 p-8 text-sm text-stone-500">
        <Loader2 class="h-5 w-5 animate-spin" />
        <span>Memuat daftar tamu...</span>
      </div>

      <div v-else-if="guests.length === 0" class="p-10 text-center text-sm text-stone-500">
        Tidak ada data tamu yang sesuai dengan filter.
      </div>

      <table v-else class="w-full border-collapse text-left text-sm">
        <thead>
          <tr class="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
            <th class="px-4 py-3 font-medium">Nama Tamu</th>
            <th class="px-4 py-3 font-medium">Grup</th>
            <th class="px-4 py-3 font-medium text-right">Kuota</th>
            <th class="px-4 py-3 font-medium">Status RSVP</th>
            <th class="px-4 py-3 font-medium text-right">Tautan &amp; Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-stone-100">
          <tr v-for="guest in guests" :key="guest.id" class="hover:bg-stone-50/70">
            <td class="px-4 py-3.5">
              <p class="font-medium text-stone-900">{{ guest.fullName }}</p>
              <p v-if="guest.phone" class="font-mono text-xs text-stone-500">{{ guest.phone }}</p>
            </td>
            <td class="px-4 py-3.5 text-stone-600">{{ guest.groupName }}</td>
            <td class="px-4 py-3.5 text-right font-mono tabular-nums text-stone-700">{{ guest.maxGuests }}</td>
            <td class="px-4 py-3.5">
              <span
                :class="
                  guest.rsvpStatus === 'ATTENDING'
                    ? 'text-emerald-700 font-medium'
                    : guest.rsvpStatus === 'NOT_ATTENDING'
                      ? 'text-red-700 font-medium'
                      : 'text-stone-500'
                "
                class="text-xs"
              >
                {{
                  guest.rsvpStatus === 'ATTENDING'
                    ? `Hadir (${guest.rsvpGuestCount ?? guest.maxGuests})`
                    : guest.rsvpStatus === 'NOT_ATTENDING'
                      ? 'Tidak Hadir'
                      : 'Belum Konfirmasi'
                }}
              </span>
            </td>
            <td class="px-4 py-3.5">
              <div class="flex items-center justify-end gap-1.5">
                <button
                  v-if="guest.hasActiveLink"
                  type="button"
                  title="Salin tautan personal"
                  class="inline-flex items-center gap-1 border border-stone-300 px-2.5 py-1.5 text-xs text-stone-700 hover:bg-stone-100 cursor-pointer whitespace-nowrap"
                  @click="copyInviteLink(guest)"
                >
                  <Copy class="h-3.5 w-3.5" />
                  <span>Salin</span>
                </button>
                <a
                  v-if="guest.hasActiveLink"
                  :href="getWhatsAppHref(guest)"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Kirim undangan via WhatsApp"
                  class="inline-flex items-center gap-1 border border-emerald-700/30 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100 whitespace-nowrap"
                >
                  <MessageCircle class="h-3.5 w-3.5" />
                  <span>WA</span>
                </a>
                <button
                  type="button"
                  title="Perbarui token link personal"
                  class="border border-stone-300 p-1.5 text-stone-600 hover:bg-stone-100 cursor-pointer"
                  @click="regenerateLink(guest)"
                >
                  <RefreshCw class="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="Edit tamu"
                  class="border border-stone-300 p-1.5 text-stone-600 hover:bg-stone-100 cursor-pointer"
                  @click="openEdit(guest)"
                >
                  <Pencil class="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="Hapus tamu"
                  class="border border-red-200 p-1.5 text-red-700 hover:bg-red-50 cursor-pointer"
                  @click="removeGuest(guest.id)"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div
        v-if="meta.totalPages > 1"
        class="flex items-center justify-between border-t border-stone-200 px-4 py-3 text-xs text-stone-600"
      >
        <span class="tabular-nums">Halaman {{ meta.page }} dari {{ meta.totalPages }} ({{ meta.total }} tamu)</span>
        <div class="flex gap-2">
          <button
            type="button"
            :disabled="meta.page <= 1"
            class="border border-stone-300 px-3 py-1 disabled:opacity-40 cursor-pointer"
            @click="loadGuests(meta.page - 1)"
          >
            Sebelumnya
          </button>
          <button
            type="button"
            :disabled="meta.page >= meta.totalPages"
            class="border border-stone-300 px-3 py-1 disabled:opacity-40 cursor-pointer"
            @click="loadGuests(meta.page + 1)"
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
