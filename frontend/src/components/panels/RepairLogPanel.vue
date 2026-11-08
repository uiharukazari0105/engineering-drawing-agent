<script setup lang="ts">
import { Clock3, Wrench } from "@lucide/vue";
import { Badge } from "@/components/ui/badge";
import type { FixRecord } from "@/types/api";

defineProps<{ fixes: FixRecord[] }>();
</script>

<template>
  <div v-if="!fixes.length" class="grid min-h-[130px] content-center justify-items-center gap-1.5 text-center">
    <Clock3 :size="24" class="text-muted-foreground" />
    <strong class="text-xs font-medium">尚无执行记录</strong>
    <span class="text-[10px] text-muted-foreground">参数变更、影响范围和回归结果会记录在这里。</span>
  </div>
  <div v-else class="grid border-t border-border">
    <article
      v-for="fix in fixes"
      :key="fix.fix_id"
      class="border-b border-border border-l-[3px] px-3 py-2.5"
      :class="fix.rolled_back ? 'border-l-amber-600' : 'border-l-emerald-600'"
    >
      <div class="flex flex-wrap items-center gap-1.5">
        <span class="inline-flex items-center gap-1 text-[9px] text-muted-foreground">
          <Wrench :size="13" /> 参数修复
        </span>
        <strong class="font-mono text-[10px]">{{ fix.fix_id }}</strong>
        <Badge :variant="fix.rolled_back ? 'warning' : fix.regression_passed ? 'success' : 'default'">
          {{ fix.rolled_back ? "已回滚" : fix.regression_passed ? "回归通过" : "待验证" }}
        </Badge>
        <Badge>预算 #{{ fix.budget_used }}</Badge>
      </div>
      <div class="mt-2 flex flex-wrap gap-1">
        <span
          v-for="change in fix.changes"
          :key="change.param"
          class="inline-flex items-center gap-1.5 rounded border border-border bg-secondary/45 px-1.5 py-1 font-mono text-[9px]"
        >
          {{ change.param }}
          <span class="text-muted-foreground line-through">{{ change.old }}</span>
          <span class="text-emerald-700">→ {{ change.new }}</span>
        </span>
      </div>
      <div v-if="fix.affected_constraints.length" class="mt-1.5 flex flex-wrap gap-1">
        <Badge v-for="id in fix.affected_constraints" :key="id" variant="info">{{ id }}</Badge>
      </div>
      <p v-if="fix.note" class="mt-1 text-[10px] text-muted-foreground">{{ fix.note }}</p>
    </article>
  </div>
</template>
