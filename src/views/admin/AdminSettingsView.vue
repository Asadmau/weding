<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { Loader2, Pencil, Plus, Save, Trash2 } from 'lucide-vue-next';
import { extractApiError } from '@/services/api';
import { adminApi } from '@/services/weddingApi';
import { useToastStore } from '@/stores/toast';
import type { GiftAccountDto } from '@/types/wedding';

const toast = useToastStore();
const loading = ref(true);
const savingSettings = ref(false);
const gifts = ref<GiftAccountDto[]>([]);
const editingGiftId = ref<string | null>(null);

const giftForm = reactive({
  bankName: '',
  accountNumber: '',
  accountHolder: '',
  qrImageUrl: '',
  notes: '',
  sortOrder: 0,
  isActive: true,
});

const settingsForm = reactive({
  rsvpEnabled: true,
  rsvpDeadline: '',
  wishesEnabled: true,
  wishesAutoApprove: false,
  giftsEnabled: true,
  musicEnabled: true,
  galleryEnabled: true,
  loveStoryEnabled: true,
  whatsappTemplate: '',
  footerText: '',
});

async function loadAll() {
  loading.value = true;
  try {
    const [g, s] = await Promise.all([adminApi.getGifts(), adminApi.getSettings()]);
    gifts.value = g;
    Object.assign(settingsForm, s);
  } catch (err) {
    toast.push(extractApiError(err, 'Gagal memuat pengaturan'), 'error');
  } finally {
    loading.value = false;
  }
}

function resetGiftForm() {
  editingGiftId.value = null;
  Object.assign(giftForm, {
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    qrImageUrl: '',
    notes: '',
    sortOrder: gifts.value.length + 1,
    isActive: true,
  });
}

function editGift(g: GiftAccountDto) {
  editingGiftId.value = g.id;
  Object.assign(giftForm, {
    bankName: g.bankName,
    accountNumber: g.accountNumber,
    accountHolder: g.accountHolder,
    qrImageUrl: g.qrImageUrl,
    notes: g.notes,
    sortOrder: g.sortOrder ?? 0,
    isActive: g.isActive ?? true,
  });
}

async function saveGift() {
  try {
    if (editingGiftId.value) {
      await adminApi.updateGift(editingGiftId.value, { ...giftForm });
      toast.push('Rekening hadiah diperbarui.', 'success');
    } else {
      await adminApi.createGift({ ...giftForm });
      toast.push('Rekening hadiah ditambahkan.', 'success');
    }
    resetGiftForm();
    gifts.value = await adminApi.getGifts();
  } catch (err) {
    toast.push(extractApiError(err, 'Gagal menyimpan rekening'), 'error');
  }
}

async function removeGift(id: string) {
  try {
    await adminApi.deleteGift(id);
    gifts.value = gifts.value.filter((g) => g.id !== id);
    toast.push('Rekening hadiah dihapus.', 'info');
  } catch (err) {
    toast.push(extractApiError(err, 'Gagal menghapus rekening'), 'error');
  }
}

async function saveSettings() {
  savingSettings.value = true;
  try {
    await adminApi.updateSettings({ ...settingsForm });
    toast.push('Pengaturan situs berhasil disimpan.', 'success');
  } catch (err) {
    toast.push(extractApiError(err, 'Gagal menyimpan pengaturan'), 'error');
  } finally {
    savingSettings.value = false;
  }
}

onMounted(loadAll);
</script>

