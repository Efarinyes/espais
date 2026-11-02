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
      <div class="lg:hidden">
        <button
          ref="boto"
          class="flex w-full min-h-11 cursor-pointer items-center justify-between gap-3 rounded-box bg-base-100 px-4 py-3 text-start font-semibold shadow-sm"
          type="button"
          data-obre-menu
          :aria-expanded="obert"
          :aria-controls="obert ? 'menu-mobil' : undefined"
          :aria-label="'Obre el menú, ' + sessio.entityName"
          @click="alternar"
        >
          <span class="min-w-0">{{ sessio.entityName }}</span>
          <svg class="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>
      <Transition name="calaix" :duration="180">
        <div v-if="obert" class="lg:hidden">
          <button
            class="calaix-fons fixed inset-0 z-40 bg-base-content/40"
            type="button"
            tabindex="-1"
            data-fons-menu
            aria-label="Tanca el menú"
            @click="tancar()"
          />
          <div
            id="menu-mobil"
            ref="panell"
            class="calaix-panell fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(300px,100%)] flex-col bg-base-100 shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-label="Menú"
          >
            <div class="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-base-content/10 px-4" data-capcalera-menu>
              <p class="min-w-0 truncate font-semibold">{{ sessio.entityName }}</p>
              <button class="btn btn-ghost min-h-11 shrink-0" type="button" data-tanca-menu @click="tancar()">
                Tanca
              </button>
            </div>
            <div class="min-h-0 flex-1 overflow-y-auto" data-cos-menu>
              <TaulerMenu compacte />
            </div>
          </div>
        </div>
      </Transition>
      <div class="hidden lg:block rounded-box bg-base-100 shadow-sm">
        <TaulerMenu />
      </div>
    </aside>
    <div ref="contingut" class="min-w-0 flex-1 outline-none" tabindex="-1" data-contingut :inert="obert ? true : undefined">
      <RouterView />
    </div>
  </div>
</template>

<style scoped>
.calaix-enter-active .calaix-fons,
.calaix-leave-active .calaix-fons {
  transition: opacity 180ms ease;
}

.calaix-enter-from .calaix-fons,
.calaix-leave-to .calaix-fons {
  opacity: 0;
}

.calaix-enter-active .calaix-panell,
.calaix-leave-active .calaix-panell {
  transition: transform 180ms ease;
}

.calaix-enter-from .calaix-panell,
.calaix-leave-to .calaix-panell {
  transform: translateX(-100%);
}
</style>
