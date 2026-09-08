<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";

import EspaiTargeta from "../components/EspaiTargeta.vue";
import { useLlistaEspais } from "../composables/useLlistaEspais";
import { useSessioStore } from "../stores/sessio";

const sessio = useSessioStore();
const { espais, carregant, error } = useLlistaEspais();

const esResponsable = computed(() => sessio.role === "responsible");
const llistaAmpla = computed(() => !error.value && !carregant.value && espais.value.length > 0);
</script>

<template>
  <main class="mx-auto w-full px-4 py-6" :class="llistaAmpla ? 'max-w-6xl' : 'max-w-md'">
    <h1 class="text-3xl font-semibold">Espais de l’entitat</h1>

    <div v-if="error" class="alert alert-error mt-6" role="alert">
      <span>{{ error }}</span>
    </div>
    <p v-else-if="carregant" class="mt-6">Carregant…</p>

    <section v-else-if="espais.length === 0" class="card bg-base-100 shadow-sm mt-6" aria-labelledby="buit-espais">
      <div class="card-body">
        <template v-if="esResponsable">
          <h2 id="buit-espais" class="card-title">Encara no heu definit cap espai</h2>
          <p>El nom el trieu vosaltres (Sala 1 o Sala Pau Casals).</p>
          <RouterLink class="btn btn-primary min-h-11" to="/espais/nou">Defineix el primer espai</RouterLink>
        </template>
        <template v-else>
          <h2 id="buit-espais" class="card-title">Encara no hi ha espais</h2>
          <p>El responsable de l’entitat els definirà. Mentrestant no es poden fer reserves.</p>
        </template>
      </div>
    </section>

    <ul v-else class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 items-stretch">
      <EspaiTargeta
        v-for="espai in espais"
        :key="espai.id"
        :espai="espai"
        :pot-editar="esResponsable"
      />
    </ul>

    <div v-if="espais.length > 0 && esResponsable" class="mt-6">
      <RouterLink class="btn btn-primary min-h-11" to="/espais/nou">Afegeix un espai</RouterLink>
    </div>
  </main>
</template>
