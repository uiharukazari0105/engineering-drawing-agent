<script setup lang="ts">
import { computed, ref } from "vue";
import {
  ChevronRight,
  FileText,
  Folder,
  FolderPlus,
  Layers3,
  UploadCloud,
} from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProjectFolder, WorkbenchDocument } from "@/stores/workbench";

const props = defineProps<{
  documents: WorkbenchDocument[];
  folders: ProjectFolder[];
  activeId: string | null;
  activeFolderId: string | null;
}>();

const emit = defineEmits<{
  select: [id: string];
  create: [];
  assembly: [];
  createFolder: [name: string];
  selectFolder: [id: string | null];
  drawingFile: [file: File];
  invalidFile: [file: File];
  move: [documentId: string, folderId: string | null];
}>();

const expanded = ref<string[]>([...props.folders.map((folder) => folder.id)]);
const creatingFolder = ref(false);
const folderName = ref("");
const unfiled = computed(() => props.documents.filter((document) => !document.folderId));
const draggingId = ref<string | null>(null);

function startCreateFolder() {
  creatingFolder.value = true;
}

defineExpose({ startCreateFolder });

function toggleFolder(id: string) {
  expanded.value = expanded.value.includes(id)
    ? expanded.value.filter((item) => item !== id)
    : [...expanded.value, id];
}

function submitFolder() {
  const name = folderName.value.trim();
  if (!name) {
    creatingFolder.value = false;
    return;
  }
  emit("createFolder", name);
  folderName.value = "";
  creatingFolder.value = false;
}

function acceptDrawing(file?: File) {
  if (!file) return;
  const name = file.name.toLowerCase();
  if (![".pdf", ".png", ".jpg", ".jpeg", ".bmp"].some((ext) => name.endsWith(ext))) {
    emit("invalidFile", file);
    return;
  }
  emit("drawingFile", file);
}

function onDrop(event: DragEvent) {
  acceptDrawing(event.dataTransfer?.files[0]);
}

function startDocumentDrag(event: DragEvent, documentId: string) {
  draggingId.value = documentId;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", documentId);
  }
}

function dropOnFolder(event: DragEvent, folderId: string | null) {
  const documentId = event.dataTransfer?.getData("text/plain") || draggingId.value;
  if (documentId) emit("move", documentId, folderId);
  draggingId.value = null;
}
</script>

