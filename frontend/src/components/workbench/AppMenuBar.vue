<script setup lang="ts">
import { computed, ref } from "vue";
import { onClickOutside } from "@vueuse/core";
import { ChevronRight, Box } from "@lucide/vue";
import { cn } from "@/lib/utils";
import type { MetaResponse, TaskResponse, WorkflowResult } from "@/types/api";

interface MenuItem {
  label?: string;
  shortcut?: string;
  disabled?: boolean;
  checked?: boolean;
  divider?: boolean;
  action?: string;
}

interface MenuDefinition {
  id: string;
  label: string;
  items: MenuItem[];
}

const props = defineProps<{
  meta: MetaResponse | null;
  task: TaskResponse | null;
  result: WorkflowResult | null;
  busy: string | null;
  state: string;
  tone: string;
  hasFile: boolean;
  dockOpen: boolean;
  projectOpen: boolean;
}>();

const emit = defineEmits<{
  openFile: [];
  loadBlueprint: [];
  exportReport: [];
  parseDrawing: [];
  fix: [];
  navigate: [id: string];
  toggleDock: [];
  toggleProject: [];
  openDock: [tab: string];
  newFolder: [];
  saveProject: [];
  loadProject: [];
  showHelp: [];
  showAbout: [];
}>();

const openMenu = ref<string | null>(null);
const root = ref<HTMLElement | null>(null);
onClickOutside(root, () => {
  openMenu.value = null;
});

const menus = computed<MenuDefinition[]>(() => [
  {
    id: "file",
    label: "文件",
    items: [
      { label: "打开图纸…", shortcut: "Ctrl+O", action: "openFile" },
      { label: "新建文件夹", action: "newFolder" },
      { label: "保存工程…", action: "saveProject" },
      { label: "读取工程…", action: "loadProject" },
      { divider: true },
      { label: "载入内置图样", shortcut: "Ctrl+Enter", action: "loadBlueprint" },
      { divider: true },
      {
        label: "导出验证记录",
        shortcut: "Ctrl+S",
        action: "exportReport",
        disabled: !props.result || Boolean(props.busy),
      },
    ],
  },
  {
    id: "process",
    label: "处理",
    items: [
      {
        label: props.busy === "parse" ? "正在解析图纸…" : "解析上传图纸",
        action: "parseDrawing",
        disabled: !props.hasFile || Boolean(props.busy),
      },
      {
        label: props.busy === "fix" ? "正在执行修复…" : "执行参数修复",
        shortcut: "Shift+Enter",
        action: "fix",
        disabled: !props.task || Boolean(props.result) || Boolean(props.busy),
      },
    ],
  },
  {
    id: "view",
    label: "视图",
    items: [
      { label: "图纸与任务", action: "nav:input" },
      { label: "参数化模型", action: "nav:model" },
      { label: "参数检查", action: "nav:evidence" },
      { label: "人工确认", action: "nav:review" },
      { divider: true },
      {
        label: "资源管理器",
        checked: props.projectOpen,
        action: "toggleProject",
      },
      {
        label: "工作记录台",
        checked: props.dockOpen,
        action: "toggleDock",
      },
      { divider: true },
      { label: "审查清单", action: "dock:issues" },
      { label: "修复记录", action: "dock:fixes" },
      { label: "回归对比", action: "dock:compare" },
      { label: "执行状态", action: "dock:status" },
      { label: "零件组合检查", action: "dock:assembly" },
    ],
  },
  {
    id: "help",
    label: "帮助",
    items: [
      { label: "快捷键与说明", action: "showHelp" },
      { label: "关于 EDM-01", action: "showAbout" },
    ],
  },
]);

