<script setup lang="ts">
import { DialogOverlay, type DialogOverlayProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<DialogOverlayProps & { class?: HTMLAttributes["class"] }>();
</script>

<template>
  <DialogOverlay
    :class="cn('fixed inset-0 z-50 bg-foreground/35 backdrop-blur-[1px]', props.class)"
  />
</template>
