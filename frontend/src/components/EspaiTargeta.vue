<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";

import { resumFinestres } from "../disponibilitat";
import type { EspaiDto } from "../services/espais";

const props = defineProps<{
  espai: EspaiDto;
  potEditar?: boolean;
  accioCalendari?: string;
  calendariGlobal?: boolean;
}>();

const equipament = computed(() => props.espai.equipment?.trim() ?? "");
const horari = computed(() => resumFinestres(props.espai.windows ?? []));
const destiCalendari = computed(() => {
  if (!props.espai.active) {
    return undefined;
  }
  if (props.calendariGlobal) {
    return { name: "calendari" as const };
  }
  return { name: "calendari" as const, query: { espai: props.espai.id } };
});
const etiquetaCalendari = computed(() =>
  props.calendariGlobal ? "Totes les reserves" : `Calendari de ${props.espai.name}`,
);
</script>

<template>
  <li class="card bg-base-100 shadow-sm h-full">
    <component
      :is="destiCalendari ? RouterLink : 'div'"
      class="card-body grow text-inherit no-underline rounded-box"
      :class="destiCalendari ? 'cursor-pointer hover:bg-base-200/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2' : ''"
      v-bind="destiCalendari ? { to: destiCalendari } : {}"
      :aria-label="destiCalendari ? etiquetaCalendari : undefined"
    >
      <h3 class="card-title">{{ props.espai.name }}</h3>
      <p>Aforament: {{ props.espai.capacity }}</p>
      <p v-if="equipament">Equipament: {{ equipament }}</p>
      <p v-else class="text-base-content/70">Aquest espai no té equipament</p>
      <p>Disponibilitat: {{ horari }}</p>
      <p v-if="!props.espai.active"><span class="badge badge-ghost">Inactiu</span></p>
      <span v-if="destiCalendari" class="btn btn-primary min-h-11 mt-auto self-end pointer-events-none">
        {{ accioCalendari ?? "Reservar" }}
      </span>
    </component>
    <div v-if="props.potEditar" class="card-actions justify-end px-8 pb-6 pt-0 flex-wrap">
      <RouterLink class="btn btn-ghost min-h-11" :to="{ name: 'analisi', hash: `#espai-${props.espai.id}` }">
        Estadístiques
      </RouterLink>
      <RouterLink class="btn btn-ghost min-h-11" :to="{ name: 'espai-editar', params: { id: props.espai.id } }">
        Editar
      </RouterLink>
    </div>
  </li>
</template>
