<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { Loader2, Send } from 'lucide-vue-next';
import { extractApiError } from '@/services/api';
import { publicApi } from '@/services/weddingApi';
import { useToastStore } from '@/stores/toast';
import type { PublicWishDto } from '@/types/wedding';

const props = defineProps<{
  slug: string;
  guestToken?: string | null;
  guestSlug?: string | null;
  defaultAuthorName?: string;
  wishes: PublicWishDto[];
  accentBgClass?: string;
}>();

const emit = defineEmits<{
  wishApproved: [wish: PublicWishDto];
}>();

const toast = useToastStore();
const submitting = ref(false);
const errorMessage = ref('');
const statusNotice = ref('');

const form = reactive({
  authorName: props.defaultAuthorName || '',
  relationLabel: '',
  message: '',
});

watch(
  () => props.defaultAuthorName,
  (val) => {
    if (val && !form.authorName) {
      form.authorName = val;
    }
  }
);

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

async function handleSubmit() {
  errorMessage.value = '';
  statusNotice.value = '';
  if (form.authorName.trim().length < 2) {
    errorMessage.value = 'Nama pengirim minimal 2 karakter.';
    return;
  }
  if (form.message.trim().length < 3) {
    errorMessage.value = 'Ucapan & doa minimal 3 karakter.';
    return;
  }

  submitting.value = true;
  try {
    const res = await publicApi.submitWish({
      slug: props.slug,
      guestToken: props.guestToken || undefined,
      guestSlug: props.guestSlug || undefined,
      authorName: form.authorName.trim(),
      relationLabel: form.relationLabel.trim(),
      message: form.message.trim(),
    });

    if (res.data.status === 'APPROVED') {
      emit('wishApproved', {
        id: res.data.id,
        authorName: res.data.authorName,
        relationLabel: res.data.relationLabel,
        message: res.data.message,
        createdAt: res.data.createdAt,
      });
      statusNotice.value = 'Ucapan Anda telah dipublikasikan di bawah.';
      toast.push('Ucapan Anda berhasil dipublikasikan.', 'success');
    } else {
      statusNotice.value =
        'Terima kasih! Ucapan Anda telah tersimpan dan akan tampil setelah disetujui oleh admin.';
      toast.push('Ucapan terkirim untuk moderasi.', 'info');
    }

    form.message = '';
    form.relationLabel = '';
  } catch (err) {
    errorMessage.value = extractApiError(err, 'Gagal mengirim ucapan.');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <form
      class="border border-stone-200 bg-white/75 p-6 sm:p-8"
      @submit.prevent="handleSubmit"
    >
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label for="wish-name" class="block text-xs font-medium tracking-wider uppercase text-stone-600">
            Nama Anda
          </label>
          <input
            id="wish-name"
            v-model="form.authorName"
            type="text"
            required
            class="mt-2 w-full border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-stone-800 focus:outline-none"
            placeholder="Nama lengkap"
          />
        </div>

        <div>
          <label for="wish-relation" class="block text-xs font-medium tracking-wider uppercase text-stone-600">
            Hubungan (Opsional)
          </label>
          <input
            id="wish-relation"
            v-model="form.relationLabel"
            type="text"
            class="mt-2 w-full border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-stone-800 focus:outline-none"
            placeholder="Sahabat, Keluarga, Rekan Kerja"
          />
        </div>
      </div>

      <div class="mt-4">
        <label for="wish-message" class="block text-xs font-medium tracking-wider uppercase text-stone-600">
          Ucapan &amp; Doa Restu
        </label>
        <textarea
          id="wish-message"
          v-model="form.message"
          rows="3"
          required
          maxlength="800"
          class="mt-2 w-full border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 focus:border-stone-800 focus:outline-none"
          placeholder="Tuliskan doa dan harapan terbaik Anda untuk kedua mempelai..."
        />
      </div>

      <p v-if="errorMessage" class="mt-3 text-sm text-red-700" role="alert">
        {{ errorMessage }}
      </p>
      <p v-if="statusNotice" class="mt-3 text-sm text-emerald-800" role="status">
        {{ statusNotice }}
      </p>

      <div class="mt-5 flex justify-end">
        <button
          type="submit"
          :disabled="submitting"
          :class="accentBgClass || 'bg-stone-900 hover:bg-stone-800 text-white'"
          class="inline-flex min-h-[44px] items-center gap-2 px-6 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 cursor-pointer whitespace-nowrap"
        >
          <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
          <Send v-else class="h-4 w-4" />
          <span>Kirim Ucapan</span>
        </button>
      </div>
    </form>

    <!-- Approved Wishes Feed -->
    <div class="mt-10 divide-y divide-stone-200 border-t border-stone-200">
      <div
        v-if="wishes.length === 0"
        class="py-10 text-center text-sm text-stone-500"
      >
        Jadilah yang pertama memberikan ucapan dan doa restu.
      </div>

      <article
        v-for="wish in wishes"
        :key="wish.id"
        class="py-6"
      >
        <p class="font-editorial text-base leading-relaxed text-stone-800">
          “{{ wish.message }}”
        </p>
        <div class="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-stone-500">
          <span class="font-medium text-stone-800">{{ wish.authorName }}</span>
          <template v-if="wish.relationLabel">
            <span aria-hidden="true">·</span>
            <span>{{ wish.relationLabel }}</span>
          </template>
          <template v-if="formatDate(wish.createdAt)">
            <span aria-hidden="true">·</span>
            <span>{{ formatDate(wish.createdAt) }}</span>
          </template>
        </div>
      </article>
    </div>
  </div>
</template>
