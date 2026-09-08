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
  <div class="min-h-screen">
    <header class="navbar bg-base-100 shadow-sm">
      <div class="flex-1">
        <RouterLink class="btn btn-ghost text-xl min-h-11" to="/">Espais</RouterLink>
      </div>
      <div v-if="sessio.iniciada" class="flex-none gap-1">
        <RouterLink class="btn btn-ghost min-h-11" to="/espais">Espais</RouterLink>
        <button class="btn btn-ghost min-h-11" type="button" @click="sortir">Surt</button>
      </div>
    </header>
    <RouterView />
  </div>
</template>
