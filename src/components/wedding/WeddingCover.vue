<script setup lang="ts">
import { computed, ref } from 'vue';
import { MailOpen } from 'lucide-vue-next';

const props = defineProps<{
  groomName: string;
  brideName: string;
  primaryDate: string;
  heroImageUrl: string;
  guestName?: string | null;
  guestGroup?: string | null;
  theme?: 'classic' | 'botanical' | 'minimalist';
}>();

const emit = defineEmits<{
  open: [];
}>();

const imageFailed = ref(false);

const formattedDate = computed(() => {
  if (!props.primaryDate) return '';
  const d = new Date(props.primaryDate);
  if (Number.isNaN(d.getTime())) return props.primaryDate;
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
});

const buttonClass = computed(() => {
  if (props.theme === 'botanical') {
    return 'bg-[#3D5241] text-[#FBF9F5] hover:bg-[#2F4132] border border-[#3D5241]';
  }
  if (props.theme === 'minimalist') {
    return 'bg-stone-900 text-stone-50 hover:bg-stone-800 border border-stone-900';
  }
  return 'bg-[#9A7B4F] text-[#FBF9F5] hover:bg-[#82663F] border border-[#9A7B4F]';
});
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-stone-950 text-stone-100"
    role="dialog"
    aria-modal="true"
    aria-label="Sampul Undangan Pernikahan"
  >
    <img
      v-if="heroImageUrl && !imageFailed"
      :src="heroImageUrl"
      :alt="`${groomName} dan ${brideName}`"
      referrerpolicy="no-referrer"
      class="absolute inset-0 h-full w-full object-cover opacity-55"
      @error="imageFailed = true"
    />
    <div
      class="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/55 to-stone-950/70"
    />

    <div class="relative z-10 mx-auto flex max-w-2xl flex-col items-center px-6 text-center">
      <p class="text-xs tracking-[0.28em] uppercase text-stone-300">
        Undangan Pernikahan
      </p>

      <h1 class="font-display text-balance mt-5 text-5xl font-medium tracking-tight text-white sm:text-7xl">
        {{ groomName }} <span class="italic font-normal text-stone-300">&amp;</span> {{ brideName }}
      </h1>

      <p class="mt-4 text-sm tracking-widest text-stone-300">
        {{ formattedDate }}
      </p>

      <div
        v-if="guestName"
        class="mt-10 w-full max-w-md border-y border-white/20 py-5"
      >
        <p class="text-xs tracking-[0.2em] uppercase text-stone-300">
          Kepada Yth. Bapak/Ibu/Saudara/i
        </p>
        <p class="font-display mt-2 text-2xl font-medium text-white sm:text-3xl">
          {{ guestName }}
        </p>
        <p v-if="guestGroup" class="mt-1 text-xs text-stone-300">
          {{ guestGroup }}
        </p>
      </div>

      <p v-else class="mt-8 max-w-md text-sm leading-relaxed text-stone-300">
        Dengan penuh rasa syukur, kami mengundang Anda untuk merayakan hari bahagia kami.
      </p>

      <button
        type="button"
        :class="buttonClass"
        class="mt-10 inline-flex min-h-[44px] items-center gap-2.5 px-7 py-3 text-sm font-medium tracking-wide transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white whitespace-nowrap shrink-0 cursor-pointer"
        @click="emit('open')"
      >
        <MailOpen class="h-4 w-4" />
        <span>Buka Undangan</span>
      </button>
    </div>
  </div>
</template>
