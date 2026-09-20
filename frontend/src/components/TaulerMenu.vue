<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import { useSessioStore } from "../stores/sessio";

defineProps<{
  compacte?: boolean;
}>();

const sessio = useSessioStore();
const ruta = useRoute();
const router = useRouter();

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
  <div>
    <div v-if="!compacte" class="px-4 pt-4">
      <p class="text-xs font-medium uppercase tracking-wide text-base-content/55">Entitat</p>
      <p class="mt-1 text-lg font-semibold leading-snug">{{ sessio.entityName }}</p>
      <p class="mt-5 leading-snug">
        <span class="text-sm text-base-content/70">Hola, </span>
        <span class="mt-0.5 block font-medium">{{ sessio.userName }}</span>
      </p>
    </div>
    <div v-else class="px-4 pt-2">
      <p class="leading-snug">
        <span class="text-sm text-base-content/70">Hola, </span>
        <span class="mt-0.5 block font-medium">{{ sessio.userName }}</span>
      </p>
    </div>
    <nav class="mt-4 border-t border-base-content/10" aria-label="Administració">
      <ul class="menu w-full p-2">
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
          <RouterLink
            class="min-h-11"
            to="/entitat/colors"
            :aria-current="esColors ? 'page' : undefined"
          >
            Tria els colors
          </RouterLink>
        </li>
        <li>
          <button class="min-h-11 text-error" type="button" @click="sortir">Surt</button>
        </li>
      </ul>
    </nav>
  </div>
</template>
