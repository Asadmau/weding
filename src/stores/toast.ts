import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface ToastItem {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<ToastItem[]>([]);
  let counter = 0;

  function push(message: string, type: ToastItem['type'] = 'success', durationMs = 3600) {
    const id = ++counter;
    toasts.value.push({ id, type, message });
    setTimeout(() => {
      dismiss(id);
    }, durationMs);
  }

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((item) => item.id !== id);
  }

  return { toasts, push, dismiss };
});
