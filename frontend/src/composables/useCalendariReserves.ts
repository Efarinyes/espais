import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import "temporal-polyfill/global";

import {
  DURADA_PER_DEFECTE_MINUTS,
  DURADES_RESERVA_MINUTS,
  arrodoneixClicAFranja,
  calendarisPerEspais,
  franjaDesDeInici,
  horaMadrid,
  parseCompteAssistencia,
  titolReserva,
  valorRangAIso,
  type FranjaReserva,
} from "../calendari";
import { ApiError } from "../services/identitat";
import { requireEspaisApi, type EspaiDto } from "../services/espais";
import { requireReservesApi, type ReservaDto } from "../services/reserves";
import { useSessioStore } from "../stores/sessio";

export type ModalCalendari =
  | { tipus: "crear"; franja: FranjaReserva }
  | { tipus: "detall"; reserva: ReservaDto };

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
  let clicSobreReserva = false;

  const esResponsable = computed(() => sessio.role === "responsible");
  const espaisActius = computed(() => espais.value.filter((espai) => espai.active));
  const vistaGlobal = computed(() => esResponsable.value && !espaiId.value);
  const potReservar = computed(() => Boolean(espaiId.value) && !vistaGlobal.value);
  const espaiSeleccionat = computed(
    () => espaisActius.value.find((espai) => espai.id === espaiId.value) ?? null,
  );
  const calendaris = computed(() => calendarisPerEspais(espaisActius.value));
  const pendent = computed(() => (modal.value?.tipus === "crear" ? modal.value.franja : null));
  const detall = computed(() => (modal.value?.tipus === "detall" ? modal.value.reserva : null));
  const potRegistrarAssistencia = computed(() => Boolean(detall.value?.mine));
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
    if (!vistaGlobal.value && !espaiId.value) {
      return [];
    }
    darrerRang.value = { des, fins };
    error.value = "";
    try {
      const items = await reservesApi.llistar(
        sessio.token,
        valorRangAIso(des),
        valorRangAIso(fins),
        vistaGlobal.value ? undefined : espaiId.value,
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
    return items.map((item) => ({
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
    modal.value = { tipus: "crear", franja: arrodoneixClicAFranja(dateTime, duradaMinuts.value) };
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
    vistaGlobal,
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
