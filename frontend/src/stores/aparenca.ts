import { defineStore } from "pinia";
import { ref } from "vue";

import {
  LEGACY_STORAGE_KEY,
  MODE_STORAGE_KEY,
  SESSIO_STORAGE_KEY,
  aplicarTema,
  esPaletaId,
  llegirMode,
  llegirPaletaEntitat,
  type ModeAparenca,
  type PaletaId,
} from "../aparenca";

export { PALETES, nomTema } from "../aparenca";
export type { ModeAparenca, PaletaId };

function modeInicial(): ModeAparenca {
  if (typeof localStorage === "undefined") {
    return "clar";
  }
  return llegirMode(localStorage.getItem(MODE_STORAGE_KEY), localStorage.getItem(LEGACY_STORAGE_KEY));
}

function paletaInicial(): PaletaId {
  if (typeof localStorage === "undefined") {
    return "mar-cel";
  }
  return llegirPaletaEntitat(localStorage.getItem(SESSIO_STORAGE_KEY));
}

export const useAparencaStore = defineStore("aparenca", () => {
  const paleta = ref<PaletaId>(paletaInicial());
  const mode = ref<ModeAparenca>(modeInicial());

  function persistirMode() {
    if (typeof localStorage === "undefined") {
      return;
    }
    localStorage.setItem(MODE_STORAGE_KEY, mode.value);
  }

  function aplicar() {
    aplicarTema(paleta.value, mode.value);
  }

  function setPaletaEntitat(valor: string) {
    if (esPaletaId(valor)) {
      paleta.value = valor;
      aplicar();
    }
  }

  function setMode(valor: string) {
    mode.value = valor === "fosc" ? "fosc" : "clar";
    persistirMode();
    aplicar();
  }

  persistirMode();
  aplicar();

  return { paleta, mode, setPaletaEntitat, setMode };
});
