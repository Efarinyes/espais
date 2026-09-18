<script setup lang="ts">
import { computed, watch } from "vue";
import { useRouter } from "vue-router";

import EspaiTargeta from "../components/EspaiTargeta.vue";
import { useLlistaEspais } from "../composables/useLlistaEspais";
import { destiDespresSessio } from "../navegacio";
import { useSessioStore } from "../stores/sessio";
import LandingPage from "./LandingPage.vue";

const sessio = useSessioStore();
const router = useRouter();
const { espais, carregant, error } = useLlistaEspais();

watch(
  () => sessio.role,
  (role) => {
    if (role === "responsible") {
      void router.replace(destiDespresSessio(role));
    }
  },
  { immediate: true },
);

const llistaAmpla = computed(
  () => sessio.iniciada && !carregant.value && !error.value && espais.value.length > 0,
);
</script>

<template>
  <LandingPage v-if="!sessio.iniciada" />
  <main v-else-if="sessio.role !== 'responsible'" class="mx-auto w-full px-4 py-6" :class="llistaAmpla ? 'max-w-6xl' : 'max-w-md'">
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
        <h2 id="buit-titol" class="card-title">Encara no hi ha espais</h2>
        <p>El responsable de l’entitat els definirà. Mentrestant no es poden fer reserves.</p>
      </div>
    </section>

    <section v-else-if="!carregant" class="mt-6" aria-labelledby="llista-titol">
      <h2 id="llista-titol" class="text-xl font-semibold mb-4">Els vostres espais</h2>
      <ul class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 items-stretch">
        <EspaiTargeta
          v-for="espai in espais"
          :key="espai.id"
          :espai="espai"
          :pot-editar="false"
          accio-calendari="Reservar"
          :calendari-global="false"
        />
      </ul>
    </section>
  </main>
</template>
