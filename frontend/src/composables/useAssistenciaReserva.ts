import { computed, ref, type Ref } from "vue";

import { parseCompteAssistencia } from "../calendari";
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
    const count = parseCompteAssistencia(campAssistencia.value) ?? reserva.attendance_count;
    if (count == null) {
      return "";
    }
    if (count > reserva.capacity) {
      return "El nombre supera l’aforament de l’espai. Es desarà igualment.";
    }
    if (reserva.min_attendance != null && count < reserva.min_attendance) {
      return "El nombre no assoleix l’aforament mínim. Es desarà igualment.";
    }
    return "";
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
      deps.errorDetall.value = "L’assistència ha de ser un enter ≥ 0.";
      deps.okDetall.value = "";
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
        deps.errorDetall.value = "Només qui ha fet la reserva pot registrar-ne l’assistència.";
      } else if (err instanceof ApiError) {
        deps.errorDetall.value = err.message;
      } else {
        deps.errorDetall.value = "No s’ha pogut desar l’assistència.";
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
