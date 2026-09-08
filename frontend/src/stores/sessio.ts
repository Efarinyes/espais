import { defineStore } from "pinia";
import { ref } from "vue";

/** Sessió d’auth (Fase 2). Pinia només per estat transversal. */
export const useSessioStore = defineStore("sessio", () => {
  const iniciada = ref(false);
  return { iniciada };
});
