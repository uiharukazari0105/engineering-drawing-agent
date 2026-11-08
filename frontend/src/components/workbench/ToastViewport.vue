<script setup lang="ts">
import { Check, Info, TriangleAlert, X } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { useToastStore } from "@/stores/toast";

const toast = useToastStore();
</script>

<template>
  <div class="fixed bottom-3 right-3 z-[100] grid w-[min(360px,calc(100vw-24px))] gap-1.5" aria-live="polite">
    <div
      v-for="item in toast.items"
      :key="item.id"
      class="flex items-start gap-2 rounded border border-border border-l-[3px] bg-card p-2.5 shadow-xl"
      :class="{
        'border-l-emerald-600': item.tone === 'ok',
        'border-l-amber-600': item.tone === 'warn',
        'border-l-red-600': item.tone === 'err',
      }"
    >
      <Check v-if="item.tone === 'ok'" :size="15" class="mt-0.5 text-emerald-700" />
      <TriangleAlert v-else-if="item.tone === 'warn'" :size="15" class="mt-0.5 text-amber-700" />
      <Info v-else :size="15" class="mt-0.5 text-red-700" />
      <div class="min-w-0 flex-1">
        <strong class="block text-xs font-medium">{{ item.title }}</strong>
        <span v-if="item.description" class="mt-0.5 block break-words text-[10px] text-muted-foreground">
          {{ item.description }}
        </span>
      </div>
      <Button variant="ghost" size="icon" class="size-6" aria-label="关闭通知" @click="toast.dismiss(item.id)">
        <X :size="13" />
      </Button>
    </div>
  </div>
</template>
