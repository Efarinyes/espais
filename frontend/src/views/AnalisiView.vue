<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

import {
  assistenciaEtiqueta,
  horesEtiqueta,
  percentatgeOcupacio,
} from "../analisi";
import { useAnalisi } from "../composables/useAnalisi";
import { reservesExemple, resumExemple } from "../exempleAnalisi";
import { dataHoraMadrid } from "../utils/formatData";

const { mes, resum: resumReal, reserves: reservesReals, carregant, error } = useAnalisi();
const route = useRoute();
const mostraExemple = ref(false);
const resum = computed(() => (mostraExemple.value ? resumExemple() : resumReal.value));
const reserves = computed(() => (mostraExemple.value ? reservesExemple() : reservesReals.value));

const periodeBuit = computed(() => {
  if (!resum.value) {
    return false;
  }
  return resum.value.confirmed_count === 0 && resum.value.cancelled_count === 0;
});

const espaiDestacat = computed(() => {
  const hash = route.hash;
  if (!hash.startsWith("#espai-")) {
    return "";
  }
  return hash.slice("#espai-".length);
});

const espaisLlista = computed(() => {
  if (!resum.value) {
    return [];
  }
  if (!espaiDestacat.value) {
    return resum.value.spaces;
  }
  const primer = resum.value.spaces.filter((espai) => espai.space_id === espaiDestacat.value);
  const resta = resum.value.spaces.filter((espai) => espai.space_id !== espaiDestacat.value);
  return [...primer, ...resta];
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

function ampleOcupacio(ratio: number): string {
  return `${Math.min(100, Math.max(0, ratio * 100))}%`;
}

async function desplaçaAEspai() {
  if (!espaiDestacat.value) {
    return;
  }
  await nextTick();
  document.getElementById(`espai-${espaiDestacat.value}`)?.scrollIntoView({ block: "start" });
}

onMounted(() => {
  void desplaçaAEspai();
});

watch(espaiDestacat, () => {
  void desplaçaAEspai();
});
</script>

<template>
  <main class="w-full max-w-3xl">
    <h1 class="text-3xl font-semibold">Estadístiques</h1>
    <p class="mt-2 text-base-content/80">
      Com s’han fet servir els espais de l’entitat: ocupació, reserves i assistència.
    </p>

    <div class="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <fieldset class="fieldset max-w-xs">
        <label class="label" for="mes">Mes</label>
        <input id="mes" v-model="mes" class="input w-full min-h-11" type="month" name="mes" />
      </fieldset>
      <label class="flex items-center gap-3 min-h-11 cursor-pointer">
        <input v-model="mostraExemple" class="toggle toggle-primary" type="checkbox" />
        <span>Mostra d’exemple</span>
      </label>
    </div>

    <div v-if="mostraExemple" class="alert mt-6" role="status">
      <span>Això no són dades de la vostra entitat. Serveix per veure com queda la pàgina plena.</span>
    </div>

    <div v-if="error && !mostraExemple" class="alert alert-error mt-6" role="alert">
      <span>{{ error }}</span>
    </div>
    <p v-else-if="carregant && !mostraExemple" class="mt-6">Carregant…</p>

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
                  <div class="h-2 rounded bg-primary" :style="{ width: ampleOcupacio(resum.occupancy_ratio) }" />
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
          <h2 id="per-espai" class="text-xl font-semibold">Ús de cada espai</h2>
          <p v-if="espaiDestacat && !mostraExemple" class="mt-2 text-sm text-base-content/70">
            <a class="link" href="#per-espai">Veure tots els espais</a>
          </p>
          <ul class="mt-3 space-y-3">
            <li v-for="espai in espaisLlista" :key="espai.space_id">
              <article
                :id="`espai-${espai.space_id}`"
                class="card bg-base-100 shadow-sm scroll-mt-24"
                :class="espai.space_id === espaiDestacat ? 'ring-2 ring-primary' : ''"
              >
                <div class="card-body">
                  <h3 class="card-title text-base">{{ espai.space_name }}</h3>
                  <p>
                    Ocupació: {{ percentatgeOcupacio(espai.occupancy_ratio) }}
                    ({{ horesEtiqueta(espai.reserved_hours) }} / {{ horesEtiqueta(espai.available_hours) }})
                  </p>
                  <div
                    class="h-3 w-full rounded bg-base-200"
                    role="meter"
                    :aria-valuemin="0"
                    :aria-valuemax="100"
                    :aria-valuenow="Math.round(espai.occupancy_ratio * 100)"
                    :aria-label="`${espai.space_name}: ${percentatgeOcupacio(espai.occupancy_ratio)}`"
                  >
                    <div class="h-3 rounded bg-secondary" :style="{ width: ampleOcupacio(espai.occupancy_ratio) }" />
                  </div>
                  <p>Reserves: {{ espai.confirmed_count }} · Anul·lades: {{ espai.cancelled_count }}</p>
                  <p>
                    Assistència:
                    {{ assistenciaEtiqueta(espai.average_attendance, espai.unregistered_count) }}
                  </p>
                  <p v-if="espai.below_min_attendance" class="text-sm text-error">
                    Per sota de l’aforament mínim
                  </p>
                </div>
              </article>
            </li>
          </ul>
        </section>

        <section
          v-if="periodeBuit"
          class="card bg-base-100 shadow-sm mt-8"
          aria-labelledby="buit-periode"
        >
          <div class="card-body">
            <h2 id="buit-periode" class="card-title">Aquest mes no hi ha reserves</h2>
            <p>Trieu un altre mes, mireu el calendari, o activeu la mostra d’exemple per veure com queda la pàgina.</p>
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
