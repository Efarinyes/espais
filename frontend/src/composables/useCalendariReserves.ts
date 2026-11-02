import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import "temporal-polyfill/global";

import { calendarisPerEspais } from "../aparenca/colorsCalendari";
import {
  DURADA_PER_DEFECTE_MINUTS,
  DURADES_RESERVA_MINUTS,
  franjaDesDeInici,
  llegendaTramats,
  titolReserva,
  valorRangAIso,
  type FranjaReserva,
} from "../calendari";
import { intervalMadrid } from "../utils/formatData";
import { type FinestraDto } from "../disponibilitat";
import { useAnulacioReserva } from "./useAnulacioReserva";
import { useAssistenciaReserva } from "./useAssistenciaReserva";
import { useCreacioReserva } from "./useCreacioReserva";
import { useReprogramacioReserva } from "./useReprogramacioReserva";
import { ApiError } from "../services/http";
import { requireEspaisApi, type EspaiDto } from "../services/espais";
import { requireReservesApi, type ReservaDto } from "../services/reserves";
import { useSessioStore } from "../stores/sessio";

export type EstatLecturaCalendari = "inicial" | "carregant" | "actual" | "antic" | "error";

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
  const llegendaCoordinadors = computed(() =>
    esResponsable.value ? llegendaTramats(reservesCarregades.value.map((reserva) => reserva.coordinator_name)) : [],
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
    if (esResponsable.value || espais.value.length === 0) {
      return false;
    }
    const demanat = String(route.query.espai ?? "");
    if (!demanat) {
      return false;
    }
    return !espaisActius.value.some((espai) => espai.id === demanat);
  });

  const espaisDeLlegenda = computed(() => {
    if (esResponsable.value || !espaiSeleccionat.value) {
      return espaisActius.value;
    }
    const ids = new Set<string>([espaiSeleccionat.value.id]);
    for (const reserva of reservesCarregades.value) {
      if (reserva.mine || reserva.space_id === espaiSeleccionat.value.id) {
        ids.add(reserva.space_id);
      }
    }
    return espaisActius.value.filter((espai) => ids.has(espai.id));
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
    const visibles = esResponsable.value
      ? llista
      : llista.filter((item) => item.mine || (espaiId.value !== "" && item.space_id === espaiId.value));
    const tramats = new Map(
      llegendaTramats([
        ...reservesCarregades.value.map((reserva) => reserva.coordinator_name),
        ...visibles.map((reserva) => reserva.coordinator_name),
      ]).map((entrada) => [entrada.nom, entrada.classe]),
    );
    return visibles.map((item) => {
      const nom = item.coordinator_name?.trim() ?? "";
      const classe = esResponsable.value && nom ? tramats.get(nom) : undefined;
      return {
        id: item.id,
        title: titolReserva(item, rol),
        calendarId: item.space_id,
        people: esResponsable.value && item.coordinator_name ? [item.coordinator_name] : undefined,
        _options: classe ? { additionalClasses: [classe] } : undefined,
        start: Temporal.Instant.from(item.starts_at).toZonedDateTimeISO("Europe/Madrid"),
        end: Temporal.Instant.from(item.ends_at).toZonedDateTimeISO("Europe/Madrid"),
      };
    });
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

  const { franjaDesDeClic, confirmarPendent } = useCreacioReserva({
    espaiId,
    franjaOberta: () => (modal.value?.tipus === "crear" ? modal.value.franja : null),
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
    if (!item || !potVeureDetall(item)) {
      return;
    }
    clicSobreReserva = true;
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

  return {
    esResponsable,
    potReservar,
    espaisActius,
    espaiId,
    espaiSeleccionat,
    calendaris,
    llegendaCoordinadors,
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
