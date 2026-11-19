import { defineStore } from "pinia";
import { computed, ref } from "vue";

import type { AvisDto } from "../services/avisos";

/**
 * Avisos del coordinador, compartits per la safata, el compte del menú i l’avís pendent.
 * La font de veritat és el backend: aquí només hi ha l’última còpia carregada.
 */
export const useAvisosStore = defineStore("avisos", () => {
  const avisos = ref<AvisDto[]>([]);
  const carregats = ref(false);

  const noLlegits = computed(() => avisos.value.filter((avis) => avis.read_at == null).length);

  function definir(items: AvisDto[]) {
    avisos.value = items;
    carregats.value = true;
  }

  function substituir(avis: AvisDto) {
    avisos.value = avisos.value.map((actual) => (actual.id === avis.id ? avis : actual));
  }

  function treure(avisId: string) {
    avisos.value = avisos.value.filter((avis) => avis.id !== avisId);
  }

  function buidar() {
    avisos.value = [];
    carregats.value = false;
  }

  return { avisos, carregats, noLlegits, definir, substituir, treure, buidar };
});
