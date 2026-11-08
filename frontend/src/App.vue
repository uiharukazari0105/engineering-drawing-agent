<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onMounted, ref } from "vue";
import { Ruler } from "@lucide/vue";
import AppMenuBar from "@/components/workbench/AppMenuBar.vue";
import DocumentStatusBar from "@/components/workbench/DocumentStatusBar.vue";
import ProjectExplorer from "@/components/workbench/ProjectExplorer.vue";
import DocumentTabs from "@/components/workbench/DocumentTabs.vue";
import StageSection from "@/components/workbench/StageSection.vue";
import InputStage from "@/components/workbench/InputStage.vue";
import WorkDock from "@/components/workbench/WorkDock.vue";
import ConfirmFixDialog from "@/components/workbench/ConfirmFixDialog.vue";
import ToastViewport from "@/components/workbench/ToastViewport.vue";
import WorkspacePlaceholder from "@/components/workbench/WorkspacePlaceholder.vue";
import ParameterInspector from "@/components/panels/ParameterInspector.vue";
import ReviewQueue from "@/components/panels/ReviewQueue.vue";
import { useWorkbenchStore } from "@/stores/workbench";
import { useToastStore } from "@/stores/toast";
import { useWorkspaceUiStore } from "@/stores/workspaceUi";
import { useWorkbenchShortcuts } from "@/composables/useWorkbenchShortcuts";
import { cn } from "@/lib/utils";
import type { Issue } from "@/types/api";

const ModelViewer = defineAsyncComponent(() => import("@/components/model/ModelViewer.vue"));

const workbench = useWorkbenchStore();
const toast = useToastStore();
const workspaceUi = useWorkspaceUiStore();
const confirmOpen = ref(false);
const dockHeight = ref(40);
const fileInput = ref<HTMLInputElement | null>(null);
const projectZipInput = ref<HTMLInputElement | null>(null);
const projectExplorer = ref<{ startCreateFolder: () => void } | null>(null);

const documentMeta = computed(() =>
  workbench.geometry
    ? `${workbench.geometry.kernel.toUpperCase()} · ISO · ${workbench.geometry.hole_count} HOLES`
    : "等待几何生成",
);

const evidenceMeta = computed(() =>
  workbench.task
    ? `${workbench.task.parse.overall_mode} · ${workbench.task.parse.fields.length} 项`
    : "等待解析",
);

const reviewMeta = computed(() =>
  workbench.pendingCount ? `${workbench.pendingCount} 项待处理` : "当前无待确认项",
);

function openFile() {
  fileInput.value?.click();
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openDock(tab: string) {
  workspaceUi.dockTab = tab;
  workspaceUi.dockOpen = true;
}

function setFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    workbench.file = file;
    void workbench.parseDrawing(file);
  }
  (event.target as HTMLInputElement).value = "";
}

function setProjectFile(event: Event) {
  const selected = (event.target as HTMLInputElement).files?.[0];
  if (selected) void workbench.importProject(selected);
  (event.target as HTMLInputElement).value = "";
}

function startCreateFolder() {
  workspaceUi.projectOpen = true;
  void nextTick(() => projectExplorer.value?.startCreateFolder());
}

function addDraggedDrawing(file: File) {
  workbench.file = file;
  void workbench.parseDrawing(file);
}

function requestFix() {
  if (!workbench.task || workbench.result || workbench.busy) return;
  confirmOpen.value = true;
}

async function confirmFix() {
  confirmOpen.value = false;
  await workbench.runFix();
}

