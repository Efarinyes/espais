<script setup lang="ts">
import { computed } from "vue";

import {
  espaiMesActiu,
  horesEtiqueta,
  nombreEtiqueta,
  percentatgeOcupacio,
  reservesAmbAssistencia,
  senseHoresDisponibles,
} from "../../analisi";
import type { ResumUsDto } from "../../services/analisi";

const props = defineProps<{
  resum: ResumUsDto;
  colors: Record<string, string>;
}>();

const senseHores = computed(() => senseHoresDisponibles(props.resum.available_hours));
const actiu = computed(() => espaiMesActiu(props.resum.spaces));
const ambAssistencia = computed(() =>
  reservesAmbAssistencia(props.resum.confirmed_count, props.resum.unregistered_count),
);
const anulacions = computed(() => {
  const n = props.resum.cancelled_count;
  if (n === 0) {
    return "Cap anul·lació";
  }
  return `${n} ${n === 1 ? "anul·lada" : "anul·lades"}`;
});
const subAssistencia = computed(() => {
  if (props.resum.confirmed_count === 0) {
    return "Sense reserves confirmades";
  }
  if (ambAssistencia.value === 0) {
    return "Cap reserva amb assistència registrada";
  }
  return `Registrada a ${ambAssistencia.value} de ${props.resum.confirmed_count}`;
});
const subActiu = computed(() => {
  const espai = actiu.value;
  if (!espai) {
    return "";
  }
  const reserves = `${espai.confirmed_count} ${espai.confirmed_count === 1 ? "reserva" : "reserves"}`;
  if (senseHoresDisponibles(espai.available_hours)) {
    return reserves;
  }
  return `${reserves} · ${percentatgeOcupacio(espai.occupancy_ratio)} d’ocupació`;
});
</script>

<template>
  <section class="@container mt-6" aria-labelledby="indicadors-titol">
    <h2 id="indicadors-titol" class="sr-only">Indicadors principals</h2>
    <dl
      class="grid grid-cols-2 gap-y-6 border-y border-base-content/15 py-5 @2xl:grid-cols-4"
      data-indicadors
    >
      <div class="min-w-0 pe-3" data-kpi="ocupacio">
        <dt class="text-sm text-base-content/70">Ocupació global</dt>
        <dd class="mt-1 text-3xl font-semibold tabular-nums">
          {{ senseHores ? "—" : percentatgeOcupacio(resum.occupancy_ratio) }}
        </dd>
        <dd class="mt-1 text-sm text-base-content/70">
          <template v-if="senseHores">Sense horari disponible</template>
          <template v-else>
            {{ horesEtiqueta(resum.reserved_hours) }} de {{ horesEtiqueta(resum.available_hours) }}
          </template>
        </dd>
      </div>

      <div class="min-w-0 border-s border-base-content/15 ps-4 pe-3" data-kpi="reserves">
        <dt class="text-sm text-base-content/70">Reserves</dt>
        <dd class="mt-1 text-3xl font-semibold tabular-nums">{{ resum.confirmed_count }}</dd>
        <dd class="mt-1 text-sm text-base-content/70">{{ anulacions }}</dd>
      </div>

      <div class="min-w-0 pe-3 @2xl:border-s @2xl:border-base-content/15 @2xl:ps-4" data-kpi="assistencia">
        <dt class="text-sm text-base-content/70">Assistència mitjana</dt>
        <dd
          v-if="resum.average_attendance != null"
          class="mt-1 text-3xl font-semibold tabular-nums"
        >
          {{ nombreEtiqueta(resum.average_attendance) }}
        </dd>
        <dd v-else class="mt-1 text-3xl font-semibold text-base-content/70">
          <span aria-hidden="true">—</span><span class="sr-only">Sense dades</span>
        </dd>
        <dd class="mt-1 text-sm text-base-content/70">{{ subAssistencia }}</dd>
      </div>

      <div class="min-w-0 border-s border-base-content/15 ps-4 pe-3" data-kpi="espai-actiu">
        <dt class="text-sm text-base-content/70">Espai amb més activitat</dt>
        <dd v-if="actiu" class="mt-1 flex min-w-0 items-center gap-2 text-xl font-semibold leading-9">
          <span
            class="h-3 w-3 shrink-0 rounded-full bg-base-content/30"
            :style="{ backgroundColor: colors[actiu.space_id] }"
            aria-hidden="true"
          />
          <span class="truncate" :title="actiu.space_name">{{ actiu.space_name }}</span>
        </dd>
        <dd v-else class="mt-1 text-3xl font-semibold text-base-content/70">
          <span aria-hidden="true">—</span><span class="sr-only">Sense dades</span>
        </dd>
        <dd class="mt-1 text-sm text-base-content/70">
          {{ actiu ? subActiu : "Cap reserva aquest període" }}
        </dd>
      </div>
    </dl>
  </section>
</template>
