<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, RouterView, useRouter } from "vue-router";

import { useComptadorAvisos } from "./composables/useAvisos";
import { useSessioStore } from "./stores/sessio";

const sessio = useSessioStore();
const router = useRouter();
const { noLlegits } = useComptadorAvisos();

const etiquetaRol = computed(() => {
  if (sessio.role === "responsible") {
    return "Responsable";
  }
  if (sessio.role === "coordinator") {
    return "Coordinador";
  }
  return "";
});

function sortir() {
  sessio.sortir();
  void router.push({ name: "inici" });
}
</script>

<template>
  <div class="min-h-screen">
    <header class="navbar bg-base-100 shadow-sm">
      <div class="flex-1 flex items-center gap-2">
        <RouterLink class="btn btn-ghost text-xl min-h-11" to="/">Espais</RouterLink>
        <span v-if="etiquetaRol" class="badge badge-outline">{{ etiquetaRol }}</span>
      </div>
      <div v-if="sessio.iniciada" class="flex-none gap-1">
        <RouterLink class="btn btn-ghost min-h-11" to="/espais">Espais</RouterLink>
        <RouterLink class="btn btn-ghost min-h-11" to="/calendari">Calendari</RouterLink>
        <RouterLink class="btn btn-ghost min-h-11" to="/avisos">
          Avisos
          <span
            v-if="noLlegits > 0"
            class="badge badge-primary ml-1"
            :aria-label="noLlegits + ' no llegits'"
          >
            {{ noLlegits }}
          </span>
        </RouterLink>
        <RouterLink
          v-if="sessio.role === 'responsible'"
          class="btn btn-ghost min-h-11"
          to="/coordinadors/convidar"
        >
          Convida
        </RouterLink>
        <button class="btn btn-ghost min-h-11" type="button" @click="sortir">Surt</button>
      </div>
    </header>
    <RouterView />
  </div>
</template>
