<script setup lang="ts">
import type { AvisEnviatDto } from "../../services/avisosEnviats";
import { AVIS_MODIFICADA, descripcioCanvis, etiquetaAvis } from "../../services/avisos";
import { dataHoraMadrid, intervalMadrid } from "../../utils/formatData";

defineProps<{
  avisos: readonly AvisEnviatDto[];
}>();
</script>

<template>
  <ul class="grid gap-3 @xl:grid-cols-2" aria-label="Avisos enviats" data-avisos-targetes>
    <li v-for="avis in avisos" :key="avis.id">
      <article class="card h-full bg-base-100 shadow-sm" :data-llegit="avis.read_at ? 'true' : 'false'">
        <div class="card-body gap-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class="badge" :class="avis.type === AVIS_MODIFICADA ? 'badge-warning' : 'badge-error'">
              {{ etiquetaAvis(avis) }}
            </span>
            <span v-if="avis.read_at" class="badge badge-success badge-outline">
              Llegit el {{ dataHoraMadrid(avis.read_at) }}
            </span>
            <span v-else class="badge badge-outline">Pendent de lectura</span>
          </div>
          <h2 class="card-title mt-1 text-base">{{ avis.space_name }}</h2>
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
