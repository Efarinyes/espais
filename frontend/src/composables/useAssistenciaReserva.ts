import { computed, ref, type Ref } from "vue";

import { avisPrevisioAforament, ERROR_PERSONES_PREVISTES, parseCompteAssistencia } from "../calendari";
import { ApiError } from "../services/http";
import { requireReservesApi, type ReservaDto } from "../services/reserves";
import { useSessioStore } from "../stores/sessio";

export type AssistenciaReservaDeps = {
  reservaDetall: () => ReservaDto | null;
  esDetall: () => boolean;
  errorDetall: Ref<string>;
  okDetall: Ref<string>;
  reservesCarregades: Ref<ReservaDto[]>;
  tancarModal: () => void;
};

/**
 * Persones previstes d'una reserva (opcional, planificació). El nom del composable és històric:
 * no registra assistència real ni cap confirmació individual.
 */
export function useAssistenciaReserva(deps: AssistenciaReservaDeps) {
  const reservesApi = requireReservesApi();
  const sessio = useSessioStore();
  const campAssistencia = ref("");
  const enviantAssistencia = ref(false);

  const potRegistrarAssistencia = computed(() => {
    const reserva = deps.reservaDetall();
    if (!deps.esDetall() || !reserva) {
      return false;
    }
    return sessio.role === "responsible" || Boolean(reserva.mine);
  });

  const avisAforament = computed(() => {
    const reserva = deps.reservaDetall();
    if (!reserva) {
      return "";
    }
    const previsio = parseCompteAssistencia(campAssistencia.value) ?? reserva.attendance_count;
    return avisPrevisioAforament(previsio, reserva.capacity, reserva.min_attendance);
  });

  function actualitzarCampAssistencia(valor: string) {
    campAssistencia.value = String(valor ?? "");
    deps.okDetall.value = "";
  }

  async function desarAssistencia(): Promise<ReservaDto | null> {
    const reserva = deps.reservaDetall();
    if (!sessio.token || reserva == null || !(sessio.role === "responsible" || reserva.mine)) {
      return null;
    }
    const n = parseCompteAssistencia(campAssistencia.value);
    if (n == null) {
      deps.errorDetall.value = ERROR_PERSONES_PREVISTES;
      deps.okDetall.value = "";
      return null;
    }
    if (enviantAssistencia.value) {
      return null;
    }
    enviantAssistencia.value = true;
    deps.errorDetall.value = "";
    deps.okDetall.value = "";
    try {
      const actualitzada = await reservesApi.registrarAssistencia(sessio.token, reserva.id, n);
      deps.reservesCarregades.value = deps.reservesCarregades.value.map((item) =>
        item.id === actualitzada.id ? actualitzada : item,
      );
      deps.tancarModal();
      return actualitzada;
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        deps.errorDetall.value = "Només qui ha fet la reserva en pot canviar les persones previstes.";
      } else if (err instanceof ApiError) {
        deps.errorDetall.value = err.message;
      } else {
        deps.errorDetall.value = "No s’han pogut desar les persones previstes.";
      }
      return null;
    } finally {
      enviantAssistencia.value = false;
    }
  }

  return {
    campAssistencia,
    enviantAssistencia,
    potRegistrarAssistencia,
    avisAforament,
    actualitzarCampAssistencia,
    desarAssistencia,
  };
}
