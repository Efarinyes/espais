<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRouter } from "vue-router";

import SelectorAparenca from "./SelectorAparenca.vue";
import { useComptadorAvisos } from "../composables/useAvisos";
import { destiDespresSessio } from "../navegacio";
import { useSessioStore } from "../stores/sessio";

const sessio = useSessioStore();
const router = useRouter();
const { noLlegits } = useComptadorAvisos();

const esResponsable = computed(() => sessio.role === "responsible");
const esCoordinador = computed(() => sessio.role === "coordinator");
const titolAdministracio = computed(() =>
  sessio.entityName ? `Administració de ${sessio.entityName}` : "",
);
const iniciLogo = computed(() => destiDespresSessio(sessio.role));

function sortir() {
  sessio.sortir();
  void router.push({ name: "inici" });
}
</script>

<template>
  <header class="navbar bg-base-100 shadow-sm">
    <div class="navbar-start min-w-0 flex-1 gap-2">
      <RouterLink class="btn btn-ghost text-2xl font-semibold min-h-11 shrink-0" :to="iniciLogo">Espais</RouterLink>
      <span
        v-if="esResponsable && titolAdministracio"
        class="hidden min-w-0 truncate text-sm text-base-content/70 sm:inline"
        :title="titolAdministracio"
      >
        {{ titolAdministracio }}
      </span>
      <span v-else-if="esCoordinador" class="badge badge-outline shrink-0 hidden sm:inline-flex">Coordinador</span>
    </div>
    <div class="navbar-end gap-1">
      <SelectorAparenca />
      <nav v-if="!sessio.iniciada" class="flex-none" aria-label="Accés">
        <ul class="flex flex-wrap items-center justify-end gap-1">
          <li>
            <RouterLink class="btn btn-ghost min-h-11" to="/iniciar-sessio">Inicia sessió</RouterLink>
          </li>
          <li>
            <RouterLink class="btn btn-primary min-h-11" to="/registre">Registra l’entitat</RouterLink>
          </li>
        </ul>
      </nav>
      <nav v-else class="flex-none" aria-label="Principal">
        <ul class="hidden lg:flex items-center gap-1">
          <li v-if="esCoordinador">
            <RouterLink class="btn btn-ghost min-h-11" to="/espais">Els espais</RouterLink>
          </li>
          <li>
            <RouterLink class="btn btn-ghost min-h-11" to="/calendari">Calendari</RouterLink>
          </li>
          <li v-if="esCoordinador">
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
          </li>
          <li v-if="esCoordinador">
            <button class="btn btn-ghost min-h-11" type="button" @click="sortir">Surt</button>
          </li>
        </ul>
        <details class="dropdown dropdown-end lg:hidden">
          <summary class="btn btn-ghost min-h-11">
            Menú
            <span
              v-if="esCoordinador && noLlegits > 0"
              class="badge badge-primary ml-1"
              :aria-label="noLlegits + ' avisos no llegits'"
            >
              {{ noLlegits }}
            </span>
          </summary>
          <ul class="menu dropdown-content bg-base-100 rounded-box z-50 mt-2 w-56 p-2 shadow-md border border-base-300">
            <li v-if="esCoordinador">
              <RouterLink class="min-h-11" to="/espais">Els espais</RouterLink>
            </li>
            <li>
              <RouterLink class="min-h-11" to="/calendari">Calendari</RouterLink>
            </li>
            <li v-if="esCoordinador">
              <RouterLink class="min-h-11" to="/avisos">
                Avisos
                <span
                  v-if="noLlegits > 0"
                  class="badge badge-primary"
                  :aria-label="noLlegits + ' no llegits'"
                >
                  {{ noLlegits }}
                </span>
              </RouterLink>
            </li>
            <li v-if="esCoordinador">
              <button class="min-h-11" type="button" @click="sortir">Surt</button>
            </li>
          </ul>
        </details>
      </nav>
    </div>
  </header>
</template>
