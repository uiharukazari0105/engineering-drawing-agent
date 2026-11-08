<script setup lang="ts">
import { FileText, Plus, X } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProjectFolder, WorkbenchDocument } from "@/stores/workbench";

const props = defineProps<{
  documents: WorkbenchDocument[];
  activeId: string | null;
  folders: ProjectFolder[];
}>();

const emit = defineEmits<{
  select: [id: string];
  close: [id: string];
  create: [];
  move: [documentId: string, folderId: string | null];
}>();

const activeDocument = () => props.documents.find((document) => document.id === props.activeId);

function moveActive(event: Event) {
  if (!props.activeId) return;
  emit("move", props.activeId, (event.target as HTMLSelectElement).value || null);
}
</script>

<template>
  <div class="flex min-h-9 items-stretch overflow-x-auto border-b border-border bg-secondary/35">
    <button
      v-for="document in documents"
      :key="document.id"
      type="button"
      :class="
        cn(
          'group inline-flex min-w-[150px] max-w-[240px] items-center gap-1.5 border-r border-border px-2.5 text-[10px] text-muted-foreground hover:bg-card',
          activeId === document.id && 'border-b-2 border-b-primary bg-card font-medium text-foreground',
        )
      "
      @click="emit('select', document.id)"
    >
      <FileText :size="12" class="shrink-0" />
      <span class="truncate">{{ document.title }}</span>
      <span class="ml-auto font-mono text-[8px] opacity-60">{{ document.id }}</span>
      <span
        role="button"
        tabindex="0"
        class="grid size-4 place-items-center rounded hover:bg-muted"
        aria-label="关闭图纸"
        @click.stop="emit('close', document.id)"
        @keydown.enter.stop="emit('close', document.id)"
      >
        <X :size="10" />
      </span>
    </button>
    <Button
      variant="ghost"
      size="icon"
      class="m-0.5 size-7 shrink-0"
      aria-label="新建图纸"
      @click="emit('create')"
    >
      <Plus :size="14" />
    </Button>
    <select
      v-if="activeDocument()"
      class="my-1 ml-auto h-7 min-w-28 rounded border border-border bg-card px-1.5 text-[9px] text-muted-foreground outline-none focus:border-primary"
      :value="activeDocument()?.folderId ?? ''"
      aria-label="移动当前图纸到文件夹"
      @change="moveActive"
    >
      <option value="">未分类</option>
      <option v-for="folder in folders" :key="folder.id" :value="folder.id">
        {{ folder.name }}
      </option>
    </select>
  </div>
</template>
