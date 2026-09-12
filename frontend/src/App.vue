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

const esResponsable = computed(() => sessio.role === "responsible");
const esCoordinador = computed(() => sessio.role === "coordinator");
const anyPeu = computed(() => new Date().getFullYear());

function sortir() {
  sessio.sortir();
  void router.push({ name: "inici" });
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <a class="skip-link" href="#contingut">Ves al contingut</a>
    <header class="navbar flex-wrap bg-base-100 shadow-sm">
      <div class="flex-1 flex items-center gap-2 min-w-0">
        <RouterLink class="btn btn-ghost text-2xl font-semibold min-h-11 shrink-0" to="/">Espais</RouterLink>
        <span v-if="etiquetaRol" class="badge badge-outline shrink-0">{{ etiquetaRol }}</span>
      </div>
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
          <li>
            <RouterLink class="btn btn-ghost min-h-11" to="/espais">Els espais</RouterLink>
          </li>
          <li>
            <RouterLink class="btn btn-ghost min-h-11" to="/calendari">Calendari</RouterLink>
          </li>
          <li v-if="esResponsable">
            <RouterLink class="btn btn-ghost min-h-11" to="/analisi">Anàlisi</RouterLink>
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
          <li v-if="esResponsable">
            <RouterLink class="btn btn-ghost min-h-11" to="/coordinadors/convidar">Convida</RouterLink>
          </li>
          <li>
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
          <ul class="menu dropdown-content bg-base-100 rounded-box z-50 mt-2 w-56 p-2 shadow-sm">
            <li>
              <RouterLink class="min-h-11" to="/espais">Els espais</RouterLink>
            </li>
            <li>
              <RouterLink class="min-h-11" to="/calendari">Calendari</RouterLink>
            </li>
            <li v-if="esResponsable">
              <RouterLink class="min-h-11" to="/analisi">Anàlisi</RouterLink>
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
            <li v-if="esResponsable">
              <RouterLink class="min-h-11" to="/coordinadors/convidar">Convida</RouterLink>
            </li>
            <li>
              <button class="min-h-11" type="button" @click="sortir">Surt</button>
            </li>
          </ul>
        </details>
      </nav>
    </header>
    <div id="contingut" class="flex-1">
      <RouterView />
    </div>
    <footer class="mx-4 mb-6 mt-8 rounded-box bg-base-100 px-4 py-3 text-sm text-base-content/70 shadow-sm">
      <p>© {{ anyPeu }} Eduard Farinyes · Codi obert · ús intern i gratuït</p>
    </footer>
  </div>
</template>
