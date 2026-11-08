<script setup lang="ts">
import { computed } from "vue";
import { FileText, LoaderCircle, Play, Upload, Wrench, Download } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWorkbenchStore } from "@/stores/workbench";
import type { Preference } from "@/types/api";

const emit = defineEmits<{
  fix: [];
}>();

const workbench = useWorkbenchStore();
const modes: Array<{ value: Preference; label: string }> = [
  { value: "auto", label: "自动" },
  { value: "assisted", label: "辅助" },
  { value: "manual", label: "手动" },
];

const primaryLabel = computed(() => {
  if (!workbench.task) return "开始任务";
  if (!workbench.result) return "执行修复";
  return "导出记录";
});

async function primaryAction() {
  if (!workbench.task) {
    await workbench.parseBlueprint();
  } else if (!workbench.result) {
    emit("fix");
  } else {
    await workbench.exportReport();
  }
}

</script>

<template>
  <section class="input-flow" aria-label="图纸输入与工程命令">
    <div class="flow-config flex flex-wrap items-center gap-3 border-b border-border px-3 py-2.5">
      <span class="text-[10px] text-muted-foreground">协作模式</span>
      <div class="inline-flex overflow-hidden rounded-[3px] border border-border bg-card">
        <button
          v-for="mode in modes"
          :key="mode.value"
          type="button"
          class="h-7 border-r border-border px-2.5 text-[10px] text-muted-foreground last:border-r-0 hover:bg-accent"
          :class="{ 'bg-primary text-primary-foreground hover:bg-primary': workbench.preference === mode.value }"
          @click="workbench.preference = mode.value"
        >
          {{ mode.label }}
        </button>
      </div>
      <label class="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
        预算
        <input
          v-model.number="workbench.budget"
          type="number"
          min="1"
          max="10"
          class="h-7 w-12 rounded-[3px] border border-border bg-card px-1.5 font-mono text-[10px] text-foreground outline-none focus:border-primary"
        />
      </label>
    </div>

    <div class="flow-actions flex flex-wrap items-center justify-end gap-1.5 border-b border-border px-2.5 py-2.5">
      <Button variant="ghost" size="sm" :disabled="Boolean(workbench.busy)" @click="workbench.parseBlueprint">
        <FileText :size="14" />
        内置图样
      </Button>
      <Button
        variant="ghost"
        size="sm"
        :disabled="!workbench.file || Boolean(workbench.busy)"
        @click="workbench.parseDrawing()"
      >
        <LoaderCircle v-if="workbench.busy === 'parse' && workbench.file" :size="14" class="animate-spin" />
        <Upload v-else :size="14" />
        解析图纸
      </Button>
      <Button
        size="sm"
        :disabled="Boolean(workbench.busy)"
        @click="primaryAction"
      >
        <LoaderCircle v-if="workbench.busy === 'fix'" :size="14" class="animate-spin" />
        <Wrench v-else-if="workbench.task && !workbench.result" :size="14" />
        <Download v-else-if="workbench.result" :size="14" />
        <Play v-else :size="14" />
        {{ primaryLabel }}
      </Button>
    </div>

    <div class="flow-readout flex items-center gap-4 overflow-x-auto border-t border-border bg-secondary/45 px-3 py-1.5 text-[10px] text-muted-foreground">
      <Badge :variant="workbench.pageTone === 'done' ? 'success' : workbench.pageTone === 'warn' ? 'warning' : 'default'">
        {{ workbench.pageState }}
      </Badge>
      <span><b class="mono text-foreground">{{ workbench.issues.length }}</b> 审查问题</span>
      <span><b class="mono text-foreground">{{ workbench.result?.resolved ?? 0 }}</b> 成功修复</span>
      <span>
        <b class="mono text-foreground">{{ workbench.result?.budget.used ?? 0 }}/{{ workbench.result?.budget.total ?? workbench.budget }}</b>
        预算
      </span>
    </div>
  </section>
</template>

<style scoped>
.input-flow {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-rows: auto 34px;
  overflow: hidden;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 1px 2px rgb(37 38 32 / 5%);
}

.flow-config {
  grid-column: 1;
  grid-row: 1;
  border-right: 1px solid var(--border);
}

.flow-actions {
  grid-column: 2;
  grid-row: 1;
}

.flow-readout {
  grid-column: 1 / -1;
  grid-row: 2;
}

@media (max-width: 1100px) {
  .input-flow {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto 34px;
  }

  .flow-config {
    grid-column: 1;
    grid-row: 1;
    border-right: 1px solid var(--border);
  }

  .flow-actions {
    grid-column: 1;
    grid-row: 2;
    justify-content: flex-start;
  }

  .flow-readout {
    grid-column: 1 / -1;
    grid-row: 3;
  }
}

@media (max-width: 760px) {
  .input-flow {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto 34px;
  }
  .flow-config { grid-row: 1; }
  .flow-actions { grid-row: 2; }
  .flow-readout { grid-row: 3; }
}
</style>
