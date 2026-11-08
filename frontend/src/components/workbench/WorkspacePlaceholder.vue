<script setup lang="ts">
import { FilePlus2, FolderOpen } from "@lucide/vue";
import { Button } from "@/components/ui/button";

const emit = defineEmits<{
  create: [];
}>();
</script>

<template>
  <section class="grid min-h-[520px] place-items-center rounded-md border border-dashed border-border bg-secondary/20 px-6 py-12 text-center">
    <div class="grid max-w-md justify-items-center gap-4">
      <span class="grid size-14 place-items-center rounded-full border border-border bg-card text-muted-foreground">
        <FolderOpen :size="26" />
      </span>
      <div class="grid gap-1.5">
        <h2 class="text-base font-medium">当前工程还没有图纸</h2>
        <p class="text-[11px] leading-relaxed text-muted-foreground">
          请先从资源管理器拖入工程图纸，或通过“文件 → 打开图纸”创建第一份图纸。
        </p>
      </div>
      <Button @click="emit('create')">
        <FilePlus2 :size="14" />
        创建第一份图纸
      </Button>
    </div>
  </section>
</template>