function execute(item: MenuItem) {
  if (item.disabled || !item.action) return;
  openMenu.value = null;
  if (item.action.startsWith("nav:")) {
    emit("navigate", item.action.slice(4));
    return;
  }
  if (item.action.startsWith("dock:")) {
    emit("openDock", item.action.slice(5));
    return;
  }
  const eventMap = {
    openFile: "openFile",
    loadBlueprint: "loadBlueprint",
    exportReport: "exportReport",
    parseDrawing: "parseDrawing",
    fix: "fix",
    toggleDock: "toggleDock",
    toggleProject: "toggleProject",
    newFolder: "newFolder",
    saveProject: "saveProject",
    loadProject: "loadProject",
    showHelp: "showHelp",
    showAbout: "showAbout",
  } as const;
  const eventName = eventMap[item.action as keyof typeof eventMap];
  if (eventName) emit(eventName);
}
</script>

<template>
  <header ref="root" class="topbar">
    <div class="flex shrink-0 items-center gap-2 pr-2">
      <span class="text-[15px] font-semibold leading-none">Sourth</span>
      <span class="h-[18px] w-px bg-border" />
      <span class="whitespace-nowrap text-[10px] text-muted-foreground">Engineering CAD</span>
    </div>

    <nav class="flex self-stretch" aria-label="应用菜单">
      <div v-for="menu in menus" :key="menu.id" class="relative flex">
        <button
          type="button"
          class="inline-flex min-w-[61px] items-center justify-center gap-1 px-3 text-xs text-muted-foreground hover:bg-card hover:text-foreground"
          :class="{ 'bg-card text-foreground shadow-[inset_0_-2px_var(--primary)]': openMenu === menu.id }"
          :aria-expanded="openMenu === menu.id"
          aria-haspopup="menu"
          @click="openMenu = openMenu === menu.id ? null : menu.id"
        >
          {{ menu.label }}
          <ChevronRight :size="11" class="rotate-90 opacity-60" />
        </button>

        <div
          v-if="openMenu === menu.id"
          class="absolute left-0 top-full z-[60] min-w-[230px] rounded-[4px] border border-border bg-popover p-1 shadow-xl"
          role="menu"
        >
          <template v-for="(item, index) in menu.items" :key="`${menu.id}-${index}`">
            <div v-if="item.divider" class="mx-1.5 my-1 h-px bg-border" />
            <button
              v-else
              type="button"
              role="menuitem"
              :disabled="item.disabled"
              :class="
                cn(
                  'grid min-h-8 w-full grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-2 rounded-[3px] px-2 py-1 text-left text-[11px] text-muted-foreground hover:bg-primary hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-45',
                  { 'text-foreground': item.checked },
                )
              "
              @click="execute(item)"
            >
              <span class="text-center">{{ item.checked ? "✓" : "" }}</span>
              <span>{{ item.label }}</span>
              <kbd v-if="item.shortcut" class="font-mono text-[9px] opacity-70">{{ item.shortcut }}</kbd>
            </button>
          </template>
        </div>
      </div>
    </nav>

    <div class="ml-auto flex items-center gap-3">
      <span class="inline-flex items-center gap-1.5 whitespace-nowrap text-[10px] text-muted-foreground">
        <span
          class="size-2 rounded-full border"
          :class="{
            'border-slate-500 bg-slate-400': tone === 'idle',
            'border-amber-600 bg-amber-500': tone === 'running' || tone === 'warn',
            'border-emerald-700 bg-emerald-600': tone === 'done',
          }"
        />
        {{ state }}
      </span>
      <span v-if="task" class="font-mono text-[9px] text-muted-foreground">{{ task.task_id }}</span>
      <span class="inline-flex items-center gap-1 whitespace-nowrap font-mono text-[9px] text-muted-foreground">
        <Box :size="13" />
        几何内核 {{ meta?.cadquery_available ? "CadQuery" : meta ? "摘要" : "检测中" }}
      </span>
    </div>
  </header>
</template>

<style scoped>
@media (max-width: 760px) {
  .topbar {
    gap: 2px;
  }

  .topbar > :first-child {
    padding-right: 0;
  }

  .topbar > :first-child > :last-child,
  .topbar > :last-child > :last-child {
    display: none;
  }

  .topbar nav > div > button {
    min-width: 47px;
    padding: 0 7px;
    font-size: 11px;
  }

  .topbar nav > div > button svg {
    display: none;
  }

  .topbar > :last-child {
    gap: 4px;
  }
}
</style>
