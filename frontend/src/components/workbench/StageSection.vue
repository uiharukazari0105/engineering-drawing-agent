<script setup lang="ts">
withDefaults(
  defineProps<{
    id: string;
    title: string;
    meta?: string;
    bodyClass?: string;
  }>(),
  { meta: "", bodyClass: "" },
);
</script>

<template>
  <section :id="id" class="stage-section">
    <header class="stage-head">
      <div class="stage-heading">
        <h2>{{ title }}</h2>
      </div>
      <span v-if="meta" class="stage-meta">{{ meta }}</span>
    </header>
    <div class="stage-body" :class="bodyClass">
      <slot />
    </div>
  </section>
</template>
