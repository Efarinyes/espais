import { computed, ref, type Ref } from "vue";

import { ApiError } from "../services/http";
import { requireReservesApi, type ReservaDto } from "../services/reserves";
import { useSessioStore } from "../stores/sessio";

export type AnulacioReservaDeps = {
  reservaEnDetall: () => ReservaDto | null;
  reservaEnConfirmacio: () => ReservaDto | null;
  errorDetall: Ref<string>;
  reservesCarregades: Ref<ReservaDto[]>;
  obrirConfirmacio: (reserva: ReservaDto) => void;
  tornarAlDetall: (reserva: ReservaDto) => void;
  tancarModal: () => void;
};

export function useAnulacioReserva(deps: AnulacioReservaDeps) {
  const reservesApi = requireReservesApi();
  const sessio = useSessioStore();
  const enviantAnulacio = ref(false);

  const potAnular = computed(() => {
    const reserva = deps.reservaEnDetall();
    if (!reserva) {
      return false;
    }
    if (sessio.role === "responsible") {
      return true;
    }
    return sessio.role === "coordinator" && Boolean(reserva.mine);
  });

  function demanarAnulacio() {
    const reserva = deps.reservaEnDetall();
    if (!reserva || !potAnular.value) {
      return;
    }
    deps.errorDetall.value = "";
    deps.obrirConfirmacio(reserva);
  }

  function tornarDetall() {
    const reserva = deps.reservaEnConfirmacio();
    if (!reserva) {
      return;
    }
    deps.errorDetall.value = "";
    deps.tornarAlDetall(reserva);
  }

  async function confirmarAnulacio(): Promise<ReservaDto | null> {
    const reserva = !sessio.token ? null : deps.reservaEnConfirmacio();
    if (!reserva) {
      return null;
    }
    enviantAnulacio.value = true;
    deps.errorDetall.value = "";
    try {
      const anulada = await reservesApi.anular(sessio.token, reserva.id);
      deps.reservesCarregades.value = deps.reservesCarregades.value.filter((item) => item.id !== anulada.id);
      deps.tancarModal();
      return anulada;
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        deps.errorDetall.value = "Només el responsable pot anul·lar una reserva amb avís al coordinador.";
      } else if (err instanceof ApiError) {
        deps.errorDetall.value = err.message;
      } else {
        deps.errorDetall.value = "No s’ha pogut anul·lar la reserva.";
      }
      return null;
    } finally {
      enviantAnulacio.value = false;
    }
  }

  return { enviantAnulacio, potAnular, demanarAnulacio, tornarDetall, confirmarAnulacio };
}
