<script setup lang="ts">
import { computed } from "vue";
import { ShieldCheck } from "@lucide/vue";
import { Badge } from "@/components/ui/badge";
import type { CompareResult, FixRecord, WorkflowResult } from "@/types/api";

const props = defineProps<{
  compare: CompareResult | null;
  result: WorkflowResult | null;
}>();

const rows = computed(() => {
  if (props.compare?.changed_params.length) return props.compare.changed_params;
  return (props.result?.fixes ?? []).flatMap((fix: FixRecord) =>
    fix.changes.map((change) => ({
      param: change.param,
      before: change.old,
      after: change.new,
      delta: Number((change.new - change.old).toFixed(4)),
    })),
  );
});

const remaining = computed(() => props.compare?.remaining ?? props.result?.remaining ?? []);
const resolved = computed(() => props.compare?.resolved ?? []);
</script>

<template>
  <div v-if="!rows.length && !result" class="grid min-h-[130px] content-center justify-items-center gap-1.5 text-center">
    <ShieldCheck :size="24" class="text-muted-foreground" />
    <strong class="text-xs font-medium">等待验证结果</strong>
    <span class="text-[10px] text-muted-foreground">修复后会显示参数差异和问题收敛情况。</span>
  </div>
  <div v-else class="grid gap-3">
    <div class="grid grid-cols-4 overflow-hidden rounded border border-border">
      <div class="border-r border-border px-2 py-2 text-center last:border-r-0">
        <b class="font-mono text-lg">{{ rows.length }}</b>
        <small class="block text-[9px] text-muted-foreground">变更参数</small>
      </div>
      <div class="border-r border-border px-2 py-2 text-center last:border-r-0">
        <b class="font-mono text-lg text-emerald-700">{{ resolved.length || result?.resolved || 0 }}</b>
        <small class="block text-[9px] text-muted-foreground">已解决</small>
      </div>
      <div class="border-r border-border px-2 py-2 text-center last:border-r-0">
        <b class="font-mono text-lg text-amber-700">{{ remaining.length }}</b>
        <small class="block text-[9px] text-muted-foreground">剩余</small>
      </div>
      <div class="px-2 py-2 text-center">
        <b class="font-mono text-lg">{{ compare ? compare.before_issue_count - compare.after_issue_count : 0 }}</b>
        <small class="block text-[9px] text-muted-foreground">问题变化</small>
      </div>
    </div>

    <div v-if="rows.length" class="grid gap-1.5">
      <div v-for="row in rows" :key="row.param" class="grid grid-cols-[130px_1fr] items-center gap-2">
        <span class="font-mono text-[9px]">{{ row.param }}</span>
        <div class="rounded border border-border bg-card px-2 py-1 font-mono text-[9px]">
          {{ row.before }} → {{ row.after }}
          <span :class="row.delta > 0 ? 'text-emerald-700' : 'text-red-700'">
            ({{ row.delta > 0 ? "+" : "" }}{{ row.delta }})
          </span>
        </div>
      </div>
    </div>

    <div class="flex flex-wrap gap-1">
      <Badge v-for="id in resolved" :key="`resolved-${id}`" variant="success">{{ id }}</Badge>
      <Badge v-for="id in remaining" :key="`remaining-${id}`" variant="warning">{{ id }}</Badge>
    </div>
  </div>
</template>
