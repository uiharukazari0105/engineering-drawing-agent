<script setup lang="ts">
import { TabsTrigger, type TabsTriggerProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<TabsTriggerProps & { class?: HTMLAttributes["class"] }>();
</script>

<template>
  <TabsTrigger
    :class="
      cn(
        'inline-flex h-9 items-center gap-1.5 border-b-2 border-transparent px-3 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-card data-[state=active]:font-medium data-[state=active]:text-foreground',
        props.class,
      )
    "
  >
    <slot />
  </TabsTrigger>
</template>
