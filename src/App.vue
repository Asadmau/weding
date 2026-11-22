<script setup lang="ts">
import { X } from 'lucide-vue-next';
import { useToastStore } from '@/stores/toast';

const toastStore = useToastStore();
</script>

<template>
  <router-view />

  <!-- Non-intrusive Toast Notifications -->
  <div
    aria-live="polite"
    class="fixed top-4 right-4 z-[60] flex max-w-sm flex-col gap-2"
  >
    <div
      v-for="item in toastStore.toasts"
      :key="item.id"
      :class="
        item.type === 'error'
          ? 'border-red-300 bg-red-50 text-red-900'
          : item.type === 'info'
            ? 'border-stone-300 bg-white text-stone-900'
            : 'border-emerald-300 bg-emerald-50 text-emerald-950'
      "
      class="flex items-center justify-between gap-3 border px-4 py-3 text-xs font-medium shadow-sm"
    >
      <span>{{ item.message }}</span>
      <button
        type="button"
        aria-label="Tutup notifikasi"
        class="opacity-70 hover:opacity-100 cursor-pointer"
        @click="toastStore.dismiss(item.id)"
      >
        <X class="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
</template>
