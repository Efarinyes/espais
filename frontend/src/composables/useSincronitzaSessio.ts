import { inject, onMounted, onUnmounted, watch } from "vue";

import { PALETA_PER_DEFECTE } from "../aparenca";
import { identityApiKey } from "../services/identitat";
import { useAparencaStore } from "../stores/aparenca";
import { useSessioStore } from "../stores/sessio";

export function useSincronitzaSessio() {
  const api = inject(identityApiKey, null);
  const sessio = useSessioStore();
  const aparenca = useAparencaStore();

  async function refrescar() {
    if (!api || !sessio.iniciada) {
      return;
    }
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return;
    }
    try {
      const view = await api.obtenirSessio(sessio.token);
      sessio.aplicarVista(view);
    } catch {
      /* sessió caducada: no tanquem aquí */
    }
  }

  watch(
    () => [sessio.iniciada, sessio.palette] as const,
    ([iniciada, palette]) => {
      aparenca.setPaletaEntitat(iniciada ? palette : PALETA_PER_DEFECTE);
    },
    { immediate: true },
  );

  onMounted(() => {
    void refrescar();
    window.addEventListener("focus", refrescar);
    document.addEventListener("visibilitychange", refrescar);
  });

  onUnmounted(() => {
    window.removeEventListener("focus", refrescar);
    document.removeEventListener("visibilitychange", refrescar);
  });
}
