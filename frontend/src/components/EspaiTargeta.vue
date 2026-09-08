<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";

import type { EspaiDto } from "../services/espais";

const props = defineProps<{
  espai: EspaiDto;
  potEditar?: boolean;
}>();

const equipament = computed(() => props.espai.equipment?.trim() ?? "");
</script>

<template>
  <li class="card bg-base-100 shadow-sm h-full">
    <div class="card-body">
      <h3 class="card-title">{{ props.espai.name }}</h3>
      <p>Aforament: {{ props.espai.capacity }}</p>
      <p v-if="equipament">Equipament: {{ equipament }}</p>
      <p v-else class="text-base-content/70">Aquest espai no té equipament</p>
      <p v-if="!props.espai.active"><span class="badge badge-ghost">Inactiu</span></p>
      <div v-if="props.potEditar" class="card-actions justify-end mt-auto">
        <RouterLink class="btn btn-ghost min-h-11" :to="{ name: 'espai-editar', params: { id: props.espai.id } }">
          Editar
        </RouterLink>
      </div>
    </div>
  </li>
</template>
