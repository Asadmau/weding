<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { Check, Loader2 } from 'lucide-vue-next';
import { extractApiError } from '@/services/api';
import { publicApi } from '@/services/weddingApi';
import { useToastStore } from '@/stores/toast';
import type { PersonalizedGuestContext } from '@/types/wedding';

const props = defineProps<{
  slug: string;
  guestToken?: string | null;
  guestSlug?: string | null;
  guestContext?: PersonalizedGuestContext | null;
  rsvpDeadline?: string;
  accentBgClass?: string;
}>();

const toast = useToastStore();
const submitting = ref(false);
const errorMessage = ref('');
const savedConfirmation = ref<{
  attendanceStatus: 'ATTENDING' | 'NOT_ATTENDING';
  guestCount: number;
  updatedAt: string;
} | null>(null);
const publicEditToken = ref<string | null>(null);

const form = reactive({
  guestName: props.guestContext?.guest.fullName || '',
  guestPhone: '',
  attendanceStatus: (props.guestContext?.rsvp?.attendanceStatus === 'NOT_ATTENDING'
    ? 'NOT_ATTENDING'
    : 'ATTENDING') as 'ATTENDING' | 'NOT_ATTENDING',
  guestCount: props.guestContext?.rsvp?.guestCount || 1,
  message: props.guestContext?.rsvp?.message || '',
});

watch(
  () => props.guestContext,
  (ctx) => {
    if (ctx) {
      form.guestName = ctx.guest.fullName;
      if (ctx.rsvp) {
        form.attendanceStatus =
          ctx.rsvp.attendanceStatus === 'NOT_ATTENDING' ? 'NOT_ATTENDING' : 'ATTENDING';
        form.guestCount = Math.max(1, ctx.rsvp.guestCount || 1);
        form.message = ctx.rsvp.message || '';
        if (ctx.rsvp.attendanceStatus !== 'PENDING') {
          savedConfirmation.value = {
            attendanceStatus:
              ctx.rsvp.attendanceStatus === 'NOT_ATTENDING' ? 'NOT_ATTENDING' : 'ATTENDING',
            guestCount: ctx.rsvp.guestCount,
            updatedAt: ctx.rsvp.updatedAt,
          };
        }
      }
    }
  },
  { immediate: true }
);

const maxGuestOptions = computed(() => {
  const max = props.guestContext?.guest.maxGuests || 5;
  return Array.from({ length: max }, (_, i) => i + 1);
});

const isPersonalized = computed(() => Boolean((props.guestSlug || props.guestToken) && props.guestContext));

