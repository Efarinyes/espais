<script setup lang="ts">
import { computed } from "vue";

import type { ReservaDto } from "../../services/reserves";
import { diaMadrid, horariMadrid } from "../../utils/formatData";

const props = defineProps<{
  reserves: readonly ReservaDto[];
  colors: Record<string, string>;
}>();

const files = computed(() =>
  [...props.reserves].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  ),
);

function anulada(reserva: ReservaDto): boolean {
  return reserva.status === "cancelled";
}

function etiquetaEstat(status: string): string {
  if (status === "cancelled") {
    return "Anul·lada";
  }
  if (status === "confirmed") {
    return "Confirmada";
  }
  return status;
}

/** Etiqueta discreta amb vora: l’estat es llegeix pel text, el color només l’acompanya. */
function classeEstat(reserva: ReservaDto): string {
  const to = anulada(reserva) ? "border-error text-error" : "border-success text-success";
  return `inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-sm ${to}`;
}
</script>

<template>
  <section class="mt-10" aria-labelledby="llista-periode">
    <h2 id="llista-periode" class="text-lg font-semibold">Reserves del període</h2>
    <table class="mt-2 w-full text-start" data-reserves-periode>
      <caption class="sr-only">
        Reserves del període, per ordre cronològic
      </caption>
      <thead class="sr-only sm:not-sr-only">
        <tr class="border-b border-base-content/20 text-sm text-base-content/70">
          <th scope="col" class="py-2 pe-3 text-start font-medium">Dia</th>
          <th scope="col" class="hidden py-2 pe-3 text-start font-medium sm:table-cell">Horari</th>
          <th scope="col" class="py-2 pe-3 text-start font-medium">Espai</th>
          <th scope="col" class="hidden py-2 pe-3 text-start font-medium sm:table-cell">Coordinador</th>
          <th scope="col" class="hidden py-2 pe-3 text-start font-medium sm:table-cell">Estat</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="reserva in files"
          :key="reserva.id"
          class="border-b border-base-content/10 align-top last:border-b-0"
          :class="anulada(reserva) ? 'text-base-content/70' : ''"
          data-fila-reserva
        >
          <th scope="row" class="whitespace-nowrap py-3 pe-3 text-start font-semibold">
            {{ diaMadrid(reserva.starts_at) }}
            <span class="block text-sm font-normal tabular-nums text-base-content/70 sm:hidden">
              {{ horariMadrid(reserva.starts_at, reserva.ends_at) }}
            </span>
          </th>
          <td class="hidden whitespace-nowrap py-3 pe-3 tabular-nums sm:table-cell">
            {{ horariMadrid(reserva.starts_at, reserva.ends_at) }}
          </td>
          <td class="w-full max-w-0 py-3 pe-3">
            <span class="flex min-w-0 items-center gap-2">
              <span
                class="h-3 w-3 shrink-0 rounded-full bg-base-content/30"
                :style="{ backgroundColor: colors[reserva.space_id] }"
                aria-hidden="true"
              />
              <span class="truncate" :title="reserva.space_name">{{ reserva.space_name }}</span>
            </span>
            <span class="mt-0.5 block truncate text-sm text-base-content/70 sm:hidden">
              {{ reserva.coordinator_name ?? "—" }}
            </span>
            <span class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm sm:hidden">
              <span :class="classeEstat(reserva)">{{ etiquetaEstat(reserva.status) }}</span>
            </span>
          </td>
          <td class="hidden whitespace-nowrap py-3 pe-3 sm:table-cell">{{ reserva.coordinator_name ?? "—" }}</td>
          <td class="hidden whitespace-nowrap py-3 pe-3 sm:table-cell">
            <span :class="classeEstat(reserva)">{{ etiquetaEstat(reserva.status) }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
