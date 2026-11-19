<script setup lang="ts">
import { nextTick, onMounted } from "vue";
import { RouterLink, useRoute } from "vue-router";

import ActivaPush from "../components/ActivaPush.vue";
import { useAvisos } from "../composables/useAvisos";
import {
  AVIS_MODIFICADA,
  descripcioCanvis,
  enllacReserva,
  etiquetaAvis,
  missatgeAvis,
  titolReservaAvis,
} from "../services/avisos";
import { dataHoraMadrid, intervalMadrid } from "../utils/formatData";

const { avisos, carregant, error, seleccionat, arxivant, carregar, obrir, arxivar } = useAvisos();
const route = useRoute();

onMounted(async () => {
  await carregar();
  // Una notificació del dispositiu porta aquí (`?avis=`): s’obre l’avís i queda llegit.
  const demanat = typeof route.query.avis === "string" ? route.query.avis : "";
  if (demanat && avisos.value.some((avis) => avis.id === demanat)) {
    await obrir(demanat);
    await nextTick();
    document.getElementById(`avis-${demanat}`)?.scrollIntoView?.({ block: "center" });
  }
});
</script>

<template>
  <main class="mx-auto w-full max-w-md">
    <h1 class="titol-pantalla">Avisos</h1>
    <p class="mt-2 text-base-content/80">
      Canvis que el responsable ha fet a les teves reserves. Pots arxivar els ja llegits; s’esborren al cap de tres setmanes.
    </p>

    <ActivaPush class="mt-6" />

    <div v-if="error" class="alert alert-error mt-6" role="alert">
      <span>{{ error }}</span>
    </div>
    <p v-if="carregant && avisos.length === 0" class="mt-6">Carregant…</p>

    <section
      v-else-if="!carregant && avisos.length === 0"
      class="card bg-base-100 shadow-sm mt-6"
      aria-labelledby="buit-avisos"
    >
      <div class="card-body">
        <h2 id="buit-avisos" class="card-title">No tens avisos</h2>
        <p>Quan el responsable modifiqui o anul·li una reserva teva, t’apareixerà aquí.</p>
      </div>
    </section>

    <ul v-else-if="avisos.length" class="mt-6 space-y-3" aria-label="Avisos">
      <li v-for="avis in avisos" :id="`avis-${avis.id}`" :key="avis.id">
        <article
          class="card bg-base-100 shadow-sm border-s-4"
          :class="avis.read_at ? 'border-transparent' : 'border-primary'"
          :data-llegit="avis.read_at ? 'true' : 'false'"
        >
          <button
            class="card-body w-full text-left min-h-11"
            type="button"
            :aria-expanded="seleccionat === avis.id"
            @click="obrir(avis.id)"
          >
            <div class="flex flex-wrap items-center gap-2">
              <span class="badge" :class="avis.type === AVIS_MODIFICADA ? 'badge-warning' : 'badge-error'">
                {{ etiquetaAvis(avis) }}
              </span>
              <span v-if="!avis.read_at" class="badge badge-primary badge-outline">No llegit</span>
              <span v-else class="text-sm text-base-content/70">Llegit</span>
            </div>
            <h2 class="card-title text-base" :class="avis.read_at ? 'font-medium' : 'font-semibold'">
              {{ titolReservaAvis(avis) }}
            </h2>
            <p class="text-base-content/80">{{ missatgeAvis(avis) }}</p>
            <p>
              <span class="font-medium">Horari original:</span>
              {{ intervalMadrid(avis.starts_at, avis.ends_at) }}
            </p>
            <p v-if="avis.type === AVIS_MODIFICADA && avis.new_starts_at && avis.new_ends_at">
              <span class="font-medium">Nou horari:</span>
              {{ intervalMadrid(avis.new_starts_at, avis.new_ends_at) }}
            </p>
            <div v-if="seleccionat === avis.id" class="mt-2 space-y-1 text-base-content/80">
              <p v-if="descripcioCanvis(avis.changes)">{{ descripcioCanvis(avis.changes) }}</p>
              <p>
                Ho ha fet {{ avis.responsible_name }}<template v-if="avis.reason">. Motiu: {{ avis.reason }}</template>.
              </p>
              <p class="text-sm">Avís rebut el {{ dataHoraMadrid(avis.created_at) }}.</p>
            </div>
          </button>
          <div class="card-actions justify-end gap-2 px-8 pb-6 pt-0">
            <RouterLink
              v-if="enllacReserva(avis)"
              class="btn btn-outline min-h-11"
              :to="enllacReserva(avis)!"
              :aria-label="`Veure la reserva: ${titolReservaAvis(avis)}`"
              @click="obrir(avis.id)"
            >
              Veure la reserva
            </RouterLink>
            <button
              v-if="avis.read_at"
              class="btn btn-ghost min-h-11"
              type="button"
              :disabled="arxivant === avis.id"
              :aria-label="`Arxiva ${titolReservaAvis(avis)}`"
              @click="arxivar(avis.id)"
            >
              Arxiva
            </button>
          </div>
        </article>
      </li>
    </ul>
  </main>
</template>
