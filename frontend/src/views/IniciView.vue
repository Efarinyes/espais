<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";

import EspaiTargeta from "../components/EspaiTargeta.vue";
import { useLlistaEspais } from "../composables/useLlistaEspais";
import { useSessioStore } from "../stores/sessio";

const sessio = useSessioStore();
const { espais, carregant, error } = useLlistaEspais();

const llistaAmpla = computed(
  () => sessio.iniciada && !carregant.value && !error.value && espais.value.length > 0,
);
</script>

<template>
  <main class="mx-auto w-full px-4 py-6" :class="llistaAmpla ? 'max-w-6xl' : 'max-w-md'">
    <template v-if="!sessio.iniciada">
      <h1 class="text-3xl font-semibold">Espais</h1>
      <p class="mt-2 text-base-content/80">
        Gestió d’ús i reserva d’espais de l’entitat. Ús intern i gratuït.
      </p>
      <div class="mt-6 flex flex-col gap-3">
        <RouterLink class="btn btn-primary min-h-11" to="/registre">Registra l’entitat</RouterLink>
        <RouterLink class="btn btn-outline min-h-11" to="/iniciar-sessio">Inicia sessió</RouterLink>
      </div>
    </template>

    <template v-else>
      <h1 class="text-3xl font-semibold">{{ sessio.entityName }}</h1>
      <p v-if="sessio.typology" class="mt-1 text-base-content/80">{{ sessio.typology }}</p>
      <p class="mt-1">Hola, {{ sessio.userName }}.</p>

      <div v-if="error" class="alert alert-error mt-6" role="alert">
        <span>{{ error }}</span>
      </div>

      <section
        v-else-if="!carregant && espais.length === 0"
        class="card bg-base-100 shadow-sm mt-6"
        aria-labelledby="buit-titol"
      >
        <div class="card-body">
          <template v-if="sessio.role === 'responsible'">
            <h2 id="buit-titol" class="card-title">Defineix el primer espai</h2>
            <p>Encara no heu definit cap espai. El nom el trieu vosaltres (Sala 1 o Sala Pau Casals).</p>
            <RouterLink class="btn btn-primary min-h-11" to="/espais/nou">Defineix el primer espai</RouterLink>
            <RouterLink class="btn btn-outline min-h-11" to="/coordinadors/convidar">Convida coordinadors</RouterLink>
            <p class="text-sm text-base-content/70">
              Pots convidar coordinadors ara o més endavant; no cal per definir espais.
            </p>
          </template>
          <template v-else>
            <h2 id="buit-titol" class="card-title">Encara no hi ha espais</h2>
            <p>El responsable de l’entitat els definirà. Mentrestant no es poden fer reserves.</p>
          </template>
        </div>
      </section>

      <section v-else-if="!carregant" class="mt-6" aria-labelledby="llista-titol">
        <h2 id="llista-titol" class="text-xl font-semibold mb-4">Els vostres espais</h2>
        <ul class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 items-stretch">
          <EspaiTargeta
            v-for="espai in espais"
            :key="espai.id"
            :espai="espai"
            :pot-editar="sessio.role === 'responsible'"
          />
        </ul>
      </section>
    </template>
  </main>
</template>
