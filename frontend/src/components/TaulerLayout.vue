<script setup lang="ts">
import { computed } from "vue";
import { RouterView } from "vue-router";

import TaulerMenu from "./TaulerMenu.vue";
import { useSessioStore } from "../stores/sessio";

const sessio = useSessioStore();
const esResponsable = computed(() => sessio.role === "responsible");
</script>

<template>
  <div class="w-full px-4 py-6 lg:flex lg:items-start lg:gap-8">
    <aside v-if="esResponsable" class="mb-6 lg:mb-0 lg:w-60 lg:shrink-0">
      <details class="lg:hidden rounded-box bg-base-100 shadow-sm">
        <summary class="flex min-h-11 cursor-pointer list-none items-center px-4 py-3 font-semibold [&::-webkit-details-marker]:hidden">
          {{ sessio.entityName }}
        </summary>
        <TaulerMenu compacte />
      </details>
      <div class="hidden lg:block rounded-box bg-base-100 shadow-sm">
        <TaulerMenu />
      </div>
    </aside>
    <div class="min-w-0 flex-1">
      <RouterView />
    </div>
  </div>
</template>
