<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";

import { PALETES, paletaDe } from "../aparenca";
import { ApiError, requireIdentityApi } from "../services/identitat";
import { useAparencaStore } from "../stores/aparenca";
import { useSessioStore } from "../stores/sessio";

const api = requireIdentityApi();
const sessio = useSessioStore();
const aparenca = useAparencaStore();

const obert = ref(false);
const enviant = ref(false);
const error = ref("");
const arrel = ref<HTMLElement | null>(null);

const actual = computed(() => PALETES.find((item) => item.id === aparenca.paleta) ?? PALETES[0]);

function tancar() {
  obert.value = false;
}

function onDocumentClick(event: MouseEvent) {
  if (arrel.value && !arrel.value.contains(event.target as Node)) {
    tancar();
  }
}

function onKey(event: KeyboardEvent) {
  if (event.key === "Escape") {
    tancar();
  }
}

onMounted(() => {
  document.addEventListener("mousedown", onDocumentClick);
  document.addEventListener("keydown", onKey);
});

onUnmounted(() => {
  document.removeEventListener("mousedown", onDocumentClick);
  document.removeEventListener("keydown", onKey);
});

async function triar(id: string) {
  tancar();
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
      class="btn btn-outline min-h-11 w-full justify-between gap-3"
      type="button"
      :aria-expanded="obert"
      aria-haspopup="listbox"
      aria-controls="paleta-entitat-opcions"
      :disabled="enviant"
      @click="obert = !obert"
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
      class="absolute z-50 mt-1 w-full rounded-box bg-base-100 p-1 shadow-sm"
      role="listbox"
      :aria-labelledby="'paleta-entitat'"
    >
      <li v-for="item in PALETES" :key="item.id" role="option" :aria-selected="item.id === aparenca.paleta">
        <button
          class="flex w-full min-h-11 items-center justify-between gap-3 rounded-box px-3 text-left hover:bg-base-200"
          type="button"
          @click="triar(item.id)"
        >
          <span>{{ item.etiqueta }}</span>
          <span class="flex gap-1" aria-hidden="true">
            <span
              v-for="toc in item.tocs"
              :key="toc"
              class="size-4 rounded-full border border-base-content/20"
              :style="{ backgroundColor: toc }"
            />
          </span>
        </button>
      </li>
    </ul>
    <p v-if="error" class="mt-2 text-sm text-error" role="alert">{{ error }}</p>
  </div>
</template>
