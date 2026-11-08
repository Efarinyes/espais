<script setup lang="ts">
import type { FilaReserva } from "../calendari";

defineProps<{
  files: FilaReserva[];
  periode: string;
  carregant: boolean;
  fallida: boolean;
}>();

const emit = defineEmits<{
  obrir: [id: string];
  anterior: [];
  seguent: [];
}>();
</script>

<template>
  <section class="mt-4" aria-labelledby="llista-reserves-periode">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <h2 id="llista-reserves-periode" class="text-base font-semibold">{{ periode }}</h2>
      <div class="flex gap-2">
        <button class="btn min-h-11" type="button" @click="emit('anterior')">Anterior</button>
        <button class="btn min-h-11" type="button" @click="emit('seguent')">Següent</button>
      </div>
    </div>

    <p v-if="carregant" class="mt-4" role="status">Carregant reserves…</p>
    <p v-else-if="fallida && files.length === 0" class="mt-4" role="alert">No s’han pogut carregar les reserves.</p>
    <p v-else-if="files.length === 0" class="mt-4">No hi ha reserves en aquest període.</p>
    <ul v-else class="mt-4" aria-label="Reserves del període">
      <li
        v-for="fila in files"
        :key="fila.id"
        class="flex flex-col gap-2 border-b border-base-300 py-4 sm:flex-row sm:items-center sm:justify-between"
        :class="{
          'border-l-4 border-l-base-content pl-4': fila.paper === 'teva',
          'opacity-80': fila.paper === 'ocupada',
        }"
      >
        <div>
          <p class="font-semibold">{{ fila.espai }}</p>
          <p>{{ fila.data }}</p>
          <p class="text-sm">{{ fila.interval }} · {{ fila.propietat }}</p>
        </div>
        <button
          v-if="fila.obrible"
          class="btn btn-outline min-h-11"
          type="button"
          @click="emit('obrir', fila.id)"
        >
          Obre
        </button>
      </li>
    </ul>
  </section>
</template>
