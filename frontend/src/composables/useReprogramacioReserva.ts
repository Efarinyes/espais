import { computed, ref, type Ref } from "vue";
import "temporal-polyfill/global";

import { DURADA_PER_DEFECTE_MINUTS, valorRangAIso } from "../calendari";
import { clicDinsFinestra, diaObert, diesOberts, weekdayDelModel, type FinestraDto } from "../disponibilitat";
import { ApiError } from "../services/http";
import { requireReservesApi, type ReservaDto } from "../services/reserves";
import { useSessioStore } from "../stores/sessio";

export type ReprogramacioReservaDeps = {
  reservaEnDetall: () => ReservaDto | null;
  reservesCarregades: Ref<ReservaDto[]>;
  error: Ref<string>;
  errorDetall: Ref<string>;
  okReprogramacio: Ref<string>;
  mostrarError: (text: string) => void;
  mostrarOkReprogramacio: (text: string) => void;
  tancarModal: () => void;
  finestresDe: (spaceId: string) => FinestraDto[] | undefined;
};

export function useReprogramacioReserva(deps: ReprogramacioReservaDeps) {
  const reservesApi = requireReservesApi();
  const sessio = useSessioStore();
  const enviantReprogramacio = ref(false);
  const diaHorari = ref("");
  const horaHorari = ref("");
  const esResponsable = computed(() => sessio.role === "responsible");

  const potReprogramar = computed(() => {
    const reserva = deps.reservaEnDetall();
    if (!reserva) {
      return false;
    }
    return esResponsable.value || Boolean(reserva.mine);
  });

  const reprogramacioAmbAvis = computed(() => esResponsable.value);

  const diesReservables = computed(() => {
    const reserva = deps.reservaEnDetall();
    if (!reserva) {
      return "";
    }
    return diesOberts(deps.finestresDe(reserva.space_id))
      .map((dia) => dia.etiqueta)
      .join(", ");
  });

  function prepararHorari(reserva: ReservaDto) {
    const inici = Temporal.Instant.from(reserva.starts_at).toZonedDateTimeISO("Europe/Madrid");
    diaHorari.value = inici.toPlainDate().toString();
    horaHorari.value = `${String(inici.hour).padStart(2, "0")}:${String(inici.minute).padStart(2, "0")}`;
  }

  function duradaDeReserva(reserva: ReservaDto): number {
    const minuts = Math.round((Date.parse(reserva.ends_at) - Date.parse(reserva.starts_at)) / 60_000);
    return minuts > 0 ? minuts : DURADA_PER_DEFECTE_MINUTS;
  }

  function potMoureReserva(reserva: ReservaDto): boolean {
    return esResponsable.value || reserva.mine;
  }

  function esReservaMovible(reservaId: string): boolean {
    const reserva = deps.reservesCarregades.value.find((item) => item.id === reservaId);
    return reserva != null && potMoureReserva(reserva);
  }

  async function moureReserva(reservaId: string, inici: unknown, fi: unknown): Promise<ReservaDto | null> {
    if (!sessio.token) {
      return null;
    }
    const reserva = deps.reservesCarregades.value.find((item) => item.id === reservaId);
    if (!reserva || !potMoureReserva(reserva)) {
      deps.mostrarError("No pots reprogramar aquesta reserva.");
      return null;
    }
    const start = Temporal.Instant.from(valorRangAIso(inici)).toZonedDateTimeISO("Europe/Madrid");
    const end = Temporal.Instant.from(valorRangAIso(fi)).toZonedDateTimeISO("Europe/Madrid");
    const durada = Math.round(Number(end.epochMilliseconds - start.epochMilliseconds) / 60_000);
    const windows = deps.finestresDe(reserva.space_id);
    if (!diaObert(windows, weekdayDelModel(start))) {
      deps.mostrarError("Aquest dia no és accessible.");
      return null;
    }
    if (!clicDinsFinestra(windows, start, durada)) {
      deps.mostrarError("Aquesta hora queda fora de l’horari de l’espai.");
      return null;
    }
    const startsAt = start.toInstant().toString();
    const endsAt = end.toInstant().toString();
    if (startsAt === reserva.starts_at && endsAt === reserva.ends_at) {
      return reserva;
    }
    enviantReprogramacio.value = true;
    deps.error.value = "";
    deps.errorDetall.value = "";
    deps.okReprogramacio.value = "";
    try {
      const moguda = await reservesApi.reprogramar(sessio.token, reserva.id, {
        starts_at: startsAt,
        ends_at: endsAt,
      });
      deps.reservesCarregades.value = deps.reservesCarregades.value.map((item) =>
        item.id === moguda.id ? moguda : item,
      );
      deps.tancarModal();
      if (esResponsable.value) {
        deps.mostrarOkReprogramacio("S’ha canviat l’horari. S’ha avisat el coordinador.");
      }
      return moguda;
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        deps.mostrarError("Aquest interval ja està ocupat.");
      } else if (err instanceof ApiError) {
        deps.mostrarError(err.message || "No pots reprogramar aquesta reserva.");
      } else {
        deps.mostrarError("No s’ha pogut reprogramar la reserva.");
      }
      return null;
    } finally {
      enviantReprogramacio.value = false;
    }
  }

  async function canviarHorariFitxa(): Promise<ReservaDto | null> {
    const reserva = deps.reservaEnDetall();
    if (!reserva || !diaHorari.value || !horaHorari.value) {
      return null;
    }
    const [hour, minute] = horaHorari.value.split(":").map(Number);
    if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
      deps.mostrarError("L’hora no és vàlida.");
      return null;
    }
    const inici = Temporal.PlainDate.from(diaHorari.value).toZonedDateTime({
      timeZone: "Europe/Madrid",
      plainTime: new Temporal.PlainTime(hour, minute),
    });
    const fi = inici.add({ minutes: duradaDeReserva(reserva) });
    return moureReserva(reserva.id, inici, fi);
  }

  return {
    enviantReprogramacio,
    potReprogramar,
    reprogramacioAmbAvis,
    esReservaMovible,
    duradaDeReserva,
    moureReserva,
    diaHorari,
    horaHorari,
    diesReservables,
    prepararHorari,
    canviarHorariFitxa,
  };
}
