import { inject, onMounted, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";

import { PALETA_PER_DEFECTE } from "../aparenca";
import { ApiError } from "../services/http";
import { identityApiKey } from "../services/identitat";
import { useAparencaStore } from "../stores/aparenca";
import { useSessioStore } from "../stores/sessio";

export function useSincronitzaSessio() {
  const api = inject(identityApiKey, null);
  const sessio = useSessioStore();
  const aparenca = useAparencaStore();
  const router = useRouter();

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
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 401) {
        return;
      }
      sessio.sortir();
      if (router.currentRoute.value.meta.requiresAuth) {
        await router.replace({ name: "iniciar-sessio" });
      }
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
