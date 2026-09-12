import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

import { ApiError } from "../services/identitat";
import { requireAvisosApi, type AvisDto } from "../services/avisos";
import { useSessioStore } from "../stores/sessio";
import { requireDisparadorCalendari } from "../calendariLive";

export function useAvisos() {
  const api = requireAvisosApi();
  const sessio = useSessioStore();
  const avisos = ref<AvisDto[]>([]);
  const carregant = ref(false);
  const error = ref("");
  const seleccionat = ref<string | null>(null);
  const arxivant = ref<string | null>(null);

  const noLlegits = computed(() => avisos.value.filter((avis) => avis.read_at == null).length);

  async function carregar() {
    if (!sessio.token) {
      avisos.value = [];
      return;
    }
    carregant.value = true;
    error.value = "";
    try {
      avisos.value = await api.llistar(sessio.token);
    } catch (err) {
      avisos.value = [];
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
      avisos.value = avisos.value.map((avis) => (avis.id === actualitzat.id ? actualitzat : avis));
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
      avisos.value = avisos.value.filter((avis) => avis.id !== avisId);
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
  const noLlegits = ref(0);
  let aturar: (() => void) | null = null;

  async function refrescar() {
    if (!sessio.token || !sessio.iniciada) {
      noLlegits.value = 0;
      return;
    }
    try {
      const items = await api.llistar(sessio.token);
      noLlegits.value = items.filter((avis) => avis.read_at == null).length;
    } catch {
      /* el badge no ha de trencar la navegació */
    }
  }

  onMounted(() => {
    void refrescar();
    aturar = disparador.iniciar(() => {
      void refrescar();
    });
  });

  onUnmounted(() => {
    aturar?.();
  });

  watch(
    () => [sessio.iniciada, sessio.token, route.fullPath] as const,
    () => {
      void refrescar();
    },
  );

  return { noLlegits, refrescar };
}
