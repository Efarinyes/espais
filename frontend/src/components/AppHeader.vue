<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";

import SelectorAparenca from "./SelectorAparenca.vue";
import { destiDespresSessio } from "../navegacio";
import { useSessioStore } from "../stores/sessio";

const sessio = useSessioStore();
const iniciLogo = computed(() => destiDespresSessio(sessio.role));
</script>

<template>
  <header class="bg-base-100 shadow-sm">
    <div class="navbar">
      <div class="navbar-start min-w-0 flex-1">
        <RouterLink class="btn btn-ghost text-2xl font-semibold min-h-11 shrink-0" :to="iniciLogo">Espais</RouterLink>
      </div>
      <div class="navbar-end gap-1">
        <div :class="sessio.iniciada ? '' : 'max-lg:hidden'">
          <SelectorAparenca />
        </div>
        <nav v-if="!sessio.iniciada" class="hidden flex-none lg:block" aria-label="Accés">
          <ul class="flex flex-wrap items-center justify-end gap-1">
            <li>
              <RouterLink class="btn btn-ghost min-h-11" to="/iniciar-sessio">Inicia sessió</RouterLink>
            </li>
            <li>
              <RouterLink class="btn btn-primary min-h-11" to="/registre">Registra l’entitat</RouterLink>
            </li>
          </ul>
        </nav>
      </div>
    </div>
    <nav v-if="!sessio.iniciada" class="flex gap-2 px-4 pb-3 lg:hidden" aria-label="Accés al mòbil">
      <RouterLink class="btn btn-ghost min-h-11 flex-1" to="/iniciar-sessio">Inicia sessió</RouterLink>
      <RouterLink class="btn btn-primary min-h-11 flex-1" to="/registre">Registra l’entitat</RouterLink>
    </nav>
  </header>
</template>
