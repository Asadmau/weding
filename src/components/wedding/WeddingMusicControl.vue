<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { Music, Pause, Share2, Volume2, VolumeX } from 'lucide-vue-next';
import { useToastStore } from '@/stores/toast';

const props = defineProps<{
  musicEnabled: boolean;
  musicUrl: string;
  musicTitle: string;
  coupleNames: string;
  slug: string;
}>();

const toast = useToastStore();
const isPlaying = ref(false);
const audioEl = ref<HTMLAudioElement | null>(null);

// Gentle ambient Web Audio chime/arpeggio synthesizer fallback when no external MP3 URL is set
let audioCtx: AudioContext | null = null;
let synthTimer: ReturnType<typeof setInterval> | null = null;
let noteIndex = 0;
const scaleHz = [261.63, 329.63, 392.0, 493.88, 523.25, 493.88, 392.0, 329.63]; // Cmaj7 arpeggio

function playSoftNote() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = scaleHz[noteIndex % scaleHz.length];
  noteIndex += 1;

  const now = audioCtx.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.035, now + 0.15);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 2.3);
}

function startPlayback() {
  if (!props.musicEnabled) return;
  if (props.musicUrl && audioEl.value) {
    audioEl.value.play().then(() => {
      isPlaying.value = true;
    }).catch(() => {
      isPlaying.value = false;
    });
    return;
  }

  try {
    if (!audioCtx) {
      audioCtx = new window.AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }
    playSoftNote();
    if (!synthTimer) {
      synthTimer = setInterval(playSoftNote, 1400);
    }
    isPlaying.value = true;
  } catch {
    isPlaying.value = false;
  }
}

function stopPlayback() {
  if (audioEl.value) {
    audioEl.value.pause();
  }
  if (synthTimer) {
    clearInterval(synthTimer);
    synthTimer = null;
  }
  isPlaying.value = false;
}

function toggleMusic() {
  if (isPlaying.value) {
    stopPlayback();
  } else {
    startPlayback();
  }
}

const whatsappHref = computed(() => {
  const url = `${window.location.origin}/${props.slug}`;
  const text = `Undangan Pernikahan ${props.coupleNames}\n\nBuka undangan lengkap di:\n${url}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
});

async function copyCurrentUrl() {
  try {
    await navigator.clipboard.writeText(window.location.href);
    toast.push('Tautan undangan disalin ke clipboard', 'success');
  } catch {
    toast.push('Tidak dapat menyalin tautan otomatis', 'error');
  }
}

watch(
  () => props.musicUrl,
  () => {
    stopPlayback();
  }
);

onUnmounted(() => {
  stopPlayback();
  if (audioCtx) {
    void audioCtx.close();
    audioCtx = null;
  }
});

defineExpose({
  startPlayback,
  stopPlayback,
});
</script>

<template>
  <div class="fixed bottom-4 right-4 z-40 flex items-center gap-2">
    <audio v-if="musicUrl" ref="audioEl" :src="musicUrl" loop preload="none" />

    <button
      v-if="musicEnabled"
      type="button"
      :aria-label="isPlaying ? 'Jeda musik latar' : 'Putar musik latar'"
      :title="musicTitle || 'Musik Latar'"
      class="inline-flex h-11 items-center gap-2 border border-stone-300 bg-white/95 px-3.5 text-xs font-medium text-stone-800 shadow-sm backdrop-blur transition-colors hover:bg-stone-100 cursor-pointer whitespace-nowrap"
      @click="toggleMusic"
    >
      <Volume2 v-if="isPlaying" class="h-4 w-4 text-stone-800" />
      <VolumeX v-else-if="!isPlaying && musicUrl" class="h-4 w-4 text-stone-500" />
      <Pause v-if="isPlaying" class="h-3.5 w-3.5 hidden sm:inline" />
      <Music v-else class="h-4 w-4 text-stone-600" />
      <span class="hidden sm:inline max-w-[140px] truncate">
        {{ isPlaying ? (musicTitle || 'Musik Aktif') : 'Putar Musik' }}
      </span>
    </button>

    <a
      :href="whatsappHref"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Bagikan ke WhatsApp"
      class="inline-flex h-11 items-center gap-2 border border-stone-300 bg-white/95 px-3.5 text-xs font-medium text-stone-800 shadow-sm backdrop-blur transition-colors hover:bg-stone-100 whitespace-nowrap"
      @contextmenu.prevent="copyCurrentUrl"
    >
      <Share2 class="h-4 w-4 text-stone-700" />
      <span class="hidden sm:inline">Bagikan</span>
    </a>
  </div>
</template>