<template>
  <div class="space-y-8">
    <div v-if="loading" class="flex items-center gap-3 py-12 text-sm text-stone-500">
      <Loader2 class="h-5 w-5 animate-spin" />
      <span>Memuat pengaturan...</span>
    </div>

    <template v-else>
      <!-- Digital Gifts CRUD -->
      <section class="border border-stone-200 bg-white p-6 sm:p-8">
        <h1 class="font-display text-2xl font-medium text-stone-900">Rekening Hadiah Digital</h1>
        <p class="mt-1 text-xs text-stone-500">Kelola nomor rekening atau e-wallet untuk fitur Kado Digital.</p>

        <div class="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <form class="space-y-4 lg:col-span-5" @submit.prevent="saveGift">
            <div>
              <label class="block text-xs font-medium uppercase text-stone-600">Nama Bank / E-Wallet</label>
              <input v-model="giftForm.bankName" type="text" required placeholder="Bank BCA" class="mt-1 w-full border border-stone-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-xs font-medium uppercase text-stone-600">Nomor Rekening</label>
              <input v-model="giftForm.accountNumber" type="text" required class="mt-1 w-full border border-stone-300 px-3 py-2 font-mono text-sm" />
            </div>
            <div>
              <label class="block text-xs font-medium uppercase text-stone-600">Atas Nama</label>
              <input v-model="giftForm.accountHolder" type="text" required class="mt-1 w-full border border-stone-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-xs font-medium uppercase text-stone-600">Catatan</label>
              <input v-model="giftForm.notes" type="text" class="mt-1 w-full border border-stone-300 px-3 py-2 text-sm" />
            </div>
            <label class="flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
              <input v-model="giftForm.isActive" type="checkbox" class="h-4 w-4 accent-stone-900" />
              <span>Tampilkan di Undangan</span>
            </label>

            <div class="flex gap-2">
              <button type="submit" class="inline-flex min-h-[40px] items-center gap-1.5 bg-stone-900 px-5 py-2 text-xs font-medium uppercase text-white hover:bg-stone-800 cursor-pointer">
                <Plus class="h-3.5 w-3.5" />
                <span>{{ editingGiftId ? 'Perbarui Rekening' : 'Tambah Rekening' }}</span>
              </button>
              <button v-if="editingGiftId" type="button" class="border border-stone-300 px-4 py-2 text-xs text-stone-700 hover:bg-stone-100 cursor-pointer" @click="resetGiftForm">
                Batal
              </button>
            </div>
          </form>

          <div class="space-y-3 lg:col-span-7">
            <div v-if="gifts.length === 0" class="border border-stone-200 p-8 text-center text-sm text-stone-500">
              Belum ada rekening yang ditambahkan.
            </div>
            <article
              v-for="gift in gifts"
              :key="gift.id"
              class="flex items-center justify-between gap-4 border border-stone-200 p-4"
            >
              <div>
                <p class="text-xs uppercase tracking-wider text-stone-500">
                  {{ gift.bankName }} · {{ gift.isActive ? 'Aktif' : 'Nonaktif' }}
                </p>
                <p class="font-mono mt-1 text-base font-medium text-stone-900">{{ gift.accountNumber }}</p>
                <p class="text-xs text-stone-600">a.n. {{ gift.accountHolder }}</p>
              </div>
              <div class="flex gap-2">
                <button type="button" class="border border-stone-300 p-2 text-stone-700 hover:bg-stone-100 cursor-pointer" aria-label="Edit rekening" @click="editGift(gift)">
                  <Pencil class="h-4 w-4" />
                </button>
                <button type="button" class="border border-red-200 p-2 text-red-700 hover:bg-red-50 cursor-pointer" aria-label="Hapus rekening" @click="removeGift(gift.id)">
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </article>
          </div>
        </div>
      </section>

      <!-- Site Settings Form -->
      <section class="border border-stone-200 bg-white p-6 sm:p-8">
        <h2 class="font-display text-2xl font-medium text-stone-900">Pengaturan Fitur &amp; WhatsApp Template</h2>
        <form class="mt-6 space-y-6" @submit.prevent="saveSettings">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label class="flex items-center gap-2.5 border border-stone-200 p-3.5 text-sm cursor-pointer">
              <input v-model="settingsForm.rsvpEnabled" type="checkbox" class="h-4 w-4 accent-stone-900" />
              <span>Aktifkan Formulir RSVP</span>
            </label>
            <label class="flex items-center gap-2.5 border border-stone-200 p-3.5 text-sm cursor-pointer">
              <input v-model="settingsForm.wishesEnabled" type="checkbox" class="h-4 w-4 accent-stone-900" />
              <span>Aktifkan Buku Ucapan</span>
            </label>
            <label class="flex items-center gap-2.5 border border-stone-200 p-3.5 text-sm cursor-pointer">
              <input v-model="settingsForm.wishesAutoApprove" type="checkbox" class="h-4 w-4 accent-stone-900" />
              <span>Setujui Ucapan Otomatis</span>
            </label>
            <label class="flex items-center gap-2.5 border border-stone-200 p-3.5 text-sm cursor-pointer">
              <input v-model="settingsForm.giftsEnabled" type="checkbox" class="h-4 w-4 accent-stone-900" />
              <span>Tampilkan Kado Digital</span>
            </label>
            <label class="flex items-center gap-2.5 border border-stone-200 p-3.5 text-sm cursor-pointer">
              <input v-model="settingsForm.galleryEnabled" type="checkbox" class="h-4 w-4 accent-stone-900" />
              <span>Tampilkan Galeri Foto</span>
            </label>
            <label class="flex items-center gap-2.5 border border-stone-200 p-3.5 text-sm cursor-pointer">
              <input v-model="settingsForm.loveStoryEnabled" type="checkbox" class="h-4 w-4 accent-stone-900" />
              <span>Tampilkan Kisah Cinta</span>
            </label>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-medium uppercase text-stone-600">Batas Tanggal RSVP</label>
              <input v-model="settingsForm.rsvpDeadline" type="text" placeholder="2027-06-01" class="mt-1 w-full border border-stone-300 px-3.5 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-xs font-medium uppercase text-stone-600">Teks Footer Undangan</label>
              <input v-model="settingsForm.footerText" type="text" class="mt-1 w-full border border-stone-300 px-3.5 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium uppercase text-stone-600">
              Template Pesan WhatsApp (Variabel: {{ '{' + '{guest_name}' + '}' }}, {{ '{' + '{couple_names}' + '}' }}, {{ '{' + '{invite_url}' + '}' }})
            </label>
            <textarea v-model="settingsForm.whatsappTemplate" rows="5" class="mt-1.5 w-full border border-stone-300 px-3.5 py-2 font-mono text-xs leading-relaxed" />
          </div>

          <div class="flex justify-end">
            <button
              type="submit"
              :disabled="savingSettings"
              class="inline-flex min-h-[42px] items-center gap-2 bg-stone-900 px-6 py-2 text-xs font-medium uppercase tracking-wider text-white hover:bg-stone-800 disabled:opacity-60 cursor-pointer"
            >
              <Loader2 v-if="savingSettings" class="h-4 w-4 animate-spin" />
              <Save v-else class="h-4 w-4" />
              <span>Simpan Pengaturan</span>
            </button>
          </div>
        </form>
      </section>
    </template>
  </div>
</template>
