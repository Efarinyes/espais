<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";

import { PALETES, paletaDe } from "../aparenca";
import { ApiError } from "../services/http";
import { requireIdentityApi } from "../services/identitat";
import { useAparencaStore } from "../stores/aparenca";
import { useSessioStore } from "../stores/sessio";

const api = requireIdentityApi();
const sessio = useSessioStore();
const aparenca = useAparencaStore();

const obert = ref(false);
const enviant = ref(false);
const error = ref("");
const arrel = ref<HTMLElement | null>(null);
const boto = ref<HTMLButtonElement | null>(null);
const llista = ref<HTMLElement | null>(null);
const destacat = ref(0);

const actual = computed(() => PALETES.find((item) => item.id === aparenca.paleta) ?? PALETES[0]);
const idActiu = computed(() => `paleta-opcio-${PALETES[destacat.value]?.id ?? PALETES[0].id}`);

function indexPaleta(id: string): number {
  const index = PALETES.findIndex((item) => item.id === id);
  return index >= 0 ? index : 0;
}

function tancar() {
  obert.value = false;
}

function tancarIFocus() {
  tancar();
  boto.value?.focus();
}

async function obrir() {
  destacat.value = indexPaleta(aparenca.paleta);
  obert.value = true;
  await nextTick();
  llista.value?.focus();
}

function onDocumentClick(event: MouseEvent) {
  if (arrel.value && !arrel.value.contains(event.target as Node)) {
    tancar();
  }
}

function onDocumentKey(event: KeyboardEvent) {
  if (event.key === "Escape" && obert.value) {
    event.preventDefault();
    tancarIFocus();
  }
}

onMounted(() => {
  document.addEventListener("mousedown", onDocumentClick);
  document.addEventListener("keydown", onDocumentKey);
});

onUnmounted(() => {
  document.removeEventListener("mousedown", onDocumentClick);
  document.removeEventListener("keydown", onDocumentKey);
});

function onBotoKey(event: KeyboardEvent) {
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    void obrir();
  }
}

function onLlistaKey(event: KeyboardEvent) {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    destacat.value = (destacat.value + 1) % PALETES.length;
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    destacat.value = (destacat.value - 1 + PALETES.length) % PALETES.length;
  } else if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    void triar(PALETES[destacat.value].id);
  } else if (event.key === "Escape") {
    event.preventDefault();
    tancarIFocus();
  } else if (event.key === "Tab") {
    tancar();
  }
}

async function triar(id: string) {
  tancarIFocus();
  if (!sessio.iniciada || enviant.value || id === aparenca.paleta) {
    return;
  }
  error.value = "";
  enviant.value = true;
  const previa = aparenca.paleta;
  aparenca.setPaletaEntitat(id);
  try {
    const resultat = await api.actualitzarPaleta(sessio.token, id);
    const paleta = paletaDe(resultat.palette);
    sessio.setPalette(paleta);
    aparenca.setPaletaEntitat(paleta);
  } catch (err) {
    aparenca.setPaletaEntitat(previa);
    error.value = err instanceof ApiError ? err.message : "No s’ha pogut desar la paleta.";
  } finally {
    enviant.value = false;
  }
}
</script>

<template>
  <div ref="arrel" class="relative">
    <button
      id="paleta-entitat"
      ref="boto"
      class="btn btn-outline min-h-11 w-full justify-between gap-3"
      type="button"
      :aria-expanded="obert"
      aria-haspopup="listbox"
      aria-controls="paleta-entitat-opcions"
      :disabled="enviant"
      @click="obert ? tancar() : obrir()"
      @keydown="onBotoKey"
    >
      <span>{{ actual.etiqueta }}</span>
      <span class="flex gap-1" aria-hidden="true">
        <span
          v-for="toc in actual.tocs"
          :key="toc"
          class="size-4 rounded-full border border-base-content/20"
          :style="{ backgroundColor: toc }"
        />
      </span>
    </button>
    <ul
      v-if="obert"
      id="paleta-entitat-opcions"
      ref="llista"
      class="absolute z-50 mt-1 w-full rounded-box border border-base-300 bg-base-100 p-1 shadow-md"
      role="listbox"
      tabindex="0"
      :aria-labelledby="'paleta-entitat'"
      :aria-activedescendant="idActiu"
      @keydown="onLlistaKey"
    >
      <li
        v-for="(item, index) in PALETES"
        :id="`paleta-opcio-${item.id}`"
        :key="item.id"
        role="option"
        class="flex w-full min-h-11 cursor-pointer items-center justify-between gap-3 rounded-box px-3 text-left"
        :class="index === destacat ? 'bg-base-200' : 'hover:bg-base-200'"
        :aria-selected="item.id === aparenca.paleta"
        @click="triar(item.id)"
      >
        <span :class="item.id === aparenca.paleta ? 'font-medium' : ''">{{ item.etiqueta }}</span>
        <span class="flex gap-1" aria-hidden="true">
          <span
            v-for="toc in item.tocs"
            :key="toc"
            class="size-4 rounded-full border border-base-content/20"
            :style="{ backgroundColor: toc }"
          />
        </span>
      </li>
    </ul>
    <p v-if="error" class="mt-2 text-sm text-error" role="alert">{{ error }}</p>
  </div>
</template>
