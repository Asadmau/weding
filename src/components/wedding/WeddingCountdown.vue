<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

const props = defineProps<{
  targetIso: string;
  accentClass?: string;
  borderClass?: string;
}>();

const nowMs = ref(Date.now());
let timer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  timer = setInterval(() => {
    nowMs.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

const remaining = computed(() => {
  const target = new Date(props.targetIso).getTime();
  if (Number.isNaN(target)) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, passed: false };
  }
  const diff = target - nowMs.value;
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, passed: true };
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds, passed: false };
});

function pad(val: number): string {
  return String(val).padStart(2, '0');
}
</script>

<template>
  <div class="w-full">
    <div
      v-if="remaining.passed"
      class="py-6 text-center font-editorial text-lg italic text-stone-600"
    >
      Hari bahagia telah tiba. Terima kasih atas doa restu Anda.
    </div>
    <div v-else class="grid grid-cols-4 gap-3 sm:gap-6">
      <div
        v-for="unit in [
          { label: 'Hari', value: String(remaining.days) },
          { label: 'Jam', value: pad(remaining.hours) },
          { label: 'Menit', value: pad(remaining.minutes) },
          { label: 'Detik', value: pad(remaining.seconds) },
        ]"
        :key="unit.label"
        :class="borderClass || 'border-stone-200'"
        class="flex flex-col items-center border py-4 sm:py-6"
      >
        <span
          :class="accentClass || 'text-stone-900'"
          class="font-display tabular-nums text-3xl font-medium sm:text-5xl"
        >
          {{ unit.value }}
        </span>
        <span class="mt-1.5 text-xs tracking-widest uppercase text-stone-500">
          {{ unit.label }}
        </span>
      </div>
    </div>
  </div>
</template>
