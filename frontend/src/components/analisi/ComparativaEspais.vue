<script setup lang="ts">
import { computed } from "vue";

import {
  espaisPerOcupacio,
  fraccio,
  horesEtiqueta,
  percentatgeOcupacio,
  senseHoresDisponibles,
} from "../../analisi";
import type { EspaiUsDto } from "../../services/analisi";

const props = defineProps<{
  espais: readonly EspaiUsDto[];
  colors: Record<string, string>;
  /** Id de l’espai que arriba des de la targeta de la llista d’espais (`#espai-<id>`). */
  destacat: string;
}>();

const files = computed(() => espaisPerOcupacio(props.espais));

function ample(espai: EspaiUsDto): string {
  return `${fraccio(espai.occupancy_ratio, 1) * 100}%`;
}

function resumMobil(espai: EspaiUsDto): string {
  const parts = [
    senseHoresDisponibles(espai.available_hours)
      ? "Sense horari disponible"
      : `${horesEtiqueta(espai.reserved_hours)} de ${horesEtiqueta(espai.available_hours)}`,
    `${espai.confirmed_count} ${espai.confirmed_count === 1 ? "reserva" : "reserves"}`,
  ];
  if (espai.cancelled_count > 0) {
    parts.push(`${espai.cancelled_count} ${espai.cancelled_count === 1 ? "anul·lada" : "anul·lades"}`);
  }
  return parts.join(" · ");
}
</script>

<template>
  <section class="mt-10" aria-labelledby="per-espai">
    <div class="flex flex-wrap items-baseline justify-between gap-x-4">
      <h2 id="per-espai" class="text-lg font-semibold">Ocupació per espai</h2>
      <a v-if="destacat" class="link min-h-11 content-center text-sm" href="#per-espai" data-treu-ressaltat>
        Treu el ressaltat
      </a>
    </div>
    <table class="mt-2 w-full text-start" data-comparativa>
      <caption class="sr-only">
        Ocupació, hores i reserves de cada espai, del més al menys ocupat
      </caption>
      <thead class="sr-only sm:not-sr-only">
        <tr class="border-b border-base-content/20 text-sm text-base-content/70">
          <th scope="col" class="py-2 pe-3 text-start font-medium">Espai</th>
          <th scope="col" class="py-2 pe-3 text-start font-medium">Ocupació</th>
          <th scope="col" class="hidden py-2 pe-3 text-end font-medium sm:table-cell">Hores</th>
          <th scope="col" class="hidden py-2 pe-3 text-end font-medium sm:table-cell">Reserves</th>
          <th scope="col" class="hidden py-2 text-end font-medium sm:table-cell">Anul·lades</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="espai in files"
          :id="`espai-${espai.space_id}`"
          :key="espai.space_id"
          class="scroll-mt-24 border-b border-base-content/10 align-middle last:border-b-0"
          :class="espai.space_id === destacat ? 'bg-[var(--color-selected)]' : ''"
          :aria-current="espai.space_id === destacat ? 'true' : undefined"
          data-fila-espai
        >
          <th scope="row" class="w-full max-w-0 py-3 ps-1 pe-3 text-start font-normal">
            <span class="flex min-w-0 items-center gap-2">
              <span
                class="h-3 w-3 shrink-0 rounded-full bg-base-content/30"
                :style="{ backgroundColor: colors[espai.space_id] }"
                aria-hidden="true"
              />
              <span class="truncate font-semibold" :title="espai.space_name">{{ espai.space_name }}</span>
            </span>
            <span class="mt-0.5 block text-sm text-base-content/70 sm:hidden">{{ resumMobil(espai) }}</span>
          </th>
          <td class="w-40 whitespace-nowrap py-3 pe-3 sm:w-64">
            <div v-if="senseHoresDisponibles(espai.available_hours)" class="text-base-content/70">
              <span aria-hidden="true">—</span><span class="sr-only">Sense horari disponible</span>
            </div>
            <div v-else class="flex items-center gap-3">
              <div
                class="barra-pista h-2 min-w-0 flex-1 rounded-full"
                role="meter"
                :aria-valuemin="0"
                :aria-valuemax="100"
                :aria-valuenow="Math.round(espai.occupancy_ratio * 100)"
                :aria-label="`${espai.space_name}: ${percentatgeOcupacio(espai.occupancy_ratio)}`"
              >
                <div
                  class="h-2 rounded-full"
                  style="background-color: var(--color-primary-border)"
                  :style="{ width: ample(espai) }"
                />
              </div>
              <span class="w-14 text-end font-semibold tabular-nums">
                {{ percentatgeOcupacio(espai.occupancy_ratio) }}
              </span>
            </div>
          </td>
          <td class="hidden whitespace-nowrap py-3 pe-3 text-end tabular-nums sm:table-cell">
            {{ horesEtiqueta(espai.reserved_hours) }}
            <span class="text-base-content/70">de {{ horesEtiqueta(espai.available_hours) }}</span>
          </td>
          <td class="hidden py-3 pe-3 text-end tabular-nums sm:table-cell">{{ espai.confirmed_count }}</td>
          <td class="hidden py-3 text-end tabular-nums sm:table-cell">{{ espai.cancelled_count }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.barra-pista {
  background-color: color-mix(in oklab, var(--color-base-content) 12%, transparent);
}
</style>
