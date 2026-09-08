import { onMounted, ref } from "vue";

import { requireEspaisApi } from "../services/espais";
import type { EspaiDto } from "../services/espais";
import { useSessioStore } from "../stores/sessio";

export function useLlistaEspais() {
  const api = requireEspaisApi();
  const sessio = useSessioStore();
  const espais = ref<EspaiDto[]>([]);
  const carregant = ref(false);
  const error = ref("");

  async function carregar() {
    if (!sessio.token) {
      espais.value = [];
      return;
    }
    carregant.value = true;
    error.value = "";
    try {
      espais.value = await api.llistar(sessio.token);
    } catch {
      error.value = "No s’han pogut carregar els espais.";
    } finally {
      carregant.value = false;
    }
  }

  onMounted(() => {
    void carregar();
  });

  return { espais, carregant, error, carregar };
}
