<script setup lang="ts">
import {
  DialogContent,
  DialogPortal,
  type DialogContentEmits,
  type DialogContentProps,
} from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import DialogOverlay from "./DialogOverlay.vue";

const props = defineProps<DialogContentProps & { class?: HTMLAttributes["class"] }>();
defineEmits<DialogContentEmits>();
</script>

<template>
  <DialogPortal>
    <DialogOverlay />
    <DialogContent
      :class="
        cn(
          'fixed left-1/2 top-1/2 z-50 w-[min(440px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-md border border-border bg-card shadow-xl outline-none',
          props.class,
        )
      "
    >
      <slot />
    </DialogContent>
  </DialogPortal>
</template>
