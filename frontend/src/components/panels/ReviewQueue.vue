<script setup lang="ts">
import { computed } from "vue";
import { Check, Download, UserRound } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { TaskResponse, WorkflowResult } from "@/types/api";

const props = defineProps<{
  task: TaskResponse | null;
  result: WorkflowResult | null;
  busy: string | null;
}>();

const emit = defineEmits<{ export: [] }>();

const reasons: Record<string, string> = {
  budget_exhausted: "修复预算已用尽",
  low_confidence: "解析置信度不足",
  not_fixable: "当前问题不适合参数修复",
  propose_error: "修复候选生成失败",
  no_safe_candidate: "未找到满足安全约束的候选方案",
};

const pending = computed(() => {
  if (props.result) {
    return props.result.pending_confirmation.map((item) => ({
      title: item.issue,
      reason: reasons[item.reason] ?? item.reason,
      detail:
        item.detail ??
        (item.confidence != null ? `置信度 ${item.confidence.toFixed(2)}` : "请结合原始证据人工复核"),
    }));
  }
  return (props.task?.parse.pending ?? []).map((id) => ({
    title: id,
    reason: "该参数需要人工确认",
    detail: "请核对图纸来源与尺寸证据后再继续",
  }));
});
</script>

<template>
  <div v-if="!pending.length" class="grid min-h-[130px] content-center justify-items-center gap-1.5 p-4 text-center">
    <span class="grid size-8 place-items-center rounded border border-border bg-muted text-muted-foreground">
      <Check v-if="task" :size="18" />
      <UserRound v-else :size="18" />
    </span>
    <strong class="text-xs font-medium">{{ task ? "当前无需人工处理" : "暂无待处理事项" }}</strong>
    <span class="max-w-md text-[10px] text-muted-foreground">
      {{ task ? "低置信度参数和高风险修复会集中在这里。" : "创建任务后显示待确认事项。" }}
    </span>
  </div>

  <div v-else class="grid gap-2">
    <div
      v-for="item in pending"
      :key="`${item.title}-${item.reason}`"
      class="rounded border border-amber-300 border-l-[3px] border-l-amber-600 bg-amber-50 px-2.5 py-2"
    >
      <div class="flex items-center justify-between gap-2">
        <strong class="font-mono text-[10px]">{{ item.title }}</strong>
        <Badge variant="warning">待确认</Badge>
      </div>
      <div class="mt-1 text-[11px]">{{ item.reason }}</div>
      <div class="mt-0.5 text-[10px] text-muted-foreground">{{ item.detail }}</div>
    </div>
    <Button
      v-if="result"
      variant="outline"
      size="sm"
      class="justify-self-start"
      :disabled="busy === 'export'"
      @click="emit('export')"
    >
      <Download :size="14" />
      导出待处理记录
    </Button>
  </div>
</template>
