import type { Ref } from "vue";
import "temporal-polyfill/global";

import { arrodoneixInici, franjaDesDeInici, type FranjaReserva } from "../calendari";
import {
  clicDinsFinestra,
  diaObert,
  encaixaClicAFinestra,
  weekdayDelModel,
  type FinestraDto,
} from "../disponibilitat";
import { ApiError } from "../services/http";
import { requireReservesApi, type ReservaDto } from "../services/reserves";
import { useSessioStore } from "../stores/sessio";

export type CreacioReservaDeps = {
  espaiId: Ref<string>;
  franjaOberta: () => FranjaReserva | null;
  enviant: Ref<boolean>;
  error: Ref<string>;
  reservesCarregades: Ref<ReservaDto[]>;
  mostrarError: (text: string) => void;
  tancarModal: () => void;
};

export function useCreacioReserva(deps: CreacioReservaDeps) {
  const reservesApi = requireReservesApi();
  const sessio = useSessioStore();

  function franjaDesDeClic(
    dateTime: Temporal.ZonedDateTime,
    windows: FinestraDto[] | undefined,
    durada: number,
  ): FranjaReserva | null {
    if (!diaObert(windows, weekdayDelModel(dateTime))) {
      deps.mostrarError("Aquest dia no és accessible.");
      return null;
    }
    const iniciArrodonit = arrodoneixInici(dateTime);
    let inici = iniciArrodonit;
    if (!clicDinsFinestra(windows, inici, durada)) {
      const encaixat = encaixaClicAFinestra(windows, inici, durada);
      if (!encaixat) {
        deps.mostrarError("Aquesta hora queda fora de l’horari de l’espai.");
        return null;
      }
      inici = encaixat;
    }
    return franjaDesDeInici(inici, durada);
  }

  async function confirmarPendent(): Promise<ReservaDto | null> {
    const franja = !sessio.token || !deps.espaiId.value ? null : deps.franjaOberta();
    if (!franja) {
      return null;
    }
    deps.enviant.value = true;
    deps.error.value = "";
    try {
      const creada = await reservesApi.crear(sessio.token, {
        space_id: deps.espaiId.value,
        starts_at: franja.starts_at,
        ends_at: franja.ends_at,
      });
      deps.tancarModal();
      deps.reservesCarregades.value = [...deps.reservesCarregades.value, creada];
      return creada;
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        deps.error.value = "Aquest interval ja està ocupat.";
      } else if (err instanceof ApiError) {
        deps.error.value = err.message;
      } else {
        deps.error.value = "No s’ha pogut crear la reserva.";
      }
      return null;
    } finally {
      deps.enviant.value = false;
    }
  }

  return { franjaDesDeClic, confirmarPendent };
}
