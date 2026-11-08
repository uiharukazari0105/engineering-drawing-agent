<script setup lang="ts">
import { Check, Layers3, TriangleAlert } from "@lucide/vue";
import { Badge } from "@/components/ui/badge";
import type { AssemblyFinding, WorkbenchDocument } from "@/stores/workbench";

defineProps<{
  documents: WorkbenchDocument[];
  findings: AssemblyFinding[];
}>();
</script>

<template>
  <div class="grid gap-3">
    <div class="grid gap-1.5 md:grid-cols-3">
      <div
        v-for="document in documents"
        :key="document.id"
        class="rounded border border-border bg-card p-2"
      >
        <div class="flex items-center gap-1.5">
          <Layers3 :size="13" class="text-primary" />
          <strong class="truncate text-[10px]">{{ document.title }}</strong>
          <Badge class="ml-auto">{{ document.geometry?.hole_count ?? 0 }} 孔</Badge>
        </div>
        <p class="mt-1 font-mono text-[9px] text-muted-foreground">
          {{ document.geometry ? `${document.geometry.bbox.length}×${document.geometry.bbox.width}×${document.geometry.bbox.height} mm` : "无几何数据" }}
        </p>
      </div>
    </div>

    <div class="grid gap-1.5">
      <div
        v-for="finding in findings"
        :key="finding.title"
        class="flex items-start gap-2 rounded border p-2.5"
        :class="{
          'border-emerald-300 bg-emerald-50': finding.level === 'pass',
          'border-amber-300 bg-amber-50': finding.level === 'warn',
          'border-red-300 bg-red-50': finding.level === 'error',
        }"
      >
        <Check v-if="finding.level === 'pass'" :size="15" class="mt-0.5 text-emerald-700" />
        <TriangleAlert v-else :size="15" class="mt-0.5 text-amber-700" />
        <div>
          <strong class="block text-[10px]">{{ finding.title }}</strong>
          <span class="text-[9px] text-muted-foreground">{{ finding.detail }}</span>
        </div>
      </div>
    </div>

    <p class="text-[9px] text-muted-foreground">
      当前执行基础接口一致性检查；装配位姿、干涉体积和完整约束求解仍属于后续后端几何能力。
    </p>
  </div>
</template>
