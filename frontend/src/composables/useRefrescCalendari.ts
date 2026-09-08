import { onUnmounted } from "vue";

import { requireDisparadorCalendari } from "../calendariLive";

/**
 * Enganxa el port DisparadorCalendari al refetch.
 * Un socket futur només canvia l’adaptador injectat (ADR 0007).
 */
export function useRefrescCalendari(avisar: () => void, pausat: () => boolean) {
  const disparador = requireDisparadorCalendari();
  let aturar: (() => void) | null = null;

  function engegar() {
    aturar?.();
    aturar = disparador.iniciar(() => {
      if (pausat()) {
        return;
      }
      avisar();
    });
  }

  function aturarRefresc() {
    aturar?.();
    aturar = null;
  }

  onUnmounted(aturarRefresc);
  return { engegar, aturarRefresc };
}
