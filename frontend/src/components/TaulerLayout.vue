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
      <details class="group lg:hidden rounded-box bg-base-100 shadow-sm">
        <summary class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold [&::-webkit-details-marker]:hidden">
          <span class="min-w-0">{{ sessio.entityName }}</span>
          <svg
            class="h-5 w-5 shrink-0 transition-transform group-open:rotate-180"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M5 7.5 10 12.5 15 7.5"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
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
