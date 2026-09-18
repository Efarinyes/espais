<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";

import { useSessioStore } from "../stores/sessio";

const sessio = useSessioStore();
const ruta = useRoute();
const router = useRouter();

const esResponsable = computed(() => sessio.role === "responsible");
const esEspais = computed(() => ruta.path.startsWith("/espais"));
const esColors = computed(() => ruta.path.startsWith("/entitat/colors"));
const esConvida = computed(() => ruta.path.startsWith("/coordinadors/convidar"));
const esEstadistiques = computed(() => ruta.path.startsWith("/analisi"));

function sortir() {
  sessio.sortir();
  void router.push({ name: "inici" });
}
</script>

<template>
  <div class="w-full px-4 py-6 lg:flex lg:items-start lg:gap-8">
    <aside v-if="esResponsable" class="mb-6 lg:mb-0 lg:w-60 lg:shrink-0">
      <div class="rounded-box bg-base-100 shadow-sm">
        <div class="px-4 pt-4 pb-3">
          <p class="text-xs font-medium uppercase tracking-wide text-base-content/55">Entitat</p>
          <p class="mt-1 text-lg font-semibold leading-snug">{{ sessio.entityName }}</p>
          <p v-if="sessio.typology" class="mt-1 text-sm text-base-content/70">{{ sessio.typology }}</p>
          <div class="mt-3 border-t border-base-content/10 pt-3">
            <p class="font-medium leading-snug">{{ sessio.userName }}</p>
            <p class="text-sm text-base-content/70">Responsable</p>
          </div>
        </div>
        <nav aria-label="Administració">
          <ul class="menu w-full p-2 pt-0">
            <li>
              <RouterLink
                class="min-h-11"
                to="/entitat/colors"
                :aria-current="esColors ? 'page' : undefined"
              >
                Colors de l’entitat
              </RouterLink>
            </li>
            <li>
              <RouterLink
                class="min-h-11"
                to="/coordinadors/convidar"
                :aria-current="esConvida ? 'page' : undefined"
              >
                Convida coordinadors
              </RouterLink>
            </li>
            <li>
              <RouterLink
                class="min-h-11"
                to="/espais"
                :aria-current="esEspais ? 'page' : undefined"
              >
                Espais
              </RouterLink>
            </li>
            <li>
              <RouterLink
                class="min-h-11"
                to="/analisi"
                :aria-current="esEstadistiques ? 'page' : undefined"
              >
                Estadístiques
              </RouterLink>
            </li>
            <li class="border-t border-base-content/20">
              <button class="min-h-11 text-error" type="button" @click="sortir">Surt</button>
            </li>
          </ul>
        </nav>
      </div>
    </aside>
    <div class="min-w-0 flex-1">
      <RouterView />
    </div>
  </div>
</template>
