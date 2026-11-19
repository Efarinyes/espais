<script setup lang="ts">
import { onMounted } from "vue";

import { useAvisosEnviats } from "../composables/useAvisosEnviats";
import { AVIS_MODIFICADA, descripcioCanvis, etiquetaAvis } from "../services/avisos";
import { dataHoraMadrid, intervalMadrid } from "../utils/formatData";

const { avisos, carregant, error, pendents, carregar } = useAvisosEnviats();

onMounted(() => {
  void carregar();
});
</script>

<template>
  <main class="mx-auto w-full max-w-md">
    <h1 class="titol-pantalla">Avisos enviats</h1>
    <p class="mt-2 text-base-content/80">
      Avisos que els coordinadors han rebut quan has modificat o anul·lat una reserva seva. «Llegit» vol dir que
      l’han obert dins d’Espais; una notificació al dispositiu no compta com a lectura.
    </p>

    <div v-if="error" class="alert alert-error mt-6" role="alert">
      <span>{{ error }}</span>
    </div>
    <p v-if="carregant && avisos.length === 0" class="mt-6">Carregant…</p>

    <section
      v-else-if="!carregant && avisos.length === 0 && !error"
      class="card bg-base-100 shadow-sm mt-6"
      aria-labelledby="buit-enviats"
    >
      <div class="card-body">
        <h2 id="buit-enviats" class="card-title">Encara no has enviat cap avís</h2>
        <p>Quan modifiquis o anul·lis una reserva d’un coordinador, aquí veuràs si ho ha llegit.</p>
      </div>
    </section>

    <template v-else-if="avisos.length">
      <p class="mt-6 font-medium" role="status">
        {{ pendents === 0 ? "Tots els avisos s’han llegit." : pendents === 1 ? "1 avís pendent de lectura." : `${pendents} avisos pendents de lectura.` }}
      </p>
      <ul class="mt-3 space-y-3" aria-label="Avisos enviats">
        <li v-for="avis in avisos" :key="avis.id">
          <article class="card bg-base-100 shadow-sm" :data-llegit="avis.read_at ? 'true' : 'false'">
            <div class="card-body gap-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="badge" :class="avis.type === AVIS_MODIFICADA ? 'badge-warning' : 'badge-error'">
                  {{ etiquetaAvis(avis) }}
                </span>
                <span v-if="avis.read_at" class="badge badge-success badge-outline">
                  Llegit el {{ dataHoraMadrid(avis.read_at) }}
                </span>
                <span v-else class="badge badge-ghost">Pendent de lectura</span>
              </div>
              <h2 class="card-title text-base">{{ avis.space_name }}</h2>
              <p v-if="avis.coordinator_name">Coordinador: {{ avis.coordinator_name }}</p>
              <p>
                <span class="font-medium">Horari original:</span>
                {{ intervalMadrid(avis.starts_at, avis.ends_at) }}
              </p>
              <p v-if="avis.type === AVIS_MODIFICADA && avis.new_starts_at && avis.new_ends_at">
                <span class="font-medium">Nou horari:</span>
                {{ intervalMadrid(avis.new_starts_at, avis.new_ends_at) }}
              </p>
              <p v-if="descripcioCanvis(avis.changes)" class="text-base-content/80">
                {{ descripcioCanvis(avis.changes) }}
              </p>
              <p class="text-sm text-base-content/70">Enviat el {{ dataHoraMadrid(avis.created_at) }}.</p>
            </div>
          </article>
        </li>
      </ul>
    </template>
  </main>
</template>
