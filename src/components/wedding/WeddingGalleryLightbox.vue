<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { ChevronLeft, ChevronRight, ImageOff, X } from 'lucide-vue-next';
import type { GalleryItemDto } from '@/types/wedding';

const props = defineProps<{
  items: GalleryItemDto[];
}>();

const activeIndex = ref<number | null>(null);
const brokenMap = ref<Record<string, boolean>>({});

function openLightbox(index: number) {
  activeIndex.value = index;
}

function closeLightbox() {
  activeIndex.value = null;
}

function prev() {
  if (activeIndex.value === null || props.items.length === 0) return;
  activeIndex.value = (activeIndex.value - 1 + props.items.length) % props.items.length;
}

function next() {
  if (activeIndex.value === null || props.items.length === 0) return;
  activeIndex.value = (activeIndex.value + 1) % props.items.length;
}

function onKeydown(e: KeyboardEvent) {
  if (activeIndex.value === null) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') prev();
  if (e.key === 'ArrowRight') next();
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onUnmounted(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <div>
    <div v-if="items.length === 0" class="border border-stone-200 py-12 text-center text-sm text-stone-500">
      Belum ada foto galeri yang ditambahkan.
    </div>

    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <button
        v-for="(item, idx) in items"
        :key="item.id"
        type="button"
        class="group relative aspect-[4/3] overflow-hidden bg-stone-100 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-800 cursor-pointer"
        @click="openLightbox(idx)"
      >
        <img
          v-if="!brokenMap[item.id]"
          :src="item.imageUrl"
          :alt="item.title"
          referrerpolicy="no-referrer"
          loading="lazy"
          class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          @error="brokenMap[item.id] = true"
        />
        <div
          v-else
          class="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 p-4 text-center text-stone-500"
        >
          <ImageOff class="h-6 w-6 opacity-50" />
          <span class="mt-2 text-xs font-medium">{{ item.title }}</span>
        </div>

        <div
          class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        >
          <p class="text-sm font-medium text-white">{{ item.title }}</p>
          <p v-if="item.caption" class="mt-0.5 text-xs text-stone-200">{{ item.caption }}</p>
        </div>
      </button>
    </div>

    <!-- Lightbox Modal -->
    <div
      v-if="activeIndex !== null && items[activeIndex]"
      class="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/92 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Galeri Foto"
      @click.self="closeLightbox"
    >
      <button
        type="button"
        aria-label="Tutup galeri"
        class="absolute top-4 right-4 flex h-11 w-11 items-center justify-center bg-white/10 text-white transition-colors hover:bg-white/20 cursor-pointer"
        @click="closeLightbox"
      >
        <X class="h-5 w-5" />
      </button>

      <button
        v-if="items.length > 1"
        type="button"
        aria-label="Foto sebelumnya"
        class="absolute left-3 sm:left-6 flex h-11 w-11 items-center justify-center bg-white/10 text-white transition-colors hover:bg-white/20 cursor-pointer"
        @click="prev"
      >
        <ChevronLeft class="h-6 w-6" />
      </button>

      <div class="flex max-h-[85vh] max-w-4xl flex-col items-center">
        <img
          :src="items[activeIndex].imageUrl"
          :alt="items[activeIndex].title"
          referrerpolicy="no-referrer"
          class="max-h-[72vh] w-auto object-contain"
        />
        <div class="mt-4 text-center text-white">
          <p class="font-display text-xl">{{ items[activeIndex].title }}</p>
          <p v-if="items[activeIndex].caption" class="mt-1 text-sm text-stone-300">
            {{ items[activeIndex].caption }}
          </p>
          <p class="mt-2 font-mono text-xs tabular-nums text-stone-400">
            {{ activeIndex + 1 }} / {{ items.length }}
          </p>
        </div>
      </div>

      <button
        v-if="items.length > 1"
        type="button"
        aria-label="Foto berikutnya"
        class="absolute right-3 sm:right-6 flex h-11 w-11 items-center justify-center bg-white/10 text-white transition-colors hover:bg-white/20 cursor-pointer"
        @click="next"
      >
        <ChevronRight class="h-6 w-6" />
      </button>
    </div>
  </div>
</template>
