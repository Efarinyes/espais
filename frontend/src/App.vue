<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from "vue-router";

import { useSessioStore } from "./stores/sessio";

const sessio = useSessioStore();
const router = useRouter();

function sortir() {
  sessio.sortir();
  void router.push({ name: "inici" });
}
</script>

<template>
  <div>
    <header class="capcalera">
      <RouterLink class="capcalera__marca" to="/">Espais</RouterLink>
      <div v-if="sessio.iniciada" class="capcalera__accions">
        <RouterLink class="boto boto--text" to="/espais">Espais</RouterLink>
        <button class="boto boto--text" type="button" @click="sortir">Surt</button>
      </div>
    </header>
    <RouterView />
  </div>
</template>
