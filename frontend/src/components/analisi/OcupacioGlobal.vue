<script setup lang="ts">
import { computed } from "vue";

import { horesEtiqueta, horesLliures, percentatgeOcupacio, senseHoresDisponibles } from "../../analisi";
import type { ResumUsDto } from "../../services/analisi";
import DonutGrafic from "./DonutGrafic.vue";

const props = defineProps<{ resum: ResumUsDto }>();

const senseHores = computed(() => senseHoresDisponibles(props.resum.available_hours));
const lliures = computed(() => horesLliures(props.resum.reserved_hours, props.resum.available_hours));
const parts = computed(() => [
  { id: "ocupades", valor: props.resum.reserved_hours, color: "var(--color-primary-border)" },
]);
const etiqueta = computed(
  () =>
    `Ocupació global: ${percentatgeOcupacio(props.resum.occupancy_ratio)}, ` +
    `${horesEtiqueta(props.resum.reserved_hours)} ocupades i ${horesEtiqueta(lliures.value)} lliures.`,
);
</script>

<template>
  <section class="@container" aria-labelledby="ocupacio-titol" data-grafic="ocupacio">
    <h2 id="ocupacio-titol" class="text-lg font-semibold">Ocupació global</h2>
    <p v-if="senseHores" class="mt-4 text-base-content/80">
      Cap espai té horari de disponibilitat en aquest període, i per això no es pot calcular l’ocupació.
    </p>
    <div v-else class="mt-4 flex items-center gap-5 @sm:gap-8">
      <div class="w-32 shrink-0 @sm:w-40">
        <DonutGrafic :parts="parts" :total="resum.available_hours" :etiqueta="etiqueta">
          <span class="text-2xl font-semibold tabular-nums leading-none @sm:text-3xl">
            {{ percentatgeOcupacio(resum.occupancy_ratio) }}
          </span>
          <span class="mt-1 text-sm text-base-content/70">d’ocupació</span>
        </DonutGrafic>
      </div>
      <dl class="min-w-0 space-y-3">
        <div>
          <dt class="flex items-center gap-2 text-sm text-base-content/70">
            <span
              class="h-3 w-3 shrink-0 rounded-full bg-base-content/30"
              style="background-color: var(--color-primary-border)"
              aria-hidden="true"
            />
            Ocupades
          </dt>
          <dd class="text-2xl font-semibold tabular-nums">{{ horesEtiqueta(resum.reserved_hours) }}</dd>
        </div>
        <div>
          <dt class="flex items-center gap-2 text-sm text-base-content/70">
            <span
              class="h-3 w-3 shrink-0 rounded-full border-2 border-base-content/40"
              aria-hidden="true"
            />
            Lliures
          </dt>
          <dd class="text-2xl font-semibold tabular-nums">{{ horesEtiqueta(lliures) }}</dd>
        </div>
        <p class="text-sm text-base-content/70">
          Horari disponible: {{ horesEtiqueta(resum.available_hours) }}
        </p>
      </dl>
    </div>
  </section>
</template>
