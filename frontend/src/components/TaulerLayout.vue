<script setup lang="ts">
import { ref } from "vue";
import { RouterView } from "vue-router";

import TaulerMenu from "./TaulerMenu.vue";
import { useMenuMobil } from "../composables/useMenuMobil";
import { useSessioStore } from "../stores/sessio";

const sessio = useSessioStore();
const contingut = ref<HTMLElement | null>(null);
const boto = ref<HTMLButtonElement | null>(null);
const panell = ref<HTMLElement | null>(null);
const { obert, alternar, tancar } = useMenuMobil(contingut, boto, panell);
</script>

<template>
  <div class="w-full px-4 py-6 lg:flex lg:items-start lg:gap-8">
    <aside v-if="sessio.iniciada" class="mb-6 lg:mb-0 lg:w-60 lg:shrink-0">
      <div class="relative z-50 lg:hidden">
        <button
          ref="boto"
          class="flex w-full min-h-11 cursor-pointer items-center justify-between gap-3 rounded-box bg-base-100 px-4 py-3 text-start font-semibold shadow-sm"
          type="button"
          data-obre-menu
          :aria-expanded="obert"
          :aria-controls="obert ? 'menu-mobil' : undefined"
          :aria-label="(obert ? 'Tanca el menú, ' : 'Obre el menú, ') + sessio.entityName"
          @click="alternar"
        >
          <span class="min-w-0">{{ sessio.entityName }}</span>
          <svg class="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              v-if="obert"
              d="M5 5 15 15M15 5 5 15"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
            />
            <path
              v-else
              d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>
      <div v-if="obert" class="lg:hidden">
        <button
          class="fixed inset-0 z-40 bg-base-content/40"
          type="button"
          tabindex="-1"
          data-fons-menu
          aria-label="Tanca el menú"
          @click="tancar()"
        />
        <div
          id="menu-mobil"
          ref="panell"
          class="fixed top-20 left-4 z-40 w-80 max-h-[calc(100dvh-6rem)] max-w-[calc(100%-2rem)] overflow-y-auto rounded-box bg-base-100 shadow-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Menú"
        >
          <div class="flex justify-end px-2 pt-2">
            <button class="btn btn-ghost min-h-11" type="button" data-tanca-menu @click="tancar()">
              Tanca
            </button>
          </div>
          <TaulerMenu compacte />
        </div>
      </div>
      <div class="hidden lg:block rounded-box bg-base-100 shadow-sm">
        <TaulerMenu />
      </div>
    </aside>
    <div ref="contingut" class="min-w-0 flex-1 outline-none" tabindex="-1" data-contingut :inert="obert ? true : undefined">
      <RouterView />
    </div>
  </div>
</template>
