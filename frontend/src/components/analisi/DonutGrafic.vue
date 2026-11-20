<script setup lang="ts">
import { computed } from "vue";

import { arcsDonut, type PartDonut } from "./donut";

const props = defineProps<{
  parts: readonly PartDonut[];
  /** El 100 % del cercle. Sense ell, la suma de les parts. */
  total?: number;
  /** Text per a lectors de pantalla; les xifres exactes són al costat, en HTML. */
  etiqueta: string;
}>();

const arcs = computed(() => arcsDonut(props.parts, props.total));
</script>

<template>
  <div class="relative aspect-square w-full">
    <svg class="h-full w-full -rotate-90" viewBox="0 0 100 100" role="img" :aria-label="etiqueta">
      <circle
        class="donut-pista"
        cx="50"
        cy="50"
        r="40"
        fill="none"
        stroke-width="13"
        pathLength="100"
      />
      <circle
        v-for="arc in arcs"
        :key="arc.id"
        cx="50"
        cy="50"
        r="40"
        fill="none"
        stroke-width="13"
        pathLength="100"
        :stroke="arc.color"
        :stroke-dasharray="arc.dasharray"
        :stroke-dashoffset="arc.dashoffset"
        data-arc-donut
      />
    </svg>
    <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.donut-pista {
  stroke: color-mix(in oklab, var(--color-base-content) 12%, transparent);
}
</style>
