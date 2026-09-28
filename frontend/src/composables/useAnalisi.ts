import { onMounted, ref, watch } from "vue";

import { FUS_HORARI_PER_DEFECTE, periodeDelMes, mesEnCursTimeZone } from "../analisi";
import { ApiError } from "../services/http";
import { requireAnalisiApi, type ResumUsDto } from "../services/analisi";
import { requireReservesApi, type ReservaDto } from "../services/reserves";
import { useSessioStore } from "../stores/sessio";

export function useAnalisi() {
  const analisiApi = requireAnalisiApi();
  const reservesApi = requireReservesApi();
  const sessio = useSessioStore();
  const fusHorari = FUS_HORARI_PER_DEFECTE;
  const mes = ref(mesEnCursTimeZone(fusHorari));
  const resum = ref<ResumUsDto | null>(null);
  const reserves = ref<ReservaDto[]>([]);
  const carregant = ref(false);
  const error = ref("");

  async function carregar() {
    if (!sessio.token) {
      resum.value = null;
      reserves.value = [];
      return;
    }
    carregant.value = true;
    error.value = "";
    const { des, fins } = periodeDelMes(mes.value, fusHorari);
    try {
      const [usage, llista] = await Promise.all([
        analisiApi.resum(sessio.token, des, fins),
        reservesApi.llistar(sessio.token, des, fins, undefined, true),
      ]);
      resum.value = usage;
      reserves.value = llista;
    } catch (err) {
      resum.value = null;
      reserves.value = [];
      error.value = err instanceof ApiError ? err.message : "No s’han pogut carregar les estadístiques.";
    } finally {
      carregant.value = false;
    }
  }

  onMounted(() => {
    void carregar();
  });

  watch(mes, () => {
    void carregar();
  });

  return {
    mes,
    resum,
    reserves,
    carregant,
    error,
    carregar,
  };
}
