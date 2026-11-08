<script setup lang="ts">
import { computed } from "vue";
import { Badge } from "@/components/ui/badge";
import type { TaskResponse, WorkflowResult } from "@/types/api";

const props = defineProps<{
  task: TaskResponse | null;
  result: WorkflowResult | null;
  issueCount: number;
  budget: number;
  state: string;
  title: string;
}>();

const usedBudget = computed(() => props.result?.budget.used ?? 0);
const totalBudget = computed(() => props.result?.budget.total ?? props.budget);
const remaining = computed(() => props.result?.remaining.length ?? 0);
</script>

<template>
  <section class="document-statusbar" aria-label="文档状态栏">
    <div class="grid content-center gap-1 border-r border-border px-4 py-3">
      <span class="text-[9px] tracking-[0.08em] text-muted-foreground">CAD WORKBENCH / REV.01</span>
      <h1 class="truncate text-xl font-semibold leading-tight">{{ title }}</h1>
    </div>

    <dl class="document-fields m-0 grid grid-cols-4">
      <div>
        <dt>图号</dt>
        <dd>EDM-01</dd>
      </div>
      <div>
        <dt>任务</dt>
        <dd>{{ task?.task_id ?? "未分配" }}</dd>
      </div>
      <div>
        <dt>单位</dt>
        <dd>MM · DEG</dd>
      </div>
      <div>
        <dt>当前状态</dt>
        <dd>{{ state }}</dd>
      </div>
    </dl>

    <div class="flex items-stretch">
      <div class="metric-cell">
        <b>{{ issueCount }}</b>
        <small>审查问题</small>
      </div>
      <div class="metric-cell">
        <b>{{ result?.resolved ?? 0 }}</b>
        <small>成功修复</small>
      </div>
      <div class="metric-cell">
        <b>{{ usedBudget }}/{{ totalBudget }}</b>
        <small>预算</small>
      </div>
      <div class="metric-cell">
        <b>{{ remaining }}</b>
        <small>剩余</small>
      </div>
    </div>
  </section>
</template>

<style scoped>
.document-fields > div {
  display: grid;
  align-content: center;
  gap: 3px;
  min-width: 0;
  padding: 10px 14px;
  border-right: 1px solid var(--border);
}

.document-fields dt {
  color: var(--muted-foreground);
  font-size: 9px;
}

.document-fields dd {
  margin: 0;
  overflow: hidden;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-cell {
  display: grid;
  align-content: center;
  justify-items: center;
  min-width: 64px;
  padding: 9px 10px;
  border-right: 1px solid var(--border);
}

.metric-cell:last-child {
  border-right: 0;
}

.metric-cell b {
  font-family: var(--font-mono);
  font-size: 15px;
  line-height: 1.2;
}

.metric-cell small {
  margin-top: 2px;
  color: var(--muted-foreground);
  font-size: 8px;
  white-space: nowrap;
}

@media (max-width: 1100px) {
  .document-fields {
    grid-column: 1 / -1;
    grid-row: 2;
    border-top: 1px solid var(--border);
  }
}

@media (max-width: 760px) {
  .document-fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .metric-cell {
    min-width: 0;
    flex: 1;
  }
}
</style>
