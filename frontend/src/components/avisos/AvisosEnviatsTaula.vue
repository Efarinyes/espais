<script setup lang="ts">
import type { AvisEnviatDto } from "../../services/avisosEnviats";
import { AVIS_MODIFICADA, descripcioCanvis, etiquetaAvis } from "../../services/avisos";
import { dataHoraMadrid, diaMadrid, horariMadrid } from "../../utils/formatData";

defineProps<{
  avisos: readonly AvisEnviatDto[];
}>();

function ambNouHorari(avis: AvisEnviatDto): boolean {
  return avis.type === AVIS_MODIFICADA && Boolean(avis.new_starts_at) && Boolean(avis.new_ends_at);
}
</script>

<template>
  <table class="w-full text-start" data-avisos-taula>
    <caption class="sr-only">
      Avisos enviats als coordinadors, del més recent al més antic
    </caption>
    <thead>
      <tr class="border-b border-base-content/20 text-sm text-base-content/70">
        <th scope="col" class="py-2 pe-3 text-start font-medium">Avís</th>
        <th scope="col" class="py-2 pe-3 text-start font-medium">Espai i coordinador</th>
        <th scope="col" class="py-2 pe-3 text-start font-medium">Horari original</th>
        <th scope="col" class="py-2 pe-3 text-start font-medium">Nou horari</th>
        <th scope="col" class="py-2 text-start font-medium">Enviat i lectura</th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="avis in avisos"
        :key="avis.id"
        class="border-b border-base-content/10 align-top last:border-b-0"
        :data-llegit="avis.read_at ? 'true' : 'false'"
        data-fila-avis
      >
        <td class="py-4 pe-3">
          <span class="badge" :class="avis.type === AVIS_MODIFICADA ? 'badge-warning' : 'badge-error'">
            {{ etiquetaAvis(avis) }}
          </span>
        </td>
        <th scope="row" class="w-[22%] max-w-0 py-4 pe-3 text-start font-normal">
          <span class="block truncate font-semibold" :title="avis.space_name">{{ avis.space_name }}</span>
          <span v-if="avis.coordinator_name" class="mt-0.5 block truncate text-sm text-base-content/70">
            {{ avis.coordinator_name }}
          </span>
        </th>
        <td class="whitespace-nowrap py-4 pe-3">
          <span class="block">{{ diaMadrid(avis.starts_at) }}</span>
          <span class="mt-0.5 block text-sm tabular-nums text-base-content/70">
            {{ horariMadrid(avis.starts_at, avis.ends_at) }}
          </span>
        </td>
        <td class="py-4 pe-3">
          <template v-if="ambNouHorari(avis)">
            <span class="block whitespace-nowrap font-medium">{{ diaMadrid(avis.new_starts_at!) }}</span>
            <span class="mt-0.5 block whitespace-nowrap text-sm tabular-nums text-base-content/70">
              {{ horariMadrid(avis.new_starts_at!, avis.new_ends_at!) }}
            </span>
            <span v-if="descripcioCanvis(avis.changes)" class="mt-1 block text-sm text-base-content/70">
              {{ descripcioCanvis(avis.changes) }}
            </span>
          </template>
          <span v-else class="text-base-content/70">
            <span aria-hidden="true">—</span><span class="sr-only">Sense nou horari</span>
          </span>
        </td>
        <td class="py-4">
          <span v-if="avis.read_at" class="badge badge-success badge-outline">Llegit</span>
          <span v-else class="badge badge-outline">Pendent de lectura</span>
          <span class="mt-1 block whitespace-nowrap text-sm text-base-content/70">
            Enviat {{ dataHoraMadrid(avis.created_at) }}
          </span>
          <span v-if="avis.read_at" class="block whitespace-nowrap text-sm text-base-content/70">
            Llegit {{ dataHoraMadrid(avis.read_at) }}
          </span>
        </td>
      </tr>
    </tbody>
  </table>
</template>
