import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import "temporal-polyfill/global";

import { calendarisPerEspais } from "../aparenca/colorsCalendari";
import {
  DURADA_PER_DEFECTE_MINUTS,
  DURADES_RESERVA_MINUTS,
  classesReserva,
  cobreixInstant,
  filaReserva,
  franjaDesDeInici,
  reservaVisible,
  titolReserva,
  valorRangAIso,
  type AmbitVista,
  type FranjaReserva,
} from "../calendari";
import { intervalMadrid } from "../utils/formatData";
import { type FinestraDto } from "../disponibilitat";
import { useAnulacioReserva } from "./useAnulacioReserva";
import { useAssistenciaReserva } from "./useAssistenciaReserva";
import { avaluarFranja, useCreacioReserva } from "./useCreacioReserva";
import { useReprogramacioReserva } from "./useReprogramacioReserva";
import { ApiError } from "../services/http";
import { requireEspaisApi, type EspaiDto } from "../services/espais";
import { requireReservesApi, type ReservaDto } from "../services/reserves";
import { useSessioStore } from "../stores/sessio";

export type EstatLecturaCalendari = "inicial" | "carregant" | "actual" | "antic" | "error";

export type ModalCalendari =
  | { tipus: "crear"; franja: FranjaReserva }
  | { tipus: "nova" }
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
  const espaiPerCrear = ref("");
  const diaNova = ref("");
  const horaNova = ref("");
  const franjaNova = ref<FranjaReserva | null>(null);
  const enviant = ref(false);
  const darrerRang = ref<{ des: unknown; fins: unknown } | null>(null);
  const reservesCarregades = ref<ReservaDto[]>([]);
  const estatLectura = ref<EstatLecturaCalendari>("inicial");
  const avisRefresc = ref("");
  const contextVigent = ref("");
  let seqLectura = 0;
  const errorDetall = ref("");
  const okDetall = ref("");
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
    errorDetall.value = text;
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
  const coordinadorId = computed(() =>
    esResponsable.value ? String(route.query.coordinador ?? "") : "",
  );

  function ambitActual(): AmbitVista {
    const rol = sessio.role === "responsible" ? "responsible" : "coordinator";
    return { rol, espaiId: espaiId.value, coordinadorId: coordinadorId.value };
  }

  const reservesVisibles = computed(() => reservesCarregades.value.filter((item) => reservaVisible(item, ambitActual())));
  const filesLlista = computed(() =>
    [...reservesVisibles.value]
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at) || a.id.localeCompare(b.id))
      .map((item) => filaReserva(item, ambitActual().rol)),
  );
  const pendent = computed(() => (modal.value?.tipus === "crear" ? modal.value.franja : null));
  const detall = computed(() =>
    modal.value?.tipus === "detall" || modal.value?.tipus === "confirmar-anulacio"
      ? modal.value.reserva
      : null,
  );
  const modalObert = computed(() => modal.value !== null);

  const resumPendent = computed(() => {
    if (!pendent.value || !espaiSeleccionat.value) {
      return "";
    }
    return `Reservar ${espaiSeleccionat.value.name}, ${intervalMadrid(pendent.value.starts_at, pendent.value.ends_at)}?`;
  });

  const resumDetall = computed(() => {
    if (!detall.value) {
      return "";
    }
    return `${detall.value.space_name}: ${intervalMadrid(detall.value.starts_at, detall.value.ends_at)}`;
  });

  const espaiDeRutaInvalid = computed(() => {
    if (espais.value.length === 0) {
      return false;
    }
    const demanat = String(route.query.espai ?? "");
    if (!demanat) {
      return false;
    }
    return !espaisActius.value.some((espai) => espai.id === demanat);
  });

  const espaisDeLlegenda = computed(() => {
    if (esResponsable.value) {
      return espaiSeleccionat.value ? [espaiSeleccionat.value] : espaisActius.value;
    }
    if (!espaiSeleccionat.value) {
      return espaisActius.value;
    }
    const ids = new Set<string>([espaiSeleccionat.value.id]);
    for (const reserva of reservesVisibles.value) {
      ids.add(reserva.space_id);
    }
    return espaisActius.value.filter((espai) => ids.has(espai.id));
  });

  function aplicarEspaiDeRuta() {
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

  function clauLectura(des: unknown, fins: unknown): string {
    return `${sessio.entityId}|${sessio.token}|${valorRangAIso(des)}|${valorRangAIso(fins)}`;
  }

  function invalidarLectura() {
    seqLectura += 1;
    reservesCarregades.value = [];
    contextVigent.value = "";
    estatLectura.value = "inicial";
    avisRefresc.value = "";
  }

  async function carregarReserves(des: unknown, fins: unknown): Promise<ReservaDto[] | null> {
    if (!sessio.token) {
      invalidarLectura();
      return [];
    }
    const meva = ++seqLectura;
    const clau = clauLectura(des, fins);
    const confirmat =
      clau === contextVigent.value &&
      (estatLectura.value === "actual" || estatLectura.value === "antic");
    darrerRang.value = { des, fins };
    if (!confirmat) {
      reservesCarregades.value = [];
      estatLectura.value = "carregant";
      avisRefresc.value = "";
      contextVigent.value = clau;
    }
    try {
      const items = await reservesApi.llistar(
        sessio.token,
        valorRangAIso(des),
        valorRangAIso(fins),
      );
      if (meva !== seqLectura || clau !== clauLectura(des, fins)) {
        return null;
      }
      reservesCarregades.value = items;
      contextVigent.value = clau;
      estatLectura.value = "actual";
      avisRefresc.value = "";
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
    } catch {
      if (meva !== seqLectura) {
        return null;
      }
      avisRefresc.value = "No s’ha pogut actualitzar el calendari";
      if (confirmat) {
        estatLectura.value = "antic";
        return null;
      }
      reservesCarregades.value = [];
      estatLectura.value = "error";
      return null;
    }
  }

  function eventsDeReserves(items: ReservaDto[] | null) {
    const llista = items ?? reservesCarregades.value;
    const rol = sessio.role === "coordinator" ? "coordinator" : "responsible";
    const ambit = ambitActual();
    const visibles = llista.filter((item) => reservaVisible(item, ambit));
    const salaSeleccionada = rol === "coordinator" && ambit.espaiId !== "";
    return visibles.map((item) => {
      const classes = classesReserva(item, rol);
      return {
        id: item.id,
        title: titolReserva(item, rol, salaSeleccionada),
        calendarId: item.space_id,
        people: esResponsable.value && item.coordinator_name ? [item.coordinator_name] : undefined,
        _options: classes.length > 0 ? { additionalClasses: classes } : undefined,
        start: Temporal.Instant.from(item.starts_at).toZonedDateTimeISO("Europe/Madrid"),
        end: Temporal.Instant.from(item.ends_at).toZonedDateTimeISO("Europe/Madrid"),
      };
    });
  }

  function tancarModal() {
    modal.value = null;
    franjaNova.value = null;
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

  const { franjaDesDeClic, confirmarPendent } = useCreacioReserva({
    espaiDeCreacio: () => espaiPerCrear.value,
    franjaOberta: () => {
      if (modal.value?.tipus === "crear") {
        return modal.value.franja;
      }
      if (modal.value?.tipus === "nova") {
        return franjaNova.value;
      }
      return null;
    },
    enviant,
    error,
    reservesCarregades,
    mostrarError,
    tancarModal,
  });

  const {
    campAssistencia,
    enviantAssistencia,
    potRegistrarAssistencia,
    avisAforament,
    actualitzarCampAssistencia,
    desarAssistencia,
  } = useAssistenciaReserva({
    reservaDetall: () => detall.value,
    esDetall: () => modal.value?.tipus === "detall",
    errorDetall,
    okDetall,
    reservesCarregades,
    tancarModal,
  });

  const { enviantAnulacio, potAnular, demanarAnulacio, tornarDetall, confirmarAnulacio } = useAnulacioReserva({
    reservaEnDetall: () => (modal.value?.tipus === "detall" ? modal.value.reserva : null),
    reservaEnConfirmacio: () => (modal.value?.tipus === "confirmar-anulacio" ? modal.value.reserva : null),
    errorDetall,
    reservesCarregades,
    obrirConfirmacio: (reserva) => {
      modal.value = { tipus: "confirmar-anulacio", reserva };
    },
    tornarAlDetall: (reserva) => {
      modal.value = { tipus: "detall", reserva };
    },
    tancarModal,
  });

  const {
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
  } = useReprogramacioReserva({
    reservaEnDetall: () => (modal.value?.tipus === "detall" ? modal.value.reserva : null),
    reservesCarregades,
    error,
    errorDetall,
    okReprogramacio,
    mostrarError,
    mostrarOkReprogramacio,
    tancarModal,
    finestresDe: (spaceId) => finestresPerClic(spaceId),
  });

  function clicarFranja(dateTime: Temporal.ZonedDateTime) {
    if (clicSobreReserva) {
      clicSobreReserva = false;
      return;
    }
    if (!potReservar.value || estatLectura.value === "error") {
      return;
    }
    const instant = dateTime.toInstant();
    const ocupada = reservesVisibles.value.some(
      (reserva) => !reserva.mine && cobreixInstant(reserva, instant),
    );
    if (ocupada) {
      return;
    }
    error.value = "";
    duradaMinuts.value = DURADA_PER_DEFECTE_MINUTS;
    espaiPerCrear.value = espaiId.value;
    const franja = franjaDesDeClic(dateTime, finestresPerClic(), duradaMinuts.value);
    if (!franja) {
      return;
    }
    modal.value = { tipus: "crear", franja };
  }

  function triarDurada(minuts: number) {
    if (modal.value?.tipus !== "crear" && modal.value?.tipus !== "nova") {
      return;
    }
    duradaMinuts.value = minuts;
    if (modal.value.tipus !== "crear") {
      errorDetall.value = "";
      return;
    }
    modal.value = {
      tipus: "crear",
      franja: franjaDesDeInici(
        Temporal.Instant.from(modal.value.franja.starts_at).toZonedDateTimeISO("Europe/Madrid"),
        minuts,
      ),
    };
  }

  const propostaNova = computed(() => {
    if (modal.value?.tipus !== "nova") {
      return null;
    }
    const espai = espaisActius.value.find((item) => item.id === espaiPerCrear.value);
    if (!espai || !diaNova.value || !horaNova.value) {
      return { ok: false as const, error: "Cal espai, dia i hora." };
    }
    const [hour, minute] = horaNova.value.split(":").map((part) => Number(part));
    if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
      return { ok: false as const, error: "L’hora no és vàlida." };
    }
    let inici: Temporal.ZonedDateTime;
    try {
      inici = Temporal.PlainDate.from(diaNova.value).toZonedDateTime({
        timeZone: "Europe/Madrid",
        plainTime: Temporal.PlainTime.from({ hour, minute }),
      });
    } catch {
      return { ok: false as const, error: "El dia o l’hora no són vàlids." };
    }
    return avaluarFranja(inici, espai.windows, duradaMinuts.value);
  });

  const resumNova = computed(() => {
    const proposta = propostaNova.value;
    if (!proposta?.ok) {
      return "";
    }
    const nom = espaisActius.value.find((espai) => espai.id === espaiPerCrear.value)?.name ?? "Espai";
    return `Reservar ${nom}, ${intervalMadrid(proposta.franja.starts_at, proposta.franja.ends_at)}?`;
  });

  function obrirNovaReserva() {
    if (esResponsable.value || espaisActius.value.length === 0) {
      return;
    }
    error.value = "";
    errorDetall.value = "";
    okDetall.value = "";
    espaiPerCrear.value = espaiId.value || espaisActius.value[0]?.id || "";
    diaNova.value = Temporal.Now.zonedDateTimeISO("Europe/Madrid").toPlainDate().toString();
    horaNova.value = "08:00";
    duradaMinuts.value = DURADA_PER_DEFECTE_MINUTS;
    franjaNova.value = null;
    modal.value = { tipus: "nova" };
  }

  async function confirmarNova() {
    if (modal.value?.tipus !== "nova" || esResponsable.value) {
      return;
    }
    const proposta = propostaNova.value;
    if (!proposta?.ok) {
      errorDetall.value = proposta?.error ?? "Revisa la reserva.";
      return;
    }
    franjaNova.value = proposta.franja;
    error.value = "";
    errorDetall.value = "";
    return confirmarPendent();
  }

  function cancelarPendent() {
    tancarModal();
  }

  async function refrescarReserves(): Promise<ReservaDto[] | null> {
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
    if (!item) {
      return;
    }
    clicSobreReserva = true;
    if (!potVeureDetall(item)) {
      return;
    }
    errorDetall.value = "";
    okDetall.value = "";
    campAssistencia.value = item.attendance_count == null ? "" : String(item.attendance_count);
    prepararHorari(item);
    modal.value = { tipus: "detall", reserva: item };
  }

  function tancarDetall() {
    tancarModal();
  }

  function reservaCarregada(reservaId: string) {
    return reservesCarregades.value.find((item) => item.id === reservaId) ?? null;
  }

  watch(
    () => `${sessio.entityId}\0${sessio.token}`,
    (nou, vell) => {
      if (vell && nou !== vell) {
        invalidarLectura();
      }
    },
  );

  watch(
    () => route.query.espai,
    () => {
      if (espais.value.length > 0) {
        aplicarEspaiDeRuta();
      }
    },
  );

  watch([espaiPerCrear, diaNova, horaNova, duradaMinuts], () => {
    if (modal.value?.tipus === "nova") {
      errorDetall.value = "";
    }
  });

  return {
    esResponsable,
    potReservar,
    espaisActius,
    espaiId,
    espaiPerCrear,
    diaNova,
    horaNova,
    propostaNova,
    resumNova,
    coordinadorId,
    filesLlista,
    espaiSeleccionat,
    calendaris,
    espaisDeLlegenda,
    espaiDeRutaInvalid,
    carregant,
    error,
    estatLectura,
    avisRefresc,
    reservesCarregades,
    modal,
    modalObert,
    pendent,
    duradaMinuts,
    durades: DURADES_RESERVA_MINUTS,
    enviant,
    resumPendent,
    triarDurada,
    obrirNovaReserva,
    confirmarNova,
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
    diaHorari,
    horaHorari,
    diesReservables,
    canviarHorariFitxa,
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
