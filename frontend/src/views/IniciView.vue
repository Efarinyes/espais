<script setup lang="ts">
import { watch } from "vue";
import { useRouter } from "vue-router";

import { decisioAcces } from "../autoritzacio";
import { refrescarSessio } from "../confirmacioSessio";
import { useSessioStore } from "../stores/sessio";
import LandingPage from "./LandingPage.vue";

const sessio = useSessioStore();
const router = useRouter();

function anarSiCal() {
  const desti = decisioAcces("inici", {
    iniciada: sessio.iniciada,
    confirmada: sessio.confirmada,
    role: sessio.role,
  });
  if (desti !== true) {
    void router.replace(desti);
  }
}

async function reintentar() {
  const resultat = await refrescarSessio();
  if (resultat === "ok") {
    anarSiCal();
  }
}

watch(() => [sessio.iniciada, sessio.confirmada, sessio.role] as const, anarSiCal, { immediate: true });
</script>

<template>
  <section v-if="sessio.iniciada && !sessio.confirmada" class="mx-auto w-full max-w-md px-4 py-10">
    <h1 class="titol-pantalla">No s’ha pogut verificar la sessió</h1>
    <p class="mt-2 text-base-content/80">El tauler no es mostra fins que el servidor confirma l’accés.</p>
    <button class="btn btn-primary mt-6 min-h-11" type="button" @click="reintentar">Torna-ho a provar</button>
  </section>
  <LandingPage v-else-if="!sessio.iniciada" />
</template>
