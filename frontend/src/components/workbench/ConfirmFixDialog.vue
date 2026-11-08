<script setup lang="ts">
import {
  DialogClose,
  DialogDescription,
  DialogRoot,
  DialogTitle,
} from "reka-ui";
import { Wrench, X } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { DialogContent } from "@/components/ui/dialog";

defineProps<{
  open: boolean;
  budget: number;
  issueCount: number;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  confirm: [];
}>();
</script>

<template>
  <DialogRoot :open="open" @update:open="emit('update:open', $event)">
    <DialogContent>
      <div class="flex items-start justify-between gap-3 border-b border-border bg-secondary/55 p-3">
        <div>
          <DialogTitle class="text-[13px] font-semibold">确认执行参数修复</DialogTitle>
          <DialogDescription class="mt-1 text-[10px] text-muted-foreground">
            系统将在硬预算内修改参数并执行回归验证。
          </DialogDescription>
        </div>
        <DialogClose as-child>
          <Button variant="ghost" size="icon" aria-label="关闭确认弹窗">
            <X :size="15" />
          </Button>
        </DialogClose>
      </div>
      <div class="grid gap-2.5 p-3 text-[11px] text-muted-foreground">
        <p>可修复问题会进入自动处理，低置信度和高风险项将转入人工确认。</p>
        <div class="grid grid-cols-3 overflow-hidden rounded border border-border">
          <div class="border-r border-border p-2">
            <span class="block text-[8px] text-muted-foreground">待审查问题</span>
            <strong class="font-mono text-[11px] text-foreground">{{ issueCount }} 项</strong>
          </div>
          <div class="border-r border-border p-2">
            <span class="block text-[8px] text-muted-foreground">修复预算</span>
            <strong class="font-mono text-[11px] text-foreground">{{ budget }} 步</strong>
          </div>
          <div class="p-2">
            <span class="block text-[8px] text-muted-foreground">安全策略</span>
            <strong class="font-mono text-[11px] text-foreground">失败回滚</strong>
          </div>
        </div>
      </div>
      <div class="flex justify-end gap-1.5 border-t border-border bg-secondary/55 p-2.5">
        <DialogClose as-child>
          <Button variant="outline" size="sm">取消</Button>
        </DialogClose>
        <Button size="sm" @click="emit('confirm')">
          <Wrench :size="14" />
          确认并执行
        </Button>
      </div>
    </DialogContent>
  </DialogRoot>
</template>
