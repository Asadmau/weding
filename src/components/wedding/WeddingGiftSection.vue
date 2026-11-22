<script setup lang="ts">
import { ref } from 'vue';
import { Check, Copy } from 'lucide-vue-next';
import { useToastStore } from '@/stores/toast';
import type { GiftAccountDto } from '@/types/wedding';

defineProps<{
  accounts: GiftAccountDto[];
}>();

const toast = useToastStore();
const copiedId = ref<string | null>(null);

async function copyAccount(item: GiftAccountDto) {
  try {
    await navigator.clipboard.writeText(item.accountNumber);
    copiedId.value = item.id;
    toast.push(`Nomor rekening ${item.bankName} disalin`, 'success');
    setTimeout(() => {
      if (copiedId.value === item.id) {
        copiedId.value = null;
      }
    }, 2400);
  } catch {
    toast.push('Gagal menyalin nomor rekening. Silakan salin manual.', 'error');
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <div v-if="accounts.length === 0" class="py-8 text-center text-sm text-stone-500">
      Tidak ada rekening tanda kasih yang aktif.
    </div>

    <div v-else class="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <div
        v-for="item in accounts"
        :key="item.id"
        class="flex flex-col justify-between border border-stone-200 bg-white/80 p-6"
      >
        <div>
          <p class="text-xs tracking-widest uppercase text-stone-500">
            {{ item.bankName }}
          </p>
          <p class="font-mono tabular-nums mt-3 text-xl font-medium tracking-wide text-stone-900">
            {{ item.accountNumber }}
          </p>
          <p class="mt-1.5 text-sm text-stone-700">
            a.n. {{ item.accountHolder }}
          </p>
          <p v-if="item.notes" class="mt-3 text-xs leading-relaxed text-stone-500">
            {{ item.notes }}
          </p>
        </div>

        <button
          type="button"
          class="mt-6 inline-flex min-h-[42px] items-center justify-center gap-2 border border-stone-300 bg-stone-50 px-4 py-2 text-xs font-medium tracking-wide text-stone-800 transition-colors hover:border-stone-800 hover:bg-stone-100 cursor-pointer whitespace-nowrap"
          @click="copyAccount(item)"
        >
          <Check v-if="copiedId === item.id" class="h-3.5 w-3.5 text-emerald-700" />
          <Copy v-else class="h-3.5 w-3.5" />
          <span>{{ copiedId === item.id ? 'Nomor Tersalin' : 'Salin Nomor Rekening' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
