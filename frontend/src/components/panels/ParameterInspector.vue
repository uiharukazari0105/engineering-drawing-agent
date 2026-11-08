<script setup lang="ts">
import { computed } from "vue";
import { FileText } from "@lucide/vue";
import { Badge } from "@/components/ui/badge";
import type { MetaResponse, ParsedField, TaskResponse } from "@/types/api";

const props = defineProps<{
  task: TaskResponse | null;
  meta: MetaResponse | null;
}>();

const fields = computed(() => props.task?.parse.fields ?? []);
const modeLabel: Record<string, string> = {
  A0: "A0 全自动",
  A1: "A1 辅助",
  A2: "A2 手动",
};
const sourceLabel: Record<string, string> = {
  drawing: "图纸",
  user: "人工",
  inferred: "推断",
  blueprint: "蓝图",
};

function confidenceTone(field: ParsedField) {
  if (field.confidence < 0.55) return "danger";
  if (field.confidence < 0.85) return "warning";
  return "success";
}
</script>

<template>
  <div v-if="!task" class="grid min-h-[138px] content-center justify-items-center gap-2 p-5 text-center">
    <span class="grid size-8 place-items-center rounded border border-border bg-muted text-muted-foreground">
      <FileText :size="18" />
    </span>
    <strong class="text-xs font-medium">等待参数证据</strong>
    <span class="max-w-sm text-[10px] text-muted-foreground">
      解析后将列出尺寸来源、置信度与自动化档位。
    </span>
  </div>

  <div v-else class="grid gap-2">
    <div class="flex flex-wrap items-center gap-1.5">
      <Badge :variant="task.parse.overall_mode === 'A2' ? 'danger' : task.parse.overall_mode === 'A1' ? 'warning' : 'success'">
        {{ modeLabel[task.parse.overall_mode] }}
      </Badge>
      <Badge v-if="task.parse.pending.length" variant="warning">
        待确认 {{ task.parse.pending.length }}
      </Badge>
      <Badge variant="outline">{{ task.source_file ? "DRAWING" : "BLUEPRINT" }}</Badge>
    </div>

    <div
      v-if="task.parse.notes.length"
      class="flex items-start gap-2 rounded border border-amber-300 bg-amber-50 px-2.5 py-2 text-[10px] text-amber-900"
    >
      <span class="h-full w-0.5 self-stretch bg-current" />
      <div class="grid gap-0.5">
        <span v-for="note in task.parse.notes" :key="note">{{ note }}</span>
      </div>
    </div>

    <div v-if="fields.length" class="property-list">
      <div
        v-for="field in fields"
        :key="field.id"
        class="grid gap-1 border-b border-border px-1 py-2.5 hover:bg-secondary/35"
      >
        <div class="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
          <span class="truncate font-mono text-[10px] font-medium">{{ field.id }}</span>
          <strong class="font-mono text-xs">{{ field.value }}</strong>
          <Badge :variant="field.needs_confirm ? 'warning' : 'default'">
            {{ field.needs_confirm ? "需确认" : field.status }}
          </Badge>
        </div>
        <div class="flex items-center gap-3 text-[9px] text-muted-foreground">
          <span class="font-mono">CONF {{ field.confidence.toFixed(2) }}</span>
          <span>{{ sourceLabel[field.source] ?? field.source }}</span>
          <Badge :variant="confidenceTone(field)">{{ field.mode }}</Badge>
          <span class="h-1 w-10 overflow-hidden rounded bg-muted">
            <span
              class="block h-full"
              :class="{
                'bg-emerald-600': field.confidence >= 0.85,
                'bg-amber-600': field.confidence >= 0.55 && field.confidence < 0.85,
                'bg-red-600': field.confidence < 0.55,
              }"
              :style="{ width: `${Math.round(field.confidence * 100)}%` }"
            />
          </span>
        </div>
      </div>
    </div>

    <div v-if="meta" class="flex justify-between font-mono text-[9px] text-muted-foreground">
      <span>自动阈值</span>
      <span>HI {{ meta.thresholds.high }} / LO {{ meta.thresholds.low }}</span>
    </div>
  </div>
</template>
