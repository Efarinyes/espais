<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

import { calendarisPerEspais } from "../aparenca/colorsCalendari";
import AnalisiIndicadors from "../components/analisi/AnalisiIndicadors.vue";
import AssistenciaPeriode from "../components/analisi/AssistenciaPeriode.vue";
import ComparativaEspais from "../components/analisi/ComparativaEspais.vue";
import OcupacioGlobal from "../components/analisi/OcupacioGlobal.vue";
import RepartimentReserves from "../components/analisi/RepartimentReserves.vue";
import ReservesPeriode from "../components/analisi/ReservesPeriode.vue";
import { useAnalisi } from "../composables/useAnalisi";
import { reservesExemple, resumExemple } from "../exempleAnalisi";

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

/** El mateix color per espai a totes les peces de la pàgina i al calendari. */
const colorsEspais = computed<Record<string, string>>(() => {
  const espais = (resum.value?.spaces ?? []).map((espai) => ({ id: espai.space_id }));
  return Object.fromEntries(
    Object.entries(calendarisPerEspais(espais)).map(([id, color]) => [id, color.lightColors.main]),
  );
});

const espaiDestacat = computed(() => {
  const hash = route.hash;
  if (!hash.startsWith("#espai-")) {
    return "";
  }
  return hash.slice("#espai-".length);
});

/** L’espai ja desplaçat: en canviar de mes no es torna a saltar a la fila ressaltada. */
let espaiDesplacat = "";

async function desplaçaAEspai() {
  if (!espaiDestacat.value) {
    espaiDesplacat = "";
    return;
  }
  if (espaiDestacat.value === espaiDesplacat) {
    return;
  }
  await nextTick();
  const fila = document.getElementById(`espai-${espaiDestacat.value}`);
  if (fila) {
    espaiDesplacat = espaiDestacat.value;
    fila.scrollIntoView({ block: "start" });
  }
}

// La fila no existeix fins que arriba el resum: s’espera a tenir-lo, no només al muntatge.
watch([espaiDestacat, resum], () => void desplaçaAEspai(), { immediate: true, flush: "post" });
</script>

<template>
  <main class="w-full max-w-5xl">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="min-w-0 sm:max-w-lg">
        <h1 class="titol-pantalla">Estadístiques</h1>
        <p class="mt-1 text-base-content/80">
          Com s’han fet servir els espais de l’entitat: ocupació, reserves i assistència.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div class="flex items-center gap-2">
          <label class="text-sm" for="mes">Mes</label>
          <input id="mes" v-model="mes" class="input min-h-11 w-auto" type="month" name="mes" />
        </div>
        <label class="flex min-h-11 cursor-pointer items-center gap-3">
          <!-- Els temes d’Espais no defineixen `--border` i sense ell el commutador de DaisyUI es queda en 6 px. -->
          <input
            v-model="mostraExemple"
            class="toggle toggle-primary shrink-0"
            style="--border: 1px"
            type="checkbox"
          />
          <span>Mostra d’exemple</span>
        </label>
      </div>
    </header>

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
        class="mt-8 border-t border-base-content/15 pt-6"
        aria-labelledby="buit-espais-analisi"
      >
        <h2 id="buit-espais-analisi" class="text-lg font-semibold">Encara no heu definit cap espai</h2>
        <p class="mt-2">Sense espais no hi ha ocupació ni reserves a resumir.</p>
        <RouterLink class="btn btn-primary mt-4 min-h-11" to="/espais/nou">Defineix el primer espai</RouterLink>
      </section>

      <template v-else>
        <AnalisiIndicadors :resum="resum" :colors="colorsEspais" />

        <div class="@container mt-8">
          <div class="grid gap-10 @2xl:grid-cols-2 @2xl:gap-12">
            <OcupacioGlobal :resum="resum" />
            <RepartimentReserves :resum="resum" :colors="colorsEspais" />
          </div>
        </div>

        <ComparativaEspais :espais="resum.spaces" :colors="colorsEspais" :destacat="espaiDestacat" />

        <AssistenciaPeriode v-if="!periodeBuit" :resum="resum" :colors="colorsEspais" />

        <section v-if="periodeBuit" class="mt-10" aria-labelledby="buit-periode">
          <h2 id="buit-periode" class="text-lg font-semibold">Aquest mes no hi ha reserves</h2>
          <p class="mt-2">
            Trieu un altre mes, mireu el calendari, o activeu la mostra d’exemple per veure com queda la pàgina.
          </p>
          <RouterLink class="btn btn-outline mt-4 min-h-11" to="/calendari">Calendari</RouterLink>
        </section>
        <ReservesPeriode v-else :reserves="reserves" :colors="colorsEspais" />
      </template>
    </template>
  </main>
</template>
