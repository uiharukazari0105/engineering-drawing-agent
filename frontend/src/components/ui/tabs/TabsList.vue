<script setup lang="ts">
import { TabsList, type TabsListProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<TabsListProps & { class?: HTMLAttributes["class"] }>();
</script>

<template>
  <TabsList :class="cn('flex items-center', props.class)">
    <slot />
  </TabsList>
</template>
