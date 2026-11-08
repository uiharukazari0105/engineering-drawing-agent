import { defineStore } from "pinia";
import { ref } from "vue";
import type { ToastItem } from "@/types/api";

export const useToastStore = defineStore("toast", () => {
  const items = ref<ToastItem[]>([]);

  function dismiss(id: string) {
    items.value = items.value.filter((item) => item.id !== id);
  }

  function push(item: Omit<ToastItem, "id">, duration = 4200) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    items.value = [...items.value.slice(-3), { ...item, id }];
    window.setTimeout(() => dismiss(id), duration);
  }

  return { items, push, dismiss };
});
