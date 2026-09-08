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
  titolReserva,
  valorRangAIso,
  type FranjaReserva,
} from "../calendari";
import { ApiError } from "../services/identitat";
import { requireEspaisApi, type EspaiDto } from "../services/espais";
import { requireReservesApi, type ReservaDto } from "../services/reserves";
import { useSessioStore } from "../stores/sessio";

export function useCalendariReserves() {
  const espaisApi = requireEspaisApi();
  const reservesApi = requireReservesApi();
  const sessio = useSessioStore();
  const route = useRoute();

  const espais = ref<EspaiDto[]>([]);
  const espaiId = ref("");
  const carregant = ref(false);
  const error = ref("");
  const pendent = ref<FranjaReserva | null>(null);
  const duradaMinuts = ref(DURADA_PER_DEFECTE_MINUTS);
  const enviant = ref(false);
  const darrerRang = ref<{ des: unknown; fins: unknown } | null>(null);

  const esResponsable = computed(() => sessio.role === "responsible");
  const espaisActius = computed(() => espais.value.filter((espai) => espai.active));
  const vistaGlobal = computed(() => esResponsable.value && !espaiId.value);
  const potReservar = computed(() => Boolean(espaiId.value) && !vistaGlobal.value);
  const espaiSeleccionat = computed(
    () => espaisActius.value.find((espai) => espai.id === espaiId.value) ?? null,
  );
  const calendaris = computed(() => calendarisPerEspais(espaisActius.value));

  const resumPendent = computed(() => {
    if (!pendent.value || !espaiSeleccionat.value) {
      return "";
    }
    return `Reservar ${espaiSeleccionat.value.name} de ${horaMadrid(pendent.value.starts_at)} a ${horaMadrid(pendent.value.ends_at)}?`;
  });

  function aplicarEspaiDeRuta() {
    const demanat = String(route.query.espai ?? "");
    if (demanat && espaisActius.value.some((espai) => espai.id === demanat)) {
      espaiId.value = demanat;
      return;
    }
    if (esResponsable.value) {
      espaiId.value = "";
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
      return await reservesApi.llistar(
        sessio.token,
        valorRangAIso(des),
        valorRangAIso(fins),
        vistaGlobal.value ? undefined : espaiId.value,
      );
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

  function clicarFranja(dateTime: Temporal.ZonedDateTime) {
    if (!potReservar.value) {
      return;
    }
    error.value = "";
    duradaMinuts.value = DURADA_PER_DEFECTE_MINUTS;
    pendent.value = arrodoneixClicAFranja(dateTime, duradaMinuts.value);
  }

  function triarDurada(minuts: number) {
    if (!pendent.value) {
      return;
    }
    duradaMinuts.value = minuts;
    pendent.value = franjaDesDeInici(
      Temporal.Instant.from(pendent.value.starts_at).toZonedDateTimeISO("Europe/Madrid"),
      minuts,
    );
  }

  function cancelarPendent() {
    pendent.value = null;
    duradaMinuts.value = DURADA_PER_DEFECTE_MINUTS;
  }

  async function confirmarPendent(): Promise<ReservaDto | null> {
    if (!sessio.token || !espaiId.value || !pendent.value) {
      return null;
    }
    enviant.value = true;
    error.value = "";
    try {
      const creada = await reservesApi.crear(sessio.token, {
        space_id: espaiId.value,
        starts_at: pendent.value.starts_at,
        ends_at: pendent.value.ends_at,
      });
      pendent.value = null;
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
    darrerRang,
    aplicarEspaiDeRuta,
  };
}
