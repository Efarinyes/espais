import { storeToRefs } from "pinia";
import { onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

import { ApiError } from "../services/http";
import { requireAvisosApi } from "../services/avisos";
import { useAvisosStore } from "../stores/avisos";
import { useSessioStore } from "../stores/sessio";
import { requireDisparadorCalendari } from "../calendariLive";

export function useAvisos() {
  const api = requireAvisosApi();
  const sessio = useSessioStore();
  const store = useAvisosStore();
  const { avisos, noLlegits } = storeToRefs(store);
  const carregant = ref(false);
  const error = ref("");
  const seleccionat = ref<string | null>(null);
  const arxivant = ref<string | null>(null);

  async function carregar() {
    if (!sessio.token) {
      store.buidar();
      return;
    }
    carregant.value = true;
    error.value = "";
    try {
      store.definir(await api.llistar(sessio.token));
    } catch (err) {
      store.buidar();
      error.value = err instanceof ApiError ? err.message : "No s’han pogut carregar els avisos.";
    } finally {
      carregant.value = false;
    }
  }

  async function obrir(avisId: string) {
    seleccionat.value = avisId;
    const actual = avisos.value.find((avis) => avis.id === avisId);
    if (!sessio.token || !actual || actual.read_at) {
      return;
    }
    try {
      const actualitzat = await api.marcarLlegit(sessio.token, avisId);
      store.substituir(actualitzat);
    } catch {
      /* l’avís es pot rellegir; no bloquegem el detall */
    }
  }

  async function arxivar(avisId: string) {
    const actual = avisos.value.find((avis) => avis.id === avisId);
    if (!sessio.token || !actual || !actual.read_at || arxivant.value) {
      return;
    }
    arxivant.value = avisId;
    error.value = "";
    try {
      await api.arxivar(sessio.token, avisId);
      store.treure(avisId);
      if (seleccionat.value === avisId) {
        seleccionat.value = null;
      }
    } catch (err) {
      error.value = err instanceof ApiError ? err.message : "No s’ha pogut arxivar l’avís.";
    } finally {
      arxivant.value = null;
    }
  }

  return { avisos, carregant, error, seleccionat, arxivant, noLlegits, carregar, obrir, arxivar };
}

export function useComptadorAvisos() {
  const api = requireAvisosApi();
  const sessio = useSessioStore();
  const route = useRoute();
  const disparador = requireDisparadorCalendari();
  const store = useAvisosStore();
  const { noLlegits } = storeToRefs(store);
  let aturar: (() => void) | null = null;
  let aturarMissatges: (() => void) | null = null;

  async function refrescar() {
    if (!sessio.token || !sessio.iniciada) {
      store.buidar();
      return;
    }
    try {
      store.definir(await api.llistar(sessio.token));
    } catch {
      /* el badge no ha de trencar la navegació */
    }
  }

  onMounted(() => {
    void refrescar();
    aturar = disparador.iniciar(() => {
      void refrescar();
    });
    aturarMissatges = escoltaPushDelServiceWorker(() => {
      void refrescar();
    });
  });

  onUnmounted(() => {
    aturar?.();
    aturarMissatges?.();
  });

  watch(
    () => [sessio.iniciada, sessio.token, route.fullPath] as const,
    () => {
      void refrescar();
    },
  );

  return { noLlegits, refrescar };
}

/** Missatge que `push-sw.js` envia a les pestanyes obertes quan arriba un push. */
export const MISSATGE_PUSH_SW = "espais-push";

type FontMissatgesSw = {
  addEventListener(type: "message", listener: (event: MessageEvent) => void): void;
  removeEventListener(type: "message", listener: (event: MessageEvent) => void): void;
};

/**
 * El push només desperta la safata: l’avís real es llegeix del backend. Així el push
 * no pot marcar res com a llegit ni mostrar un estat que el backend no tingui.
 */
export function escoltaPushDelServiceWorker(
  alRebre: () => void,
  font: FontMissatgesSw | undefined = typeof navigator !== "undefined" ? navigator.serviceWorker : undefined,
): () => void {
  if (!font) {
    return () => undefined;
  }
  const escolta = (event: MessageEvent) => {
    const dades = event.data as { type?: string } | null;
    if (dades?.type === MISSATGE_PUSH_SW) {
      alRebre();
    }
  };
  font.addEventListener("message", escolta);
  return () => font.removeEventListener("message", escolta);
}
