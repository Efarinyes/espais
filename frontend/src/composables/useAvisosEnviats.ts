import { computed, ref } from "vue";

import { requireAvisosEnviatsApi, type AvisEnviatDto } from "../services/avisosEnviats";
import { ApiError } from "../services/http";
import { useSessioStore } from "../stores/sessio";

export function useAvisosEnviats() {
  const api = requireAvisosEnviatsApi();
  const sessio = useSessioStore();
  const avisos = ref<AvisEnviatDto[]>([]);
  const carregant = ref(false);
  const error = ref("");

  const pendents = computed(() => avisos.value.filter((avis) => avis.read_at == null).length);

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
      error.value = err instanceof ApiError ? err.message : "No s’han pogut carregar els avisos enviats.";
    } finally {
      carregant.value = false;
    }
  }

  return { avisos, carregant, error, pendents, carregar };
}
