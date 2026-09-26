import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import "temporal-polyfill/global";

import { calendarisPerEspais } from "../aparenca/colorsCalendari";
import {
  DURADA_PER_DEFECTE_MINUTS,
  DURADES_RESERVA_MINUTS,
  arrodoneixInici,
  franjaDesDeInici,
  parseCompteAssistencia,
  titolReserva,
  valorRangAIso,
  type FranjaReserva,
} from "../calendari";
import { horaMadrid } from "../utils/formatData";
import {
  clicDinsFinestra,
  diaObert,
  encaixaClicAFinestra,
  weekdayDelModel,
  type FinestraDto,
} from "../disponibilitat";
import { ApiError } from "../services/http";
import { requireEspaisApi, type EspaiDto } from "../services/espais";
import { requireReservesApi, type ReservaDto } from "../services/reserves";
import { useSessioStore } from "../stores/sessio";

export type ModalCalendari =
  | { tipus: "crear"; franja: FranjaReserva }
  | { tipus: "detall"; reserva: ReservaDto }
  | { tipus: "confirmar-anulacio"; reserva: ReservaDto };

export function useCalendariReserves() {
  const espaisApi = requireEspaisApi();
  const reservesApi = requireReservesApi();
  const sessio = useSessioStore();
  const route = useRoute();

  const espais = ref<EspaiDto[]>([]);
  const espaiId = ref("");
  const carregant = ref(false);
  const error = ref("");
  const modal = ref<ModalCalendari | null>(null);
  const duradaMinuts = ref(DURADA_PER_DEFECTE_MINUTS);
  const enviant = ref(false);
  const darrerRang = ref<{ des: unknown; fins: unknown } | null>(null);
  const reservesCarregades = ref<ReservaDto[]>([]);
  const campAssistencia = ref("");
  const errorDetall = ref("");
  const okDetall = ref("");
  const enviantAssistencia = ref(false);
  const enviantAnulacio = ref(false);
  const enviantReprogramacio = ref(false);
  const okReprogramacio = ref("");
  let clicSobreReserva = false;
  let temporitzadorAvis: ReturnType<typeof setTimeout> | null = null;

  function tancarAvisTemporitzat() {
    if (temporitzadorAvis != null) {
      clearTimeout(temporitzadorAvis);
      temporitzadorAvis = null;
    }
  }

  function mostrarError(text: string) {
    okReprogramacio.value = "";
    error.value = text;
    tancarAvisTemporitzat();
    temporitzadorAvis = setTimeout(() => {
      error.value = "";
      temporitzadorAvis = null;
    }, 6000);
  }

  function mostrarOkReprogramacio(text: string) {
    error.value = "";
    okReprogramacio.value = text;
    tancarAvisTemporitzat();
    temporitzadorAvis = setTimeout(() => {
      okReprogramacio.value = "";
      temporitzadorAvis = null;
    }, 6000);
  }

  const esResponsable = computed(() => sessio.role === "responsible");
  const espaisActius = computed(() => espais.value.filter((espai) => espai.active));
  const potReservar = computed(() => !esResponsable.value && Boolean(espaiId.value));
  const espaiSeleccionat = computed(
    () => espaisActius.value.find((espai) => espai.id === espaiId.value) ?? null,
  );
  const calendaris = computed(() => calendarisPerEspais(espaisActius.value));
  const pendent = computed(() => (modal.value?.tipus === "crear" ? modal.value.franja : null));
  const detall = computed(() =>
    modal.value?.tipus === "detall" || modal.value?.tipus === "confirmar-anulacio"
      ? modal.value.reserva
      : null,
  );
  const potRegistrarAssistencia = computed(() => modal.value?.tipus === "detall" && Boolean(detall.value?.mine));
  const potAnular = computed(
    () => esResponsable.value && modal.value?.tipus === "detall" && detall.value != null && !detall.value.mine,
  );
  const potReprogramar = computed(() => {
    if (modal.value?.tipus !== "detall" || detall.value == null) {
      return false;
    }
    return esResponsable.value || Boolean(detall.value.mine);
  });
  const reprogramacioAmbAvis = computed(() => esResponsable.value);
  const modalObert = computed(() => modal.value !== null);

  const resumPendent = computed(() => {
    if (!pendent.value || !espaiSeleccionat.value) {
      return "";
    }
    return `Reservar ${espaiSeleccionat.value.name} de ${horaMadrid(pendent.value.starts_at)} a ${horaMadrid(pendent.value.ends_at)}?`;
  });

  const resumDetall = computed(() => {
    if (!detall.value) {
      return "";
    }
    return `${detall.value.space_name}: ${horaMadrid(detall.value.starts_at)}–${horaMadrid(detall.value.ends_at)}`;
  });

  const avisAforament = computed(() => {
    if (!detall.value) {
      return "";
    }
    const count = parseCompteAssistencia(campAssistencia.value) ?? detall.value.attendance_count;
    if (count == null) {
      return "";
    }
    if (count > detall.value.capacity) {
      return "El nombre supera l’aforament de l’espai. Es desarà igualment.";
    }
    if (detall.value.min_attendance != null && count < detall.value.min_attendance) {
      return "El nombre no assoleix l’aforament mínim. Es desarà igualment.";
    }
    return "";
  });

  function aplicarEspaiDeRuta() {
    if (esResponsable.value) {
      espaiId.value = "";
      return;
    }
    const demanat = String(route.query.espai ?? "");
    if (demanat && espaisActius.value.some((espai) => espai.id === demanat)) {
      espaiId.value = demanat;
      return;
    }
    espaiId.value = "";
  }

  async function carregarEspais() {
    if (!sessio.token) {
      return;
    }
    carregant.value = true;
    error.value = "";
    try {
      espais.value = await espaisApi.llistar(sessio.token);
      aplicarEspaiDeRuta();
    } catch (err) {
      error.value = err instanceof ApiError ? err.message : "No s’han pogut carregar els espais.";
    } finally {
      carregant.value = false;
    }
  }

  async function carregarReserves(des: unknown, fins: unknown): Promise<ReservaDto[]> {
    if (!sessio.token) {
      return [];
    }
    darrerRang.value = { des, fins };
    error.value = "";
    try {
      const items = await reservesApi.llistar(
        sessio.token,
        valorRangAIso(des),
        valorRangAIso(fins),
      );
      reservesCarregades.value = items;
      const obert = modal.value;
      if (obert?.tipus === "detall") {
        const actual = items.find((reserva) => reserva.id === obert.reserva.id);
        if (actual) {
          modal.value = { tipus: "detall", reserva: actual };
          if (!okDetall.value) {
            campAssistencia.value = actual.attendance_count == null ? "" : String(actual.attendance_count);
          }
        }
      }
      return items;
    } catch (err) {
      error.value = err instanceof ApiError ? err.message : "No s’han pogut carregar les reserves.";
      return [];
    }
  }

  function eventsDeReserves(items: ReservaDto[]) {
    const rol = sessio.role === "coordinator" ? "coordinator" : "responsible";
    const visibles = esResponsable.value
      ? items
      : items.filter((item) => item.mine || (espaiId.value !== "" && item.space_id === espaiId.value));
    return visibles.map((item) => ({
      id: item.id,
      title: titolReserva(item, rol),
      calendarId: item.space_id,
      people: item.coordinator_name ? [item.coordinator_name] : undefined,
      start: Temporal.Instant.from(item.starts_at).toZonedDateTimeISO("Europe/Madrid"),
      end: Temporal.Instant.from(item.ends_at).toZonedDateTimeISO("Europe/Madrid"),
    }));
  }

  function tancarModal() {
    modal.value = null;
    duradaMinuts.value = DURADA_PER_DEFECTE_MINUTS;
    campAssistencia.value = "";
    errorDetall.value = "";
    okDetall.value = "";
    enviantAnulacio.value = false;
    enviantReprogramacio.value = false;
  }

  function finestresPerClic(spaceId?: string): FinestraDto[] | undefined {
    const id = spaceId ?? espaiSeleccionat.value?.id;
    return espaisActius.value.find((espai) => espai.id === id)?.windows;
  }

  function franjaDesDeClic(
    dateTime: Temporal.ZonedDateTime,
    windows: FinestraDto[] | undefined,
    durada: number,
  ): FranjaReserva | null {
    if (!diaObert(windows, weekdayDelModel(dateTime))) {
      mostrarError("Aquest dia no és accessible.");
      return null;
    }
    const iniciArrodonit = arrodoneixInici(dateTime);
    let inici = iniciArrodonit;
    if (!clicDinsFinestra(windows, inici, durada)) {
      const encaixat = encaixaClicAFinestra(windows, inici, durada);
      if (!encaixat) {
        mostrarError("Aquesta hora queda fora de l’horari de l’espai.");
        return null;
      }
      inici = encaixat;
    }
    return franjaDesDeInici(inici, durada);
  }

  function clicarFranja(dateTime: Temporal.ZonedDateTime) {
    if (clicSobreReserva) {
      clicSobreReserva = false;
      return;
    }
    if (!potReservar.value) {
      return;
    }
    error.value = "";
    duradaMinuts.value = DURADA_PER_DEFECTE_MINUTS;
    const franja = franjaDesDeClic(dateTime, finestresPerClic(), duradaMinuts.value);
    if (!franja) {
      return;
    }
    modal.value = { tipus: "crear", franja };
  }

  function triarDurada(minuts: number) {
    if (modal.value?.tipus !== "crear") {
      return;
    }
    duradaMinuts.value = minuts;
    modal.value = {
      tipus: "crear",
      franja: franjaDesDeInici(
        Temporal.Instant.from(modal.value.franja.starts_at).toZonedDateTimeISO("Europe/Madrid"),
        minuts,
      ),
    };
  }

  function cancelarPendent() {
    tancarModal();
  }

  async function confirmarPendent(): Promise<ReservaDto | null> {
    if (!sessio.token || !espaiId.value || modal.value?.tipus !== "crear") {
      return null;
    }
    enviant.value = true;
    error.value = "";
    try {
      const creada = await reservesApi.crear(sessio.token, {
        space_id: espaiId.value,
        starts_at: modal.value.franja.starts_at,
        ends_at: modal.value.franja.ends_at,
      });
      tancarModal();
      reservesCarregades.value = [...reservesCarregades.value, creada];
      return creada;
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        error.value = "Aquest interval ja està ocupat.";
      } else if (err instanceof ApiError) {
        error.value = err.message;
      } else {
        error.value = "No s’ha pogut crear la reserva.";
      }
      return null;
    } finally {
      enviant.value = false;
    }
  }

  async function refrescarReserves(): Promise<ReservaDto[]> {
    if (!darrerRang.value) {
      return [];
    }
    return carregarReserves(darrerRang.value.des, darrerRang.value.fins);
  }

  function potVeureDetall(reserva: ReservaDto): boolean {
    return reserva.mine || sessio.role === "responsible";
  }

  function obrirDetall(reservaId: string) {
    const item = reservesCarregades.value.find((reserva) => reserva.id === reservaId);
    if (!item || !potVeureDetall(item)) {
      return;
    }
    clicSobreReserva = true;
    errorDetall.value = "";
    okDetall.value = "";
    campAssistencia.value = item.attendance_count == null ? "" : String(item.attendance_count);
    modal.value = { tipus: "detall", reserva: item };
  }

  function tancarDetall() {
    tancarModal();
  }

  function actualitzarCampAssistencia(valor: string) {
    campAssistencia.value = String(valor ?? "");
    okDetall.value = "";
  }

  async function desarAssistencia(): Promise<ReservaDto | null> {
    if (!sessio.token || !detall.value?.mine) {
      return null;
    }
    const n = parseCompteAssistencia(campAssistencia.value);
    if (n == null) {
      errorDetall.value = "L’assistència ha de ser un enter ≥ 0.";
      okDetall.value = "";
      return null;
    }
    enviantAssistencia.value = true;
    errorDetall.value = "";
    okDetall.value = "";
    try {
      const actualitzada = await reservesApi.registrarAssistencia(sessio.token, detall.value.id, n);
      reservesCarregades.value = reservesCarregades.value.map((reserva) =>
        reserva.id === actualitzada.id ? actualitzada : reserva,
      );
      tancarModal();
      return actualitzada;
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        errorDetall.value = "Només qui ha fet la reserva pot registrar-ne l’assistència.";
      } else if (err instanceof ApiError) {
        errorDetall.value = err.message;
      } else {
        errorDetall.value = "No s’ha pogut desar l’assistència.";
      }
      return null;
    } finally {
      enviantAssistencia.value = false;
    }
  }

  function demanarAnulacio() {
    if (modal.value?.tipus !== "detall" || !potAnular.value) {
      return;
    }
    errorDetall.value = "";
    modal.value = { tipus: "confirmar-anulacio", reserva: modal.value.reserva };
  }

  function tornarDetall() {
    if (modal.value?.tipus !== "confirmar-anulacio") {
      return;
    }
    errorDetall.value = "";
    modal.value = { tipus: "detall", reserva: modal.value.reserva };
  }

  function duradaDeReserva(reserva: ReservaDto): number {
    const minuts = Math.round(
      (Date.parse(reserva.ends_at) - Date.parse(reserva.starts_at)) / 60_000,
    );
    return minuts > 0 ? minuts : DURADA_PER_DEFECTE_MINUTS;
  }

  function potMoureReserva(reserva: ReservaDto): boolean {
    return esResponsable.value || reserva.mine;
  }

  function esReservaMovible(reservaId: string): boolean {
    const reserva = reservesCarregades.value.find((item) => item.id === reservaId);
    return reserva != null && potMoureReserva(reserva);
  }

  function reservaCarregada(reservaId: string) {
    return reservesCarregades.value.find((item) => item.id === reservaId) ?? null;
  }

  async function moureReserva(reservaId: string, inici: unknown, fi: unknown): Promise<ReservaDto | null> {
    if (!sessio.token) {
      return null;
    }
    const reserva = reservesCarregades.value.find((item) => item.id === reservaId);
    if (!reserva || !potMoureReserva(reserva)) {
      mostrarError("No pots reprogramar aquesta reserva.");
      return null;
    }
    const start = Temporal.Instant.from(valorRangAIso(inici)).toZonedDateTimeISO("Europe/Madrid");
    const end = Temporal.Instant.from(valorRangAIso(fi)).toZonedDateTimeISO("Europe/Madrid");
    const durada = Math.round(Number(end.epochMilliseconds - start.epochMilliseconds) / 60_000);
    const windows = finestresPerClic(reserva.space_id);
    if (!diaObert(windows, weekdayDelModel(start))) {
      mostrarError("Aquest dia no és accessible.");
      return null;
    }
    if (!clicDinsFinestra(windows, start, durada)) {
      mostrarError("Aquesta hora queda fora de l’horari de l’espai.");
      return null;
    }
    const startsAt = start.toInstant().toString();
    const endsAt = end.toInstant().toString();
    if (startsAt === reserva.starts_at && endsAt === reserva.ends_at) {
      return reserva;
    }
    enviantReprogramacio.value = true;
    error.value = "";
    errorDetall.value = "";
    okReprogramacio.value = "";
    try {
      const moguda = await reservesApi.reprogramar(sessio.token, reserva.id, {
        starts_at: startsAt,
        ends_at: endsAt,
      });
      reservesCarregades.value = reservesCarregades.value.map((item) =>
        item.id === moguda.id ? moguda : item,
      );
      tancarModal();
      if (esResponsable.value) {
        mostrarOkReprogramacio("S’ha canviat l’horari. S’ha avisat el coordinador.");
      }
      return moguda;
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        mostrarError("Aquest interval ja està ocupat.");
      } else if (err instanceof ApiError) {
        mostrarError(err.message || "No pots reprogramar aquesta reserva.");
      } else {
        mostrarError("No s’ha pogut reprogramar la reserva.");
      }
      return null;
    } finally {
      enviantReprogramacio.value = false;
    }
  }

  async function confirmarAnulacio(): Promise<ReservaDto | null> {
    if (!sessio.token || modal.value?.tipus !== "confirmar-anulacio") {
      return null;
    }
    enviantAnulacio.value = true;
    errorDetall.value = "";
    try {
      const anulada = await reservesApi.anular(sessio.token, modal.value.reserva.id);
      reservesCarregades.value = reservesCarregades.value.filter((reserva) => reserva.id !== anulada.id);
      tancarModal();
      return anulada;
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        errorDetall.value = "Només el responsable pot anul·lar una reserva amb avís al coordinador.";
      } else if (err instanceof ApiError) {
        errorDetall.value = err.message;
      } else {
        errorDetall.value = "No s’ha pogut anul·lar la reserva.";
      }
      return null;
    } finally {
      enviantAnulacio.value = false;
    }
  }

  watch(
    () => route.query.espai,
    () => {
      if (espais.value.length > 0) {
        aplicarEspaiDeRuta();
      }
    },
  );

  return {
    esResponsable,
    potReservar,
    espaisActius,
    espaiId,
    espaiSeleccionat,
    calendaris,
    carregant,
    error,
    modal,
    modalObert,
    pendent,
    duradaMinuts,
    durades: DURADES_RESERVA_MINUTS,
    enviant,
    resumPendent,
    triarDurada,
    carregarEspais,
    carregarReserves,
    refrescarReserves,
    eventsDeReserves,
    clicarFranja,
    cancelarPendent,
    confirmarPendent,
    tancarModal,
    detall,
    campAssistencia,
    errorDetall,
    okDetall,
    enviantAssistencia,
    potRegistrarAssistencia,
    potAnular,
    enviantAnulacio,
    demanarAnulacio,
    tornarDetall,
    confirmarAnulacio,
    potReprogramar,
    reprogramacioAmbAvis,
    enviantReprogramacio,
    okReprogramacio,
    esReservaMovible,
    duradaDeReserva,
    reservaCarregada,
    moureReserva,
    resumDetall,
    avisAforament,
    obrirDetall,
    tancarDetall,
    desarAssistencia,
    actualitzarCampAssistencia,
    darrerRang,
    aplicarEspaiDeRuta,
  };
}
