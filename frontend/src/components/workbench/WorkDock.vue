<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { ChevronRight, Download } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import IssuesPanel from "@/components/panels/IssuesPanel.vue";
import RepairLogPanel from "@/components/panels/RepairLogPanel.vue";
import ComparePanel from "@/components/panels/ComparePanel.vue";
import ExecutionPanel from "@/components/panels/ExecutionPanel.vue";
import AssemblyPanel from "@/components/panels/AssemblyPanel.vue";
import type { Issue } from "@/types/api";
import { useWorkbenchStore } from "@/stores/workbench";

const props = defineProps<{ open: boolean; activeTab: string }>();
const emit = defineEmits<{
  toggle: [];
  selectIssue: [issue: Issue];
  "update:activeTab": [value: string];
  heightChange: [height: number];
}>();

const workbench = useWorkbenchStore();
const dockRef = ref<HTMLElement | null>(null);
let resizeObserver: ResizeObserver | null = null;
const tabs = computed(() => [
  { id: "issues", label: "ISS 审查清单", count: counts.value.issues },
  { id: "fixes", label: "LOG 修复记录", count: counts.value.fixes },
  { id: "compare", label: "VER 回归对比", count: counts.value.compare },
  { id: "status", label: "RUN 执行状态", count: counts.value.status },
  { id: "assembly", label: "ASM 组合检查", count: workbench.assemblyReadyDocuments.length },
]);
const counts = computed(() => ({
  issues: workbench.issues.length,
  fixes: workbench.result?.fixes.length ?? 0,
  compare: workbench.compare?.changed_params.length ?? 0,
  status: workbench.pendingCount || null,
}));

onMounted(() => {
  if (!dockRef.value) return;
  resizeObserver = new ResizeObserver(() => {
    if (dockRef.value) emit("heightChange", dockRef.value.offsetHeight);
  });
  resizeObserver.observe(dockRef.value);
  emit("heightChange", dockRef.value.offsetHeight);
});

onBeforeUnmount(() => resizeObserver?.disconnect());
</script>

<template>
  <section ref="dockRef" class="work-dock" :class="{ 'is-open': open }" aria-label="审查与验证工作台">
    <div class="flex min-h-10 flex-col justify-between border-b border-border bg-secondary/55 md:flex-row md:items-stretch">
      <div class="dock-tabs flex overflow-x-auto" role="tablist">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          role="tab"
          :aria-selected="props.activeTab === tab.id"
          :class="[
            'inline-flex h-10 items-center gap-1.5 whitespace-nowrap border-r border-border px-3 text-[11px] transition-colors',
            props.activeTab === tab.id
              ? 'border-b-2 border-b-primary bg-card font-medium text-foreground'
              : 'border-b-2 border-b-transparent text-muted-foreground hover:bg-card hover:text-foreground',
          ]"
          @click="emit('update:activeTab', tab.id)"
        >
          {{ tab.label }}
          <Badge v-if="tab.count != null">{{ tab.count }}</Badge>
        </button>
      </div>

      <div class="ml-auto flex items-center justify-end gap-1.5 px-1.5 py-1">
        <span class="hidden whitespace-nowrap font-mono text-[9px] text-muted-foreground sm:inline">
          {{ workbench.task ? `${workbench.task.task_id} · ${workbench.pageState}` : "NO ACTIVE JOB" }}
        </span>
        <Button
          variant="outline"
          size="sm"
          :disabled="!workbench.result || Boolean(workbench.busy)"
          @click="workbench.exportReport()"
        >
          <Download :size="14" />
          {{ workbench.busy === "export" ? "生成中" : "导出验证记录" }}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          :aria-label="open ? '收起工作记录台' : '展开工作记录台'"
          :aria-expanded="open"
          @click="emit('toggle')"
        >
          <ChevronRight :size="14" class="transition-transform" :class="{ 'rotate-90': open }" />
        </Button>
      </div>
    </div>

    <div v-if="open" class="dock-body">
      <IssuesPanel
        v-if="props.activeTab === 'issues'"
        :issues="workbench.issues"
        :remaining-ids="workbench.result?.remaining ?? null"
        @select="emit('selectIssue', $event)"
      />
      <RepairLogPanel v-else-if="props.activeTab === 'fixes'" :fixes="workbench.result?.fixes ?? []" />
      <ComparePanel v-else-if="props.activeTab === 'compare'" :compare="workbench.compare" :result="workbench.result" />
      <ExecutionPanel
        v-else-if="props.activeTab === 'status'"
        :task="workbench.task"
        :result="workbench.result"
        :compare="workbench.compare"
        :geometry="workbench.geometry"
        :busy="workbench.busy"
        :exported-at="workbench.exportedAt"
        :explanation="workbench.explanation"
        @explain="workbench.explainWorkflow()"
      />
      <AssemblyPanel
        v-else-if="props.activeTab === 'assembly'"
        :documents="workbench.assemblyReadyDocuments"
        :findings="workbench.assemblyFindings"
      />
    </div>
  </section>
</template>
