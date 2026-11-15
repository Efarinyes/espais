<script setup lang="ts">
import { RouterLink } from "vue-router";

import { useAvisCookies } from "../composables/useAvisCookies";

const { visible, tancar } = useAvisCookies();
</script>

<template>
  <div v-if="visible" class="h-52 md:h-36" aria-hidden="true"></div>
  <section
    v-if="visible"
    id="nota-funcio"
    class="fixed inset-x-0 bottom-0 z-40 max-h-[50vh] overflow-y-auto border-t border-base-300 bg-base-100 px-4 pt-4 shadow-lg pb-[max(1rem,env(safe-area-inset-bottom))]"
    aria-labelledby="nota-funcio-titol"
  >
    <div class="mx-auto flex w-full max-w-5xl flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div class="min-w-0">
        <h2 id="nota-funcio-titol" class="text-base font-semibold">Cookies</h2>
        <p class="mt-1 text-sm leading-snug">
          Espais només desa al navegador el que cal perquè l’aplicació funcioni: el mode clar o fosc, la sessió si
          entres, i una còpia dels fitxers de l’aplicació. No mesurem visites ni fem servir cookies de tercers.
        </p>
      </div>
      <div class="flex w-full shrink-0 flex-col gap-2 sm:flex-row md:w-auto">
        <RouterLink class="btn btn-outline min-h-11 w-full md:w-auto" to="/politica-de-cookies">
          Política de cookies
        </RouterLink>
        <button class="btn btn-primary min-h-11 w-full md:w-auto" type="button" @click="tancar">Tanca l’avís</button>
      </div>
    </div>
  </section>
</template>
