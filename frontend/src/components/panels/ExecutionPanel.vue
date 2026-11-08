<script setup lang="ts">
import { computed } from "vue";
import { Activity, Check, LoaderCircle } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type {
  CompareResult,
  Explanation,
  GeometryModel,
  TaskResponse,
  WorkflowResult,
} from "@/types/api";

const props = defineProps<{
  task: TaskResponse | null;
  result: WorkflowResult | null;
  compare: CompareResult | null;
  geometry: GeometryModel | null;
  busy: string | null;
  exportedAt: string | null;
  explanation: Explanation | null;
}>();

const emit = defineEmits<{ explain: [] }>();

const steps = computed(() => [
  {
    name: "图纸解析器",
    done: Boolean(props.task),
    note: props.task ? `${props.task.parse.fields.length} 项参数 · ${props.task.parse.overall_mode}` : "等待输入",
  },
  {
    name: "确定性规则引擎",
    done: Boolean(props.task),
    note: props.task ? `完成 ${props.task.issues.length} 项问题分类` : "等待解析结果",
  },
  {
    name: "局部参数修复器",
    done: Boolean(props.result),
    note: props.result ? `预算 ${props.result.budget.used}/${props.result.budget.total} · ${props.result.state}` : "等待启动",
  },
  {
    name: "几何重建与回归验证",
    done: Boolean(props.result && props.geometry),
    note: props.result ? `对比 ${props.compare?.changed_params.length ?? 0} 项参数` : "等待修复",
  },
  {
    name: "证据报告生成器",
    done: Boolean(props.exportedAt),
    note: props.exportedAt ? "报告已导出" : props.result ? "等待导出" : "等待验证",
  },
]);
</script>

<template>
  <div class="grid gap-2">
    <div class="flex items-start gap-2 rounded border border-border bg-secondary/35 p-2.5">
      <span class="grid size-7 place-items-center rounded border border-border bg-card text-primary">
        <LoaderCircle v-if="busy" :size="16" class="animate-spin" />
        <Check v-else-if="result?.state === 'DONE'" :size="16" class="text-emerald-700" />
        <Activity v-else :size="16" />
      </span>
      <div>
        <strong class="text-xs font-medium">
          {{ busy ? "工程流程执行中" : result ? (result.state === "DONE" ? "任务已完成" : "需要人工处理") : task ? "等待执行修复" : "等待新任务" }}
        </strong>
        <p class="text-[10px] text-muted-foreground">
          {{ result ? "审查、修改与回归验证记录均已保存。" : task ? "解析与规则审查已完成。" : "载入图纸后建立可追溯任务。" }}
        </p>
      </div>
    </div>

    <div class="grid overflow-hidden rounded border border-border md:grid-cols-5">
      <div v-for="(step, index) in steps" :key="step.name" class="border-b border-r border-border p-2 last:border-r-0 md:border-b-0">
        <div class="flex items-center gap-1.5">
          <Badge :variant="step.done ? 'success' : 'default'">{{ step.done ? "✓" : index + 1 }}</Badge>
          <strong class="text-[9px]">{{ step.name }}</strong>
        </div>
        <p class="mt-1 text-[8px] text-muted-foreground">{{ step.note }}</p>
      </div>
    </div>

    <Button
      v-if="result"
      variant="outline"
      size="sm"
      class="justify-self-start"
      :disabled="Boolean(busy)"
      @click="emit('explain')"
    >
      生成过程说明
    </Button>

    <div
      v-if="explanation"
      class="grid gap-1.5 rounded border border-sky-300 bg-sky-50 p-2.5 text-[10px] text-muted-foreground"
    >
      <div class="flex items-center justify-between text-sky-900">
        <strong>过程说明</strong>
        <Badge variant="info">{{ explanation.source === "llm" ? "模型生成" : "确定性摘要" }}</Badge>
      </div>
      <p>{{ explanation.summary }}</p>
      <p>{{ explanation.changes }}</p>
      <p>{{ explanation.explanation }}</p>
    </div>
  </div>
</template>