<template>
  <aside class="project-explorer" aria-label="工程资源管理器">
    <header class="flex h-9 shrink-0 items-center justify-between border-b border-border px-2.5">
      <strong class="text-[10px] font-medium">资源管理器</strong>
      <Button
        variant="ghost"
        size="icon"
        class="size-6"
        aria-label="新建文件夹"
        @click="creatingFolder = !creatingFolder"
      >
        <FolderPlus :size="13" />
      </Button>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto p-1.5 text-[10px]">
      <div class="flex items-center gap-1.5 rounded px-1.5 py-1 font-medium">
        <ChevronRight :size="12" class="rotate-90" />
        <Folder :size="13" class="text-primary" />
        <span>EDM-01</span>
        <Badge class="ml-auto">{{ documents.length }}</Badge>
      </div>

      <form
        v-if="creatingFolder"
        class="ml-5 mb-1 flex items-center gap-1 border-l border-border py-1 pl-2"
        @submit.prevent="submitFolder"
      >
        <FolderPlus :size="12" class="text-primary" />
        <input
          v-model="folderName"
          class="h-6 min-w-0 flex-1 rounded border border-border bg-card px-1.5 text-[9px] outline-none focus:border-primary"
          placeholder="文件夹名称"
          autofocus
          @keydown.esc="creatingFolder = false"
        />
        <Button size="sm" class="h-6 px-1.5 text-[9px]">创建</Button>
      </form>

      <div class="ml-3 grid gap-0.5 border-l border-border pl-2">
        <button
          type="button"
          class="flex items-center gap-1.5 rounded px-1.5 py-1 text-muted-foreground hover:bg-accent"
          :class="{ 'bg-accent text-foreground': activeFolderId === null }"
          @click="emit('selectFolder', null)"
          @dragover.prevent
          @drop.prevent="dropOnFolder($event, null)"
        >
          <FileText :size="12" />
          <span>未分类图纸</span>
          <Badge class="ml-auto">{{ unfiled.length }}</Badge>
        </button>
        <button
          v-for="document in unfiled"
          :key="document.id"
          type="button"
          :class="
            cn(
              'ml-3 flex min-w-0 items-center gap-1.5 rounded px-1.5 py-1 text-left text-muted-foreground hover:bg-accent',
              activeId === document.id && 'bg-accent text-foreground',
            )
          "
          draggable="true"
          @dragstart="startDocumentDrag($event, document.id)"
          @dragend="draggingId = null"
          @click="emit('select', document.id)"
        >
          <FileText :size="12" class="shrink-0" />
          <span class="truncate">{{ document.title }}</span>
          <span
            class="ml-auto size-1.5 shrink-0 rounded-full"
            :class="document.result?.state === 'DONE' ? 'bg-emerald-600' : 'bg-slate-400'"
          />
        </button>

        <div
          v-for="folder in folders"
          :key="folder.id"
          class="grid gap-0.5"
        >
          <button
            type="button"
            class="flex items-center gap-1.5 rounded px-1.5 py-1 text-muted-foreground hover:bg-accent"
            :class="{ 'bg-accent text-foreground': activeFolderId === folder.id }"
            @click="emit('selectFolder', folder.id)"
            @dragover.prevent
            @drop.prevent="dropOnFolder($event, folder.id)"
          >
            <ChevronRight
              :size="11"
              class="transition-transform"
              :class="{ 'rotate-90': expanded.includes(folder.id) }"
              @click.stop="toggleFolder(folder.id)"
            />
            <Folder :size="12" class="text-amber-700" />
            <span class="truncate">{{ folder.name }}</span>
            <Badge class="ml-auto">
              {{ documents.filter((document) => document.folderId === folder.id).length }}
            </Badge>
          </button>
          <button
            v-for="document in documents.filter((item) => item.folderId === folder.id)"
            v-show="expanded.includes(folder.id)"
            :key="document.id"
            type="button"
            :class="
              cn(
                'ml-6 flex min-w-0 items-center gap-1.5 rounded px-1.5 py-1 text-left text-muted-foreground hover:bg-accent',
                activeId === document.id && 'bg-accent text-foreground',
              )
            "
          draggable="true"
          @dragstart="startDocumentDrag($event, document.id)"
          @dragend="draggingId = null"
            @click="emit('select', document.id)"
          >
            <FileText :size="12" class="shrink-0" />
            <span class="truncate">{{ document.title }}</span>
          </button>
        </div>

        <div class="my-1 h-px bg-border" />
        <button
          type="button"
          class="flex items-center gap-1.5 rounded px-1.5 py-1 text-muted-foreground hover:bg-accent"
          @click="emit('assembly')"
        >
          <Layers3 :size="12" />
          <span>零件组合检查</span>
          <Badge class="ml-auto">{{ documents.filter((item) => item.geometry).length }}</Badge>
        </button>
      </div>
    </div>

    <footer class="grid shrink-0 gap-1.5 border-t border-border p-1.5">
      <Button variant="ghost" size="sm" class="justify-start" @click="startCreateFolder">
        <FolderPlus :size="13" />新建文件夹
      </Button>
      <button
        type="button"
        class="grid min-h-20 place-items-center gap-1 rounded border border-dashed border-border bg-card/40 px-2 py-2 text-center text-[9px] text-muted-foreground transition-colors hover:border-primary hover:bg-accent/50"
        @click="emit('create')"
        @dragover.prevent
        @drop.prevent="onDrop"
      >
        <UploadCloud :size="18" />
        <span>拖入图纸</span>
        <span class="text-[8px]">PDF / PNG / JPG</span>
      </button>
    </footer>
  </aside>
</template>

<style scoped>
.project-explorer {
  display: flex;
  flex-direction: column;
}
</style>
