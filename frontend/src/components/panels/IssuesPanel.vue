<script setup lang="ts">
import { computed, ref } from "vue";
import { ShieldCheck, Target } from "@lucide/vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Issue } from "@/types/api";

const props = defineProps<{
  issues: Issue[];
  remainingIds: string[] | null;
}>();
const emit = defineEmits<{ select: [issue: Issue] }>();
const filter = ref<"all" | "open" | "resolved">("all");

const layerLabels: Record<string, string> = {
  geometric: "几何约束",
  drawing_model: "图纸一致性",
  design_intent: "设计意图",
};

function resolved(issue: Issue) {
  return Boolean(props.remainingIds && issue.constraint_id && !props.remainingIds.includes(issue.constraint_id));
}

const visible = computed(() =>
  props.issues.filter((issue) => {
    if (filter.value === "all") return true;
    return filter.value === "resolved" ? resolved(issue) : !resolved(issue);
  }),
);
</script>

<template>
  <div v-if="!issues.length" class="grid min-h-[130px] content-center justify-items-center gap-1.5 text-center">
    <ShieldCheck :size="24" class="text-muted-foreground" />
    <strong class="text-xs font-medium">暂无审查问题</strong>
    <span class="text-[10px] text-muted-foreground">审查结果会按约束逐条列在这里。</span>
  </div>
  <div v-else class="grid gap-2">
    <div class="flex items-center justify-between gap-2">
      <div class="inline-flex overflow-hidden rounded border border-border">
        <button
          v-for="value in ['all', 'open', 'resolved'] as const"
          :key="value"
          type="button"
          class="h-7 border-r border-border px-2.5 text-[10px] last:border-r-0"
          :class="{ 'bg-primary text-primary-foreground': filter === value }"
          @click="filter = value"
        >
          {{ value === "all" ? "全部" : value === "open" ? "待处理" : "已解决" }}
        </button>
      </div>
      <span class="font-mono text-[9px] text-muted-foreground">显示 {{ visible.length }} / {{ issues.length }}</span>
    </div>
    <div class="border-t border-border">
      <article
        v-for="issue in visible"
        :key="issue.id"
        :class="
          cn(
            'relative border-b border-border px-3 py-2.5 pl-4 hover:bg-secondary/35',
            issue.severity === 'high' && 'before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-red-600',
            issue.severity === 'medium' && 'before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-amber-600',
            issue.severity === 'low' && 'before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-primary',
          )
        "
      >
        <div class="flex flex-wrap items-center gap-1.5">
          <Badge :variant="issue.severity === 'high' ? 'danger' : issue.severity === 'medium' ? 'warning' : 'info'">
            {{ issue.severity }}
          </Badge>
          <strong class="font-mono text-[10px]">{{ issue.constraint_id ?? issue.code }}</strong>
          <Badge v-if="resolved(issue)" variant="success">已解决</Badge>
          <Badge class="ml-auto">{{ layerLabels[issue.layer] }}</Badge>
        </div>
        <p class="mt-1 text-[11px] text-muted-foreground">{{ issue.evidence.join("；") || "无附加证据" }}</p>
        <Button
          v-if="issue.fix_hint"
          variant="ghost"
          size="sm"
          class="mt-1.5"
          @click="emit('select', issue)"
        >
          <Target :size="13" />
          在模型中定位
        </Button>
      </article>
    </div>
  </div>
</template>
