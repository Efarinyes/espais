<script setup lang="ts">
import { computed } from "vue";

import { fraccio, repartimentReserves } from "../../analisi";
import type { ResumUsDto } from "../../services/analisi";
import DonutGrafic from "./DonutGrafic.vue";

const props = defineProps<{
  resum: ResumUsDto;
  colors: Record<string, string>;
}>();

const espais = computed(() => repartimentReserves(props.resum.spaces));
const total = computed(() => props.resum.confirmed_count);
const parts = computed(() =>
  espais.value.map((espai) => ({
    id: espai.space_id,
    valor: espai.confirmed_count,
    color: props.colors[espai.space_id] ?? "var(--color-primary-border)",
  })),
);
const etiqueta = computed(
  () =>
    `Reserves per espai: ${total.value} en total. ` +
    espais.value.map((espai) => `${espai.space_name}, ${espai.confirmed_count}`).join("; ") +
    ".",
);

function percentatge(part: number): string {
  return `${Math.round(fraccio(part, total.value) * 100)} %`;
}
</script>

<template>
  <section class="@container" aria-labelledby="repartiment-titol" data-grafic="repartiment">
    <h2 id="repartiment-titol" class="text-lg font-semibold">Reserves per espai</h2>
    <p v-if="espais.length === 0" class="mt-4 text-base-content/80">
      No hi ha cap reserva confirmada en aquest període.
    </p>
    <div v-else class="mt-4 flex items-center gap-5 @sm:gap-8">
      <div class="w-32 shrink-0 @sm:w-40">
        <DonutGrafic :parts="parts" :etiqueta="etiqueta">
          <span class="text-2xl font-semibold tabular-nums leading-none @sm:text-3xl">{{ total }}</span>
          <span class="mt-1 text-sm text-base-content/70">{{ total === 1 ? "reserva" : "reserves" }}</span>
        </DonutGrafic>
      </div>
      <ul class="min-w-0 flex-1 space-y-2" data-llegenda-repartiment>
        <li v-for="espai in espais" :key="espai.space_id" class="flex min-w-0 items-center gap-2">
          <span
            class="h-3 w-3 shrink-0 rounded-full bg-base-content/30"
            :style="{ backgroundColor: colors[espai.space_id] }"
            aria-hidden="true"
          />
          <span class="min-w-0 flex-1 truncate" :title="espai.space_name">{{ espai.space_name }}</span>
          <span class="font-semibold tabular-nums">{{ espai.confirmed_count }}</span>
          <span class="w-12 text-end text-sm tabular-nums text-base-content/70">
            {{ percentatge(espai.confirmed_count) }}
          </span>
        </li>
      </ul>
    </div>
  </section>
</template>
