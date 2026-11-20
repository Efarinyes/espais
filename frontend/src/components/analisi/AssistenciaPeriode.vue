<script setup lang="ts">
import { computed } from "vue";

import { fraccio, nombreEtiqueta, reservesAmbAssistencia } from "../../analisi";
import type { EspaiUsDto, ResumUsDto } from "../../services/analisi";

const props = defineProps<{
  resum: ResumUsDto;
  colors: Record<string, string>;
}>();

const confirmades = computed(() => props.resum.confirmed_count);
const registrades = computed(() =>
  reservesAmbAssistencia(props.resum.confirmed_count, props.resum.unregistered_count),
);
const ambMitjana = computed(() =>
  props.resum.spaces
    .filter((espai) => espai.average_attendance != null)
    .sort((a, b) => a.space_name.localeCompare(b.space_name, "ca")),
);
const senseRegistre = computed(() =>
  props.resum.spaces
    .filter((espai) => espai.confirmed_count > 0 && espai.average_attendance == null)
    .map((espai) => espai.space_name),
);

function ample(espai: EspaiUsDto): string {
  return `${fraccio(espai.average_attendance ?? 0, espai.capacity) * 100}%`;
}

function posicioMinim(espai: EspaiUsDto): string | null {
  if (espai.min_attendance == null || espai.capacity <= 0) {
    return null;
  }
  return `${fraccio(espai.min_attendance, espai.capacity) * 100}%`;
}
</script>

<template>
  <section class="mt-10" aria-labelledby="assistencia-titol" data-assistencia>
    <h2 id="assistencia-titol" class="text-lg font-semibold">Assistència</h2>

    <p v-if="confirmades === 0" class="mt-2 text-base-content/80">
      Sense reserves confirmades en aquest període, no hi ha assistència a mostrar.
    </p>
    <p v-else-if="registrades === 0" class="mt-2 text-base-content/80">
      Encara no s’ha registrat l’assistència de cap reserva d’aquest període. Es registra des de cada
      reserva.
    </p>
    <template v-else>
      <p class="mt-2 text-base-content/80">
        Assistència registrada a {{ registrades }} de {{ confirmades }}
        {{ confirmades === 1 ? "reserva confirmada" : "reserves confirmades" }}.
      </p>
      <ul class="mt-3 divide-y divide-base-content/10" data-assistencia-espais>
        <li v-for="espai in ambMitjana" :key="espai.space_id" class="py-3">
          <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span class="flex min-w-0 items-center gap-2">
              <span
                class="h-3 w-3 shrink-0 rounded-full bg-base-content/30"
                :style="{ backgroundColor: colors[espai.space_id] }"
                aria-hidden="true"
              />
              <span class="truncate font-semibold" :title="espai.space_name">{{ espai.space_name }}</span>
            </span>
            <span class="text-sm tabular-nums">
              <span class="text-base font-semibold">{{ nombreEtiqueta(espai.average_attendance ?? 0) }}</span>
              <span class="text-base-content/70"> de {{ espai.capacity }} d’aforament</span>
              <span v-if="espai.min_attendance != null" class="text-base-content/70">
                · mínim {{ espai.min_attendance }}
              </span>
            </span>
          </div>
          <div class="mt-2 flex items-center gap-3">
            <div class="barra-pista relative h-2 min-w-0 flex-1 rounded-full" aria-hidden="true">
              <div
                class="h-2 rounded-full"
                style="background-color: var(--color-primary-border)"
                :style="{ width: ample(espai) }"
              />
              <span
                v-if="posicioMinim(espai)"
                class="absolute -top-1 h-4 w-0.5 bg-base-content"
                :style="{ left: posicioMinim(espai) ?? undefined }"
              />
            </div>
            <span v-if="espai.below_min_attendance" class="shrink-0 whitespace-nowrap rounded-full border border-error px-2.5 py-0.5 text-sm text-error">
              Per sota del mínim
            </span>
          </div>
        </li>
      </ul>
      <p v-if="senseRegistre.length > 0" class="mt-3 text-sm text-base-content/70">
        Sense assistència registrada: {{ senseRegistre.join(", ") }}.
      </p>
    </template>
  </section>
</template>

<style scoped>
.barra-pista {
  background-color: color-mix(in oklab, var(--color-base-content) 12%, transparent);
}
</style>
