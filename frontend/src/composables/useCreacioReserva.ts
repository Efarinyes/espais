import type { Ref } from "vue";
import "temporal-polyfill/global";

import {
  arrodoneixInici,
  ERROR_PERSONES_PREVISTES,
  franjaDesDeInici,
  parseCompteAssistencia,
  type FranjaReserva,
} from "../calendari";
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
  /** Text del camp opcional «Persones previstes». Buit = sense previsió. */
  previsio: () => string;
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
    const brut = deps.previsio().trim();
    const previsio = parseCompteAssistencia(brut);
    if (brut !== "" && previsio == null) {
      deps.mostrarError(ERROR_PERSONES_PREVISTES);
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
      let resultat = creada;
      let previsioPerduda = false;
      if (previsio != null) {
        try {
          resultat = await reservesApi.registrarAssistencia(sessio.token, creada.id, previsio);
        } catch {
          previsioPerduda = true;
        }
      }
      deps.reservesCarregades.value = [...deps.reservesCarregades.value, resultat];
      if (previsioPerduda) {
        deps.mostrarError(
          "La reserva s’ha creat, però no s’han pogut desar les persones previstes. Les pots afegir des de la reserva.",
        );
      }
      return resultat;
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