function selectIssue(issue: Issue) {
  const match = issue.constraint_id?.match(/^c_h(\d+)_inside$/);
  if (match?.[1]) {
    workbench.setHighlight([`hole_h${match[1]}`]);
    document.getElementById("model")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  toast.push({
    tone: "ok",
    title: "模型定位",
    description: issue.constraint_id ?? issue.code,
  });
}

function createDocument() {
  workbench.file = null;
  fileInput.value?.click();
}

function showHelp() {
  toast.push({
    tone: "ok",
    title: "工程快捷键",
    description: "Ctrl+Enter 解析蓝图 · Shift+Enter 执行修复 · Ctrl+S 导出记录",
  });
}

function showAbout() {
  toast.push({
    tone: "ok",
    title: "EDM-01 Engineering CAD",
    description: "本地参数化建模、规则审查与回归验证工作台",
  });
}

useWorkbenchShortcuts({ onFix: requestFix, onOpen: openFile });

onMounted(() => {
  void workbench.loadMeta();
});
</script>

<template>
  <div
    class="app-shell"
    :class="{ 'project-collapsed': !workspaceUi.projectOpen, 'dock-open': workspaceUi.dockOpen }"
    :style="{ '--dock-height-current': `${dockHeight}px` }"
  >
    <input
      ref="fileInput"
      class="fixed -left-[9999px]"
      type="file"
      accept=".pdf,.png,.jpg,.jpeg,.bmp"
      @change="setFile"
    />
    <input
      ref="projectZipInput"
      class="fixed -left-[9999px]"
      type="file"
      accept=".zip,application/zip"
      @change="setProjectFile"
    />

    <AppMenuBar
      :meta="workbench.meta"
      :task="workbench.task"
      :result="workbench.result"
      :busy="workbench.busy"
      :state="workbench.pageState"
      :tone="workbench.pageTone"
      :has-file="Boolean(workbench.file)"
      :dock-open="workspaceUi.dockOpen"
      :project-open="workspaceUi.projectOpen"
      @open-file="openFile"
      @load-blueprint="workbench.parseBlueprint()"
      @export-report="workbench.exportReport()"
      @parse-drawing="workbench.parseDrawing()"
      @fix="requestFix"
      @navigate="scrollTo"
      @toggle-dock="workspaceUi.dockOpen = !workspaceUi.dockOpen"
      @toggle-project="workspaceUi.projectOpen = !workspaceUi.projectOpen"
      @open-dock="openDock"
      @new-folder="startCreateFolder"
      @save-project="workbench.exportProject()"
      @load-project="projectZipInput?.click()"
      @show-help="showHelp"
      @show-about="showAbout"
    />

    <ProjectExplorer
      v-if="workspaceUi.projectOpen"
      ref="projectExplorer"
      :documents="workbench.documents"
      :folders="workbench.folders"
      :active-id="workbench.activeDocumentId"
      :active-folder-id="workbench.activeFolderId"
      @select="workbench.selectDocument"
      @create="createDocument"
      @assembly="openDock('assembly')"
      @create-folder="workbench.createFolder"
      @select-folder="workbench.selectFolder"
      @move="workbench.moveDocument"
      @drawing-file="addDraggedDrawing"
      @invalid-file="toast.push({
        tone: 'warn',
        title: '文件类型不支持',
        description: `${$event.name}：请使用 PDF / PNG / JPG`,
      })"
    />

    <main class="app-main">
      <div :class="cn('workbench-content', workspaceUi.dockOpen ? 'pb-[270px]' : 'pb-[70px]')">
        <DocumentTabs
          :documents="workbench.documents"
          :active-id="workbench.activeDocumentId"
          :folders="workbench.folders"
          @select="workbench.selectDocument"
          @close="workbench.closeDocument"
          @create="createDocument"
          @move="workbench.moveDocument"
        />
        <WorkspacePlaceholder
          v-if="!workbench.activeDocument"
          @create="createDocument"
        />
        <template v-else>
          <DocumentStatusBar
            :task="workbench.task"
            :result="workbench.result"
            :issue-count="workbench.issues.length"
            :budget="workbench.budget"
            :state="workbench.pageState"
            :title="workbench.activeDocument.title"
          />

          <div class="stage-stack">
          <StageSection
            id="input"
            title="图纸与任务"
            :meta="workbench.file?.name ?? workbench.task?.source_file ?? '等待图源'"
          >
            <InputStage @fix="requestFix" />
            <div
              v-if="workbench.error"
              class="mt-3 flex items-start gap-2 rounded border border-red-300 bg-red-50 px-3 py-2 text-[10px] text-red-800"
              role="alert"
            >
              <span class="h-full w-0.5 self-stretch bg-red-700" />
              <div>
                <strong class="block">操作未完成</strong>
                <span>{{ workbench.error }}</span>
              </div>
            </div>
          </StageSection>

          <StageSection
            id="model"
            title="参数化模型"
            :meta="documentMeta"
          >
            <ModelViewer
              :geometry="workbench.geometry"
              :highlight="workbench.highlight"
            />
            <div class="mt-2 flex flex-wrap items-center justify-between gap-2 text-[9px] text-muted-foreground">
              <div class="flex flex-wrap items-center gap-3">
                <span class="inline-flex items-center gap-1"><i class="size-2 rounded-full bg-sky-700" />正常孔</span>
                <span class="inline-flex items-center gap-1"><i class="size-2 rounded-full bg-red-600" />冲突孔</span>
                <span class="inline-flex items-center gap-1"><i class="size-2 rounded-full bg-amber-700" />尺寸标注</span>
                <span class="inline-flex items-center gap-1"><i class="size-2 rounded-full bg-slate-600" />零件本体</span>
              </div>
              <span v-if="workbench.geometry" class="inline-flex items-center gap-1 font-mono">
                <Ruler :size="12" />
                {{ workbench.geometry.bbox.length }} × {{ workbench.geometry.bbox.width }} ×
                {{ workbench.geometry.bbox.height }} MM · {{ workbench.geometry.hole_count }} HOLES
              </span>
            </div>
          </StageSection>

          <StageSection
            id="evidence"
            title="参数检查"
            :meta="evidenceMeta"
          >
            <ParameterInspector :task="workbench.task" :meta="workbench.meta" />
          </StageSection>

          <StageSection
            id="review"
            title="人工确认"
            :meta="reviewMeta"
          >
            <ReviewQueue
              :task="workbench.task"
              :result="workbench.result"
              :busy="workbench.busy"
              @export="workbench.exportReport()"
            />
          </StageSection>
          </div>
        </template>
      </div>
    </main>

    <WorkDock
      :open="workspaceUi.dockOpen"
      :active-tab="workspaceUi.dockTab"
      @toggle="workspaceUi.dockOpen = !workspaceUi.dockOpen"
      @update:active-tab="workspaceUi.dockTab = $event"
      @select-issue="selectIssue"
      @height-change="dockHeight = $event"
    />

    <ConfirmFixDialog
      :open="confirmOpen"
      :budget="workbench.budget"
      :issue-count="workbench.issues.length"
      @update:open="confirmOpen = $event"
      @confirm="confirmFix"
    />

    <ToastViewport />
  </div>
</template>
