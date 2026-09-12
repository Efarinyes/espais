<script setup lang="ts">
import { onMounted } from "vue";

import { dataHoraMadrid } from "../calendari";
import { useAvisos } from "../composables/useAvisos";
import { titolAvis } from "../services/avisos";
import { useSessioStore } from "../stores/sessio";

const sessio = useSessioStore();
const { avisos, carregant, error, seleccionat, arxivant, carregar, obrir, arxivar } = useAvisos();

onMounted(() => {
  void carregar();
});
</script>

<template>
  <main class="mx-auto w-full max-w-md px-4 py-6">
    <h1 class="text-3xl font-semibold">Avisos</h1>
    <p v-if="sessio.role === 'responsible'" class="mt-2 text-base-content/80">
      Quan canvies o anul·les una reserva, l’avís el rep el coordinador, no aquesta llista.
    </p>
    <p v-else class="mt-2 text-base-content/80">
      Canvis que el responsable ha fet a les teves reserves. Pots arxivar els ja llegits; s’esborren al cap de tres setmanes.
    </p>

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
        <p v-if="sessio.role === 'responsible'">
          L’avís in-app i el correu van al coordinador de la reserva.
        </p>
        <p v-else>Quan el responsable anul·li o reprogrami una reserva teva, t’apareixerà aquí.</p>
      </div>
    </section>

    <ul v-else-if="avisos.length" class="mt-6 space-y-3">
      <li v-for="avis in avisos" :key="avis.id">
        <article class="card bg-base-100 shadow-sm">
          <button
            class="card-body w-full text-left min-h-11"
            type="button"
            :aria-expanded="seleccionat === avis.id"
            @click="obrir(avis.id)"
          >
            <h2 class="card-title text-base" :class="avis.read_at ? 'font-medium' : 'font-semibold'">
              {{ titolAvis(avis) }}
            </h2>
            <p>{{ dataHoraMadrid(avis.starts_at) }} – {{ dataHoraMadrid(avis.ends_at) }}</p>
            <p v-if="avis.type === 'reservation_rescheduled' && avis.new_starts_at && avis.new_ends_at">
              Nou horari: {{ dataHoraMadrid(avis.new_starts_at) }} – {{ dataHoraMadrid(avis.new_ends_at) }}
            </p>
            <p v-if="seleccionat === avis.id" class="mt-2 text-base-content/80">
              Ho ha fet {{ avis.responsible_name }}
              <template v-if="avis.reason">. Motiu: {{ avis.reason }}</template>.
            </p>
            <p v-if="!avis.read_at" class="text-sm text-primary">No llegit</p>
          </button>
          <div v-if="avis.read_at" class="card-actions justify-end px-8 pb-6 pt-0">
            <button
              class="btn btn-ghost min-h-11"
              type="button"
              :disabled="arxivant === avis.id"
              :aria-label="`Arxiva ${titolAvis(avis)}`"
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
