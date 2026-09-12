<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";

import {
  assistenciaEtiqueta,
  horesEtiqueta,
  percentatgeOcupacio,
} from "../analisi";
import { dataHoraMadrid } from "../calendari";
import { useAnalisi } from "../composables/useAnalisi";

const { mes, resum, reserves, carregant, error } = useAnalisi();

const periodeBuit = computed(() => {
  if (!resum.value) {
    return false;
  }
  return resum.value.confirmed_count === 0 && resum.value.cancelled_count === 0;
});

function etiquetaEstat(status: string): string {
  if (status === "cancelled") {
    return "Anul·lada";
  }
  if (status === "confirmed") {
    return "Confirmada";
  }
  return status;
}
</script>

<template>
  <main class="mx-auto w-full max-w-3xl px-4 py-6">
    <h1 class="text-3xl font-semibold">Anàlisi d’ús</h1>
    <p class="mt-2 text-base-content/80">Ocupació, reserves i assistència de la vostra entitat.</p>

    <label class="form-control mt-6 max-w-xs">
      <span class="label">
        <span class="label-text">Mes</span>
      </span>
      <input v-model="mes" class="input input-bordered min-h-11" type="month" name="mes" />
    </label>

    <div v-if="error" class="alert alert-error mt-6" role="alert">
      <span>{{ error }}</span>
    </div>
    <p v-else-if="carregant" class="mt-6">Carregant…</p>

    <template v-else-if="resum">
      <section
        v-if="resum.spaces.length === 0"
        class="card bg-base-100 shadow-sm mt-6"
        aria-labelledby="buit-espais-analisi"
      >
        <div class="card-body">
          <h2 id="buit-espais-analisi" class="card-title">Encara no heu definit cap espai</h2>
          <p>Sense espais no hi ha ocupació ni reserves a resumir.</p>
          <RouterLink class="btn btn-primary min-h-11" to="/espais/nou">Defineix el primer espai</RouterLink>
        </div>
      </section>

      <template v-else>
        <section class="mt-6" aria-labelledby="resum-entitat">
          <h2 id="resum-entitat" class="text-xl font-semibold">Resum de l’entitat</h2>
          <ul class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <li class="card bg-base-100 shadow-sm">
              <div class="card-body">
                <p class="text-sm text-base-content/70">Ocupació</p>
                <p class="text-2xl font-semibold">{{ percentatgeOcupacio(resum.occupancy_ratio) }}</p>
                <p class="text-sm">
                  {{ horesEtiqueta(resum.reserved_hours) }} de {{ horesEtiqueta(resum.available_hours) }}
                </p>
                <div
                  class="mt-2 h-2 w-full rounded bg-base-200"
                  role="meter"
                  :aria-valuemin="0"
                  :aria-valuemax="100"
                  :aria-valuenow="Math.round(resum.occupancy_ratio * 100)"
                  :aria-label="percentatgeOcupacio(resum.occupancy_ratio)"
                >
                  <div
                    class="h-2 rounded bg-primary"
                    :style="{ width: Math.min(100, resum.occupancy_ratio * 100) + '%' }"
                  />
                </div>
              </div>
            </li>
            <li class="card bg-base-100 shadow-sm">
              <div class="card-body">
                <p class="text-sm text-base-content/70">Reserves</p>
                <p class="text-2xl font-semibold">{{ resum.confirmed_count }}</p>
                <p class="text-sm">{{ resum.cancelled_count }} anul·lades</p>
              </div>
            </li>
            <li class="card bg-base-100 shadow-sm sm:col-span-2">
              <div class="card-body">
                <p class="text-sm text-base-content/70">Assistència mitjana</p>
                <p class="text-2xl font-semibold">
                  {{ assistenciaEtiqueta(resum.average_attendance, resum.unregistered_count) }}
                </p>
                <p v-if="resum.below_min_attendance" class="text-sm text-error">
                  Per sota de l’aforament mínim en algun espai.
                </p>
              </div>
            </li>
          </ul>
        </section>

        <section class="mt-8" aria-labelledby="per-espai">
          <h2 id="per-espai" class="text-xl font-semibold">Per espai</h2>
          <div class="mt-3 overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
                  <th scope="col">Espai</th>
                  <th scope="col">Reserves</th>
                  <th scope="col">Ocupació</th>
                  <th scope="col">Anul·lades</th>
                  <th scope="col">Assistència</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="espai in resum.spaces" :key="espai.space_id">
                  <th scope="row">{{ espai.space_name }}</th>
                  <td>{{ espai.confirmed_count }}</td>
                  <td>
                    {{ percentatgeOcupacio(espai.occupancy_ratio) }}
                    <span class="block text-sm text-base-content/70">
                      {{ horesEtiqueta(espai.reserved_hours) }} / {{ horesEtiqueta(espai.available_hours) }}
                    </span>
                  </td>
                  <td>{{ espai.cancelled_count }}</td>
                  <td>
                    {{ assistenciaEtiqueta(espai.average_attendance, espai.unregistered_count) }}
                    <span v-if="espai.below_min_attendance" class="block text-sm text-error">
                      Per sota de l’aforament mínim
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section
          v-if="periodeBuit"
          class="card bg-base-100 shadow-sm mt-8"
          aria-labelledby="buit-periode"
        >
          <div class="card-body">
            <h2 id="buit-periode" class="card-title">Període sense dades</h2>
            <p>No hi ha reserves ni anul·lacions en aquest mes. Trieu un altre període o mireu el calendari.</p>
            <RouterLink class="btn btn-outline min-h-11" to="/calendari">Calendari</RouterLink>
          </div>
        </section>

        <section v-else class="mt-8" aria-labelledby="llista-periode">
          <h2 id="llista-periode" class="text-xl font-semibold">Reserves del període</h2>
          <ul class="mt-3 space-y-3">
            <li v-for="reserva in reserves" :key="reserva.id">
              <article class="card bg-base-100 shadow-sm">
                <div class="card-body">
                  <h3 class="card-title text-base">{{ reserva.space_name }}</h3>
                  <p>{{ dataHoraMadrid(reserva.starts_at) }} – {{ dataHoraMadrid(reserva.ends_at) }}</p>
                  <p>{{ etiquetaEstat(reserva.status) }} · {{ reserva.coordinator_name }}</p>
                  <p class="text-sm text-base-content/70">
                    Assistència:
                    {{
                      reserva.attendance_count == null
                        ? "sense registrar"
                        : reserva.attendance_count
                    }}
                  </p>
                </div>
              </article>
            </li>
          </ul>
        </section>
      </template>
    </template>
  </main>
</template>
