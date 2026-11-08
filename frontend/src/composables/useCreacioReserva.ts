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
  espaiDeCreacio: () => string;
  franjaOberta: () => FranjaReserva | null;
  enviant: Ref<boolean>;
  error: Ref<string>;
  reservesCarregades: Ref<ReservaDto[]>;
  mostrarError: (text: string) => void;
  tancarModal: () => void;
};

export function avaluarFranja(
  dateTime: Temporal.ZonedDateTime,
  windows: FinestraDto[] | undefined,
  durada: number,
): { ok: true; franja: FranjaReserva } | { ok: false; error: string } {
  if (!diaObert(windows, weekdayDelModel(dateTime))) {
    return { ok: false, error: "Aquest dia no és accessible." };
  }
  let inici = arrodoneixInici(dateTime);
  if (!clicDinsFinestra(windows, inici, durada)) {
    const encaixat = encaixaClicAFinestra(windows, inici, durada);
    if (!encaixat) {
      return { ok: false, error: "Aquesta hora queda fora de l’horari de l’espai." };
    }
    inici = encaixat;
  }
  return { ok: true, franja: franjaDesDeInici(inici, durada) };
}

export function useCreacioReserva(deps: CreacioReservaDeps) {
  const reservesApi = requireReservesApi();
  const sessio = useSessioStore();

  function franjaDesDeClic(
    dateTime: Temporal.ZonedDateTime,
    windows: FinestraDto[] | undefined,
    durada: number,
  ): FranjaReserva | null {
    const avaluacio = avaluarFranja(dateTime, windows, durada);
    if (!avaluacio.ok) {
      deps.mostrarError(avaluacio.error);
      return null;
    }
    return avaluacio.franja;
  }

  async function confirmarPendent(): Promise<ReservaDto | null> {
    const espaiId = deps.espaiDeCreacio();
    const franja = !sessio.token || !espaiId ? null : deps.franjaOberta();
    if (!franja || deps.enviant.value) {
      return null;
    }
    deps.enviant.value = true;
    deps.error.value = "";
    try {
      const creada = await reservesApi.crear(sessio.token, {
        space_id: espaiId,
        starts_at: franja.starts_at,
        ends_at: franja.ends_at,
      });
      deps.tancarModal();
      deps.reservesCarregades.value = [...deps.reservesCarregades.value, creada];
      return creada;
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        deps.mostrarError("Aquest interval ja està ocupat.");
      } else if (err instanceof ApiError) {
        deps.mostrarError(err.message);
      } else {
        deps.mostrarError("No s’ha pogut crear la reserva.");
      }
      return null;
    } finally {
      deps.enviant.value = false;
    }
  }

  return { franjaDesDeClic, confirmarPendent };
}