async function handleSubmit() {
  errorMessage.value = '';
  if (form.guestName.trim().length < 2) {
    errorMessage.value = 'Mohon masukkan nama lengkap Anda (minimal 2 karakter).';
    return;
  }

  submitting.value = true;
  try {
    const result = await publicApi.submitRsvp({
      slug: props.slug,
      guestToken: props.guestToken || undefined,
      guestSlug: props.guestSlug || undefined,
      editToken: !isPersonalized.value ? publicEditToken.value || undefined : undefined,
      guestName: form.guestName.trim(),
      guestPhone: form.guestPhone.trim(),
      attendanceStatus: form.attendanceStatus,
      guestCount: form.attendanceStatus === 'ATTENDING' ? form.guestCount : 1,
      message: form.message.trim(),
    });

    if (result.editToken) {
      publicEditToken.value = result.editToken;
    }

    savedConfirmation.value = {
      attendanceStatus: result.attendanceStatus,
      guestCount: result.guestCount,
      updatedAt: result.updatedAt,
    };

    toast.push('Konfirmasi kehadiran Anda berhasil disimpan.', 'success');
  } catch (err) {
    errorMessage.value = extractApiError(err, 'Gagal mengirim konfirmasi kehadiran.');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-xl">
    <div
      v-if="savedConfirmation"
      class="mb-6 border border-stone-200 bg-white/80 px-5 py-4 text-sm text-stone-700"
    >
      <div class="flex items-center gap-2 font-medium text-stone-900">
        <Check class="h-4 w-4 text-emerald-700" />
        <span>
          Status RSVP tercatat:
          {{
            savedConfirmation.attendanceStatus === 'ATTENDING'
              ? `Hadir (${savedConfirmation.guestCount} tamu)`
              : 'Berhalangan Hadir'
          }}
        </span>
      </div>
      <p class="mt-1 text-xs text-stone-500">
        Anda dapat memperbarui konfirmasi kehadiran Anda melalui formulir di bawah ini.
      </p>
    </div>

    <form class="space-y-5" @submit.prevent="handleSubmit">
      <div>
        <label for="rsvp-name" class="block text-xs font-medium tracking-wider uppercase text-stone-600">
          Nama Lengkap
        </label>
        <input
          id="rsvp-name"
          v-model="form.guestName"
          type="text"
          required
          :readonly="isPersonalized"
          :class="isPersonalized ? 'bg-stone-100 text-stone-700 cursor-not-allowed' : 'bg-white'"
          class="mt-2 w-full border border-stone-300 px-4 py-3 text-sm text-stone-900 focus:border-stone-800 focus:outline-none"
          placeholder="Nama lengkap Anda"
        />
        <p v-if="isPersonalized" class="mt-1.5 text-xs text-stone-500">
          Terverifikasi melalui tautan undangan personal Anda.
        </p>
      </div>

      <div>
        <span class="block text-xs font-medium tracking-wider uppercase text-stone-600">
          Konfirmasi Kehadiran
        </span>
        <div class="mt-2 grid grid-cols-2 gap-3">
          <button
            type="button"
            :class="
              form.attendanceStatus === 'ATTENDING'
                ? 'border-stone-900 bg-stone-900 text-white'
                : 'border-stone-300 bg-white text-stone-700 hover:border-stone-500'
            "
            class="min-h-[44px] border px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
            @click="form.attendanceStatus = 'ATTENDING'"
          >
            Saya Akan Hadir
          </button>
          <button
            type="button"
            :class="
              form.attendanceStatus === 'NOT_ATTENDING'
                ? 'border-stone-900 bg-stone-900 text-white'
                : 'border-stone-300 bg-white text-stone-700 hover:border-stone-500'
            "
            class="min-h-[44px] border px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
            @click="form.attendanceStatus = 'NOT_ATTENDING'"
          >
            Berhalangan Hadir
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div v-if="form.attendanceStatus === 'ATTENDING'">
          <label for="rsvp-count" class="block text-xs font-medium tracking-wider uppercase text-stone-600">
            Jumlah Tamu
          </label>
          <select
            id="rsvp-count"
            v-model.number="form.guestCount"
            class="mt-2 w-full border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 focus:border-stone-800 focus:outline-none"
          >
            <option v-for="n in maxGuestOptions" :key="n" :value="n">
              {{ n }} Orang
            </option>
          </select>
        </div>

        <div :class="form.attendanceStatus === 'NOT_ATTENDING' ? 'sm:col-span-2' : ''">
          <label for="rsvp-phone" class="block text-xs font-medium tracking-wider uppercase text-stone-600">
            Nomor WhatsApp (Opsional)
          </label>
          <input
            id="rsvp-phone"
            v-model="form.guestPhone"
            type="tel"
            class="mt-2 w-full border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 focus:border-stone-800 focus:outline-none"
            placeholder="0812..."
          />
        </div>
      </div>

      <div>
        <label for="rsvp-message" class="block text-xs font-medium tracking-wider uppercase text-stone-600">
          Catatan untuk Mempelai (Opsional)
        </label>
        <textarea
          id="rsvp-message"
          v-model="form.message"
          rows="3"
          maxlength="500"
          class="mt-2 w-full border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 focus:border-stone-800 focus:outline-none"
          placeholder="Permintaan khusus, alergi makanan, atau pesan singkat..."
        />
      </div>

      <p v-if="errorMessage" class="text-sm text-red-700" role="alert">
        {{ errorMessage }}
      </p>

      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p v-if="rsvpDeadline" class="text-xs text-stone-500">
          Mohon konfirmasi sebelum {{ rsvpDeadline }}
        </p>
        <button
          type="submit"
          :disabled="submitting"
          :class="accentBgClass || 'bg-stone-900 hover:bg-stone-800 text-white'"
          class="inline-flex min-h-[44px] items-center justify-center gap-2 px-7 py-3 text-sm font-medium transition-colors disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
        >
          <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
          <span>{{ savedConfirmation ? 'Perbarui RSVP' : 'Kirim Konfirmasi' }}</span>
        </button>
      </div>
    </form>
  </div>
</template>
