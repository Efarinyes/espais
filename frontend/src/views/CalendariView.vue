<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { ScheduleXCalendar } from "@schedule-x/vue";
import { createCalendar, createViewDay, createViewWeek } from "@schedule-x/calendar";
import { createEventsServicePlugin } from "@schedule-x/events-service";
import "@schedule-x/theme-default/dist/index.css";
import "temporal-polyfill/global";

import CalendariModal from "../components/CalendariModal.vue";
import LlistaReserves from "../components/LlistaReserves.vue";
import { etiquetaPeriode, nomAccessibleReserva, rangVisible } from "../calendari";
import { queryCalendari, type VistaCalendari } from "../consultaCalendari";
import { useAparencaStore } from "../stores/aparenca";
import { useSessioStore } from "../stores/sessio";
import { requireIdentityApi, type CoordinadorDto } from "../services/identitat";
import { useCalendariReserves } from "../composables/useCalendariReserves";
import { useRefrescCalendari } from "../composables/useRefrescCalendari";
import {
  diaIsoDeElement,
  reservaIdDeElement,
  zonedDesDePuntGraella,
} from "../arrossegarReserva";
import {
  diaEnDireccio,
  diaObertAnterior,
  diesOberts,
  properDiaObert,
  finestresPerRol,
  graellaDeLaVista,
  minutsDeHora,
  weekdayDelModel,
} from "../disponibilitat";

type CalendariIntern = {
  destroy: () => void;
  $app?: {
    calendarState: {
      setRange: (date: Temporal.PlainDate) => void;
      view: { value: string };
    };
    datePickerState: {
      selectedDate: { value: Temporal.PlainDate };
    };
  };
};

const {
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
  espaisDeLlegenda,
  espaiDeRutaInvalid,
  calendaris,
  llegendaCoordinadors,
  estatLectura,
  avisRefresc,
  carregant,
  error,
  modal,
  modalObert,
  duradaMinuts,
  durades,
  enviant,
  resumPendent,
  carregarEspais,
  carregarReserves,
  refrescarReserves,
  eventsDeReserves,
  clicarFranja,
  triarDurada,
  obrirNovaReserva,
  confirmarNova,
  tancarModal,
  confirmarPendent,
  campAssistencia,
  errorDetall,
  okDetall,
  enviantAssistencia,
  resumDetall,
  avisAforament,
  obrirDetall,
  desarAssistencia,
  actualitzarCampAssistencia,
  potAnular,
  enviantAnulacio,
  demanarAnulacio,
  tornarDetall,
  confirmarAnulacio,
  potReprogramar,
  reprogramacioAmbAvis,
  esReservaMovible,
  duradaDeReserva,
  reservaCarregada,
  moureReserva,
  diaHorari,
  horaHorari,
  diesReservables,
  canviarHorariFitxa,
  enviantReprogramacio,
  potRegistrarAssistencia,
  darrerRang,
  okReprogramacio,
} = useCalendariReserves();

const aparenca = useAparencaStore();
const sessio = useSessioStore();
const identity = requireIdentityApi();
const coordinadors = ref<CoordinadorDto[]>([]);
const errorCoordinadors = ref("");
const router = useRouter();
const route = useRoute();
const vista = computed<VistaCalendari>(() => (route.query.vista === "llista" ? "llista" : "graella"));

function escriureQuery(canvi: Partial<{ espai: string; coordinador: string; vista: VistaCalendari }>) {
  const net = esResponsable.value ? canvi : { ...canvi, coordinador: "" };
  void router.replace({ name: "calendari", query: queryCalendari(route.query, net) });
}
const caixaCalendari = ref<HTMLElement | null>(null);
let observadorEvents: MutationObserver | null = null;

function etiquetarEvents() {
  const arrel = caixaCalendari.value;
  if (!arrel) {
    return;
  }
  const rol = esResponsable.value ? "responsible" : "coordinator";
  for (const el of arrel.querySelectorAll<HTMLElement>("[data-event-id]")) {
    const id = el.dataset.eventId;
    if (!id) {
      continue;
    }
    const item = reservaCarregada(id);
    if (!item) {
      continue;
    }
    const sala = rol === "coordinator" && Boolean(espaiId.value);
    el.setAttribute("aria-label", nomAccessibleReserva(item, rol, sala));
    if (rol === "coordinator" && !item.mine) {
      el.setAttribute("aria-disabled", "true");
    } else {
      el.removeAttribute("aria-disabled");
    }
  }
}

function observarEvents() {
  observadorEvents?.disconnect();
  const arrel = caixaCalendari.value;
  if (!arrel) {
    observadorEvents = null;
    return;
  }
  etiquetarEvents();
  observadorEvents = new MutationObserver(() => etiquetarEvents());
  observadorEvents.observe(arrel, { childList: true, subtree: true });
}

function canviarEspai(event: Event) {
  escriureQuery({ espai: (event.target as HTMLSelectElement).value });
}

function canviarCoordinador(event: Event) {
  escriureQuery({ coordinador: (event.target as HTMLSelectElement).value });
}

function canviarVista(seguent: VistaCalendari) {
  escriureQuery({ vista: seguent });
}

function mourePeriode(endavant: boolean) {
  const pas = vistaUnDia.value ? 1 : 7;
  const salt = diaActiu.value.add({ days: endavant ? pas : -pas });
  if (!vistaUnDia.value) {
    diaActiu.value = salt;
    return;
  }
  diaActiu.value = endavant
    ? properDiaObert(finestresVisibles.value, salt)
    : diaObertAnterior(finestresVisibles.value, salt);
}

const periodeLlista = computed(() => etiquetaPeriode(diaActiu.value, vistaUnDia.value));
const titolPagina = computed(() => {
  if (esResponsable.value) {
    return espaiSeleccionat.value ? `Reserves de ${espaiSeleccionat.value.name}` : "Totes les reserves";
  }
  return espaiSeleccionat.value ? `Disponibilitat — ${espaiSeleccionat.value.name}` : "Les meves reserves";
});
const campsNova = computed(() => ({
  espais: espaisActius.value.map((espai) => ({ id: espai.id, name: espai.name })),
  espaiId: espaiPerCrear.value,
  dia: diaNova.value,
  hora: horaNova.value,
  resum: resumNova.value,
  valida: propostaNova.value?.ok === true,
  error: propostaNova.value && !propostaNova.value.ok ? propostaNova.value.error : "",
}));

const eventsServiceHolder = { current: createEventsServicePlugin() };
const calendarApp = shallowRef<ReturnType<typeof createCalendar> | null>(null);
const diaActiu = ref(Temporal.Now.zonedDateTimeISO("Europe/Madrid").toPlainDate());
const vistaUnDia = ref(typeof window.matchMedia === "function" && window.matchMedia("(max-width: 1023px)").matches);
const arrossegant = ref(false);
const acabaDArrossegar = ref(false);
const fantasma = ref<{ x: number; y: number } | null>(null);
const reservaArrossegadaId = ref("");
let origenArrossegament: { x: number; y: number } | null = null;
let netejaArrossegament: (() => void) | null = null;
const finestresVisibles = computed(() =>
  finestresPerRol(esResponsable.value, espaiSeleccionat.value, espaisActius.value),
);
const graella = computed(() =>
  graellaDeLaVista(finestresVisibles.value, vistaUnDia.value, weekdayDelModel(diaActiu.value)),
);
const diesObertsAttr = computed(() => diesOberts(finestresVisibles.value).map((dia) => String(dia.weekday)).join(" "));

function colorSala(id: string): string {
  const colors = calendaris.value[id];
  if (!colors) {
    return "transparent";
  }
  return aparenca.mode === "fosc" ? colors.darkColors.main : colors.lightColors.main;
}

function encaixarDiaObert() {
  if (!vistaUnDia.value) {
    return;
  }
  const desti = diaEnDireccio(finestresVisibles.value, diaActiu.value, true);
  if (Temporal.PlainDate.compare(desti, diaActiu.value) !== 0) {
    diaActiu.value = desti;
  }
}

function aplicarDia(data: Temporal.PlainDate) {
  if (!vistaUnDia.value) {
    diaActiu.value = data;
    return;
  }
  const desti = diaEnDireccio(
    finestresVisibles.value,
    data,
    Temporal.PlainDate.compare(data, diaActiu.value) >= 0,
  );
  if (Temporal.PlainDate.compare(desti, data) !== 0) {
    activarDia(desti);
    return;
  }
  diaActiu.value = desti;
}

function percentMarge(minuts: number): string {
  const total = minutsDeHora(graella.value.end) - minutsDeHora(graella.value.start);
  if (minuts <= 0 || total <= 0) {
    return "0%";
  }
  return `${(minuts / total) * 100}%`;
}

function slotsInici(minuts: number): number {
  if (minuts <= 0) {
    return 0;
  }
  return Math.ceil(minuts / 30);
}

function slotsFi(minuts: number): number {
  if (minuts <= 0) {
    return 0;
  }
  return Math.floor(minuts / 30);
}

const reservaArrossegada = computed(() => reservaCarregada(reservaArrossegadaId.value));
const clauCalendari = computed(
  () =>
    `tots-${graella.value.start}-${graella.value.end}-${espaisActius.value.map((e) => e.id).join(",")}-${aparenca.mode}-${aparenca.paleta}`,
);

function activarDia(data: Temporal.PlainDate) {
  diaActiu.value = data;
  const app = calendarApp.value as unknown as CalendariIntern | null;
  if (!app?.$app) {
    return;
  }
  app.$app.datePickerState.selectedDate.value = data;
  app.$app.calendarState.setRange(data);
}

function clicarCapcaleraDia(event: MouseEvent) {
  const desti = event.target as HTMLElement | null;
  const cel = desti?.closest("[data-date]");
  if (!cel || !cel.closest(".sx__week-grid__date-axis")) {
    return;
  }
  const valor = cel.getAttribute("data-date");
  if (!valor) {
    return;
  }
  const data = Temporal.PlainDate.from(valor);
  activarDia(data);
}

function deixarArrossegament(event: PointerEvent) {
  netejaArrossegament?.();
  netejaArrossegament = null;
  const origen = origenArrossegament;
  const reservaId = reservaArrossegadaId.value;
  origenArrossegament = null;
  arrossegant.value = false;
  fantasma.value = null;
  reservaArrossegadaId.value = "";
  const reserva = reservaCarregada(reservaId);
  if (!reserva || !origen) {
    return;
  }
  const desplaçament = Math.hypot(event.clientX - origen.x, event.clientY - origen.y);
  if (desplaçament < 10) {
    obrirDetall(reservaId);
    return;
  }
  acabaDArrossegar.value = true;
  const sota = document.elementFromPoint(event.clientX, event.clientY);
  const dia = diaIsoDeElement(sota);
  const col = sota instanceof Element ? sota.closest("[data-time-grid-date]") : null;
  if (!dia || !(col instanceof HTMLElement)) {
    return;
  }
  const rect = col.getBoundingClientRect();
  const inici = zonedDesDePuntGraella(
    dia,
    event.clientY - rect.top,
    rect.height,
    graella.value.start,
    graella.value.end,
  );
  const fi = inici.add({ minutes: duradaDeReserva(reserva) });
  void moureReserva(reserva.id, inici, fi).then((moguda) => {
    if (moguda) {
      void aplicarAvisCalendari();
    }
  });
}

function moureArrossegament(event: PointerEvent) {
  if (!arrossegant.value) {
    return;
  }
  fantasma.value = { x: event.clientX, y: event.clientY };
}

function iniciarArrossegament(event: PointerEvent) {
  const id = reservaIdDeElement(event.target);
  if (!id || !esReservaMovible(id)) {
    return;
  }
  event.preventDefault();
  tancarModal();
  arrossegant.value = true;
  reservaArrossegadaId.value = id;
  origenArrossegament = { x: event.clientX, y: event.clientY };
  fantasma.value = { x: event.clientX, y: event.clientY };
  window.addEventListener("pointermove", moureArrossegament);
  window.addEventListener("pointerup", deixarArrossegament);
  netejaArrossegament = () => {
    window.removeEventListener("pointermove", moureArrossegament);
    window.removeEventListener("pointerup", deixarArrossegament);
  };
}

function muntarCalendari() {
  calendarApp.value?.destroy();
  if (carregant.value || espaisActius.value.length === 0) {
    calendarApp.value = null;
    return;
  }
  eventsServiceHolder.current = createEventsServicePlugin();
  const vistaSetmana = createViewWeek();
  const vistaDia = createViewDay();
  const { start, end, gridHeight } = graella.value;
  calendarApp.value = createCalendar(
    {
      locale: "ca-ES",
      timezone: "Europe/Madrid",
      firstDayOfWeek: 1,
      isDark: aparenca.mode === "fosc",
      views: [vistaSetmana, vistaDia],
      defaultView: vistaUnDia.value ? vistaDia.name : vistaSetmana.name,
      selectedDate: diaActiu.value,
      dayBoundaries: { start, end },
      weekOptions: {
        gridStep: 30,
        gridHeight,
        nDays: 7,
        timeAxisFormatOptions: { hour: "2-digit", minute: "2-digit", hourCycle: "h23" },
      },
      isCalendarSmall: () => false,
      calendars: calendaris.value,
      callbacks: {
        onBeforeEventUpdate() {
          return false;
        },
        onRangeUpdate() {
          const vista = (calendarApp.value as unknown as CalendariIntern | null)?.$app?.calendarState.view.value;
          if (vista !== "day" && vista !== "week") {
            return;
          }
          const unDia = vista === "day";
          if (unDia !== vistaUnDia.value) {
            vistaUnDia.value = unDia;
          }
        },
        onSelectedDateUpdate(date) {
          aplicarDia(date);
        },
        async fetchEvents(range) {
          const items = await carregarReserves(range.start, range.end);
          return eventsDeReserves(items);
        },
        onClickDate(date) {
          activarDia(date);
        },
        onClickDateTime(dateTime) {
          if (acabaDArrossegar.value) {
            acabaDArrossegar.value = false;
            return;
          }
          clicarFranja(dateTime);
        },
        onEventClick(calendarEvent) {
          if (acabaDArrossegar.value) {
            acabaDArrossegar.value = false;
            return;
          }
          obrirDetall(String(calendarEvent.id));
        },
      },
    } as Parameters<typeof createCalendar>[0],
    [eventsServiceHolder.current],
  ) as unknown as ReturnType<typeof createCalendar>;
}

async function canviarHorari() {
  const moguda = await canviarHorariFitxa();
  if (moguda) {
    await aplicarAvisCalendari();
  }
}

async function aplicarAvisCalendari() {
  const items = await refrescarReserves();
  if (!darrerRang.value) {
    return;
  }
  eventsServiceHolder.current.set(eventsDeReserves(items));
}

const { engegar, aturarRefresc } = useRefrescCalendari(
  () => {
    void aplicarAvisCalendari();
  },
  () => modalObert.value,
);

async function confirmar() {
  const creada = await confirmarPendent();
  if (!creada || vista.value === "llista") {
    return;
  }
  const [event] = eventsDeReserves([creada]);
  if (event) {
    eventsServiceHolder.current.add(event);
  }
}

async function confirmarFormulari() {
  const creada = await confirmarNova();
  if (!creada) {
    return;
  }
  if (vista.value === "llista") {
    const rang = rangVisible(diaActiu.value, vistaUnDia.value, graella.value.start, graella.value.end);
    await carregarReserves(rang.start, rang.end);
    return;
  }
  if (calendarApp.value) {
    await aplicarAvisCalendari();
  }
}

async function anular() {
  const anulada = await confirmarAnulacio();
  if (anulada) {
    await aplicarAvisCalendari();
  }
}

async function carregarCoordinadors() {
  if (!esResponsable.value) {
    return;
  }
  try {
    coordinadors.value = await identity.llistarCoordinadors(sessio.token);
    errorCoordinadors.value = "";
    if (
      coordinadorId.value &&
      !coordinadors.value.some((persona) => persona.id === coordinadorId.value)
    ) {
      escriureQuery({ coordinador: "" });
    }
  } catch {
    errorCoordinadors.value = "No s’han pogut carregar els coordinadors.";
  }
}

onMounted(() => {
  void carregarEspais();
  void carregarCoordinadors();
});

onUnmounted(() => {
  netejaArrossegament?.();
  observadorEvents?.disconnect();
  calendarApp.value?.destroy();
});

watch(finestresVisibles, encaixarDiaObert);
watch(vistaUnDia, encaixarDiaObert);

watch([carregant, clauCalendari], () => {
  if (!carregant.value && vista.value === "graella") {
    muntarCalendari();
  }
});

watch(vista, (nova) => {
  if (carregant.value) {
    return;
  }
  if (nova === "llista") {
    calendarApp.value?.destroy();
    calendarApp.value = null;
    return;
  }
  muntarCalendari();
});

watch([espaiId, coordinadorId], async () => {
  await nextTick();
  // Schedule-X només omple eventsFacade quan el plugin queda lligat al calendari.
  const servei = eventsServiceHolder.current as unknown as { eventsFacade?: unknown };
  if (!calendarApp.value || vista.value === "llista" || !servei.eventsFacade) {
    return;
  }
  eventsServiceHolder.current.set(eventsDeReserves(null));
});

watch(
  () =>
    [
      vista.value,
      diaActiu.value.toString(),
      vistaUnDia.value,
      graella.value.start,
      graella.value.end,
      carregant.value,
      espaisActius.value.length,
    ].join("|"),
  () => {
    if (vista.value !== "llista" || carregant.value || espaisActius.value.length === 0) {
      return;
    }
    const rang = rangVisible(diaActiu.value, vistaUnDia.value, graella.value.start, graella.value.end);
    void carregarReserves(rang.start, rang.end);
  },
);

watch(
  () => route.query.coordinador,
  (coordinador) => {
    if (!esResponsable.value && coordinador) {
      escriureQuery({ coordinador: "" });
    }
  },
  { immediate: true },
);

watch(calendarApp, (app) => {
  if (app) {
    engegar();
    void nextTick(() => observarEvents());
  } else {
    aturarRefresc();
    observadorEvents?.disconnect();
    observadorEvents = null;
  }
});

async function reintentar() {
  await aplicarAvisCalendari();
  etiquetarEvents();
}
</script>

<template>
  <main class="mx-auto w-full max-w-6xl">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <h1 class="titol-pantalla">{{ titolPagina }}</h1>
      <button
        v-if="!esResponsable && espaisActius.length > 0"
        class="btn btn-primary min-h-11"
        type="button"
        @click="obrirNovaReserva"
      >
        Nova reserva
      </button>
    </div>
    <p v-if="esResponsable && espaiSeleccionat" class="mt-2 text-base-content/80">
      Arrossega una reserva per canviar l’horari, o obre-la per anul·lar.
    </p>
    <p v-else-if="esResponsable" class="mt-2 text-base-content/80">
      Tots els espais i coordinadors. Arrossega una reserva per canviar l’horari, o obre-la per anul·lar.
    </p>
    <p v-else-if="potReservar && espaiSeleccionat" class="mt-2 text-base-content/80">
      Clica una franja lliure per reservar {{ espaiSeleccionat.name }}, o usa Nova reserva. Les ocupades no es poden triar.
    </p>
    <p v-else-if="espaisActius.length > 0" class="mt-2 text-base-content/80">
      Les teves reserves de tots els espais. Arrossega-ne una per canviar l’horari.
    </p>

    <div v-if="espaisActius.length > 0" class="mt-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
      <label class="block min-w-0 flex-1 font-medium sm:max-w-sm" for="espai-calendari">
        Espai
        <select
          id="espai-calendari"
          class="select mt-2 w-full min-h-11 border border-base-300 bg-base-100"
          :value="espaiId"
          @change="canviarEspai"
        >
          <option value="">Tots els espais</option>
          <option v-for="espai in espaisActius" :key="espai.id" :value="espai.id">{{ espai.name }}</option>
        </select>
      </label>
      <label v-if="esResponsable" class="block min-w-0 flex-1 font-medium sm:max-w-sm" for="coordinador-calendari">
        Coordinador
        <select
          id="coordinador-calendari"
          class="select mt-2 w-full min-h-11 border border-base-300 bg-base-100"
          :value="coordinadorId"
          @change="canviarCoordinador"
        >
          <option value="">Tots</option>
          <option v-for="persona in coordinadors" :key="persona.id" :value="persona.id">{{ persona.name }}</option>
        </select>
      </label>
      <p v-if="errorCoordinadors" class="text-error" role="alert">{{ errorCoordinadors }}</p>
      <div class="flex gap-2" role="group" aria-label="Vista">
        <button
          class="btn min-h-11"
          :class="vista === 'graella' ? 'btn-primary' : 'btn-outline'"
          type="button"
          :aria-pressed="vista === 'graella'"
          @click="canviarVista('graella')"
        >
          Graella
        </button>
        <button
          class="btn min-h-11"
          :class="vista === 'llista' ? 'btn-primary' : 'btn-outline'"
          type="button"
          :aria-pressed="vista === 'llista'"
          @click="canviarVista('llista')"
        >
          Llista
        </button>
      </div>
    </div>
    <p v-if="espaiDeRutaInvalid" class="mt-2 text-error" role="alert">Aquest espai no està disponible.</p>

    <div v-if="avisRefresc" class="alert alert-warning mt-6" role="alert">
      <span>
        {{ avisRefresc }}
        <template v-if="estatLectura === 'antic'"> Les dades poden estar desactualitzades.</template>
      </span>
      <button class="btn min-h-11" type="button" @click="reintentar">Reintenta</button>
    </div>

    <div v-if="error" class="alert alert-error mt-6" role="alert">
      <span>{{ error }}</span>
    </div>
    <div v-else-if="okReprogramacio" class="alert alert-success mt-6" role="status">
      <span>{{ okReprogramacio }}</span>
    </div>

    <section v-if="carregant" class="mt-6" role="status">Carregant espais…</section>

    <section
      v-else-if="espaisActius.length === 0"
      class="card bg-base-100 shadow-sm mt-6"
      aria-labelledby="buit-cal-titol"
    >
      <div class="card-body">
        <template v-if="esResponsable">
          <h2 id="buit-cal-titol" class="card-title">Encara no heu definit cap espai</h2>
          <p>El nom el trieu vosaltres (Sala 1 o Sala Pau Casals).</p>
          <RouterLink class="btn btn-primary min-h-11" to="/espais/nou">Defineix el primer espai</RouterLink>
        </template>
        <template v-else>
          <h2 id="buit-cal-titol" class="card-title">Encara no hi ha espais</h2>
          <p>Cal que el responsable n’hagi definit un abans de reservar.</p>
        </template>
      </div>
    </section>

    <template v-else>
      <ul class="llegenda-calendari mt-4" aria-label="Sales">
        <li v-for="espai in espaisDeLlegenda" :key="espai.id">
          <span class="llegenda-calendari__mostra" :style="{ backgroundColor: colorSala(espai.id) }" />
          <span>{{ espai.name }}</span>
        </li>
      </ul>
      <ul v-if="esResponsable && llegendaCoordinadors.length > 0" class="llegenda-calendari" aria-label="Coordinadors">
        <li v-for="entrada in llegendaCoordinadors" :key="entrada.nom">
          <span class="llegenda-calendari__mostra" :class="entrada.classe" />
          <span>{{ entrada.nom }}</span>
        </li>
      </ul>
      <LlistaReserves
        v-if="vista === 'llista'"
        :files="filesLlista"
        :periode="periodeLlista"
        :carregant="estatLectura === 'carregant' || estatLectura === 'inicial'"
        :fallida="estatLectura === 'error'"
        @obrir="obrirDetall"
        @anterior="mourePeriode(false)"
        @seguent="mourePeriode(true)"
      />
      <div
        v-else-if="calendarApp"
        ref="caixaCalendari"
        :key="clauCalendari"
        class="calendari-espais mt-4"
        :class="{ 'calendari-espais--arrossegant': arrossegant }"
        :data-dies-oberts="diesObertsAttr"
        :data-slots-inici="slotsInici(graella.minutsMargeInici)"
        :data-slots-fi="slotsFi(graella.minutsMargeFi)"
        :style="{
          '--marge-inici': percentMarge(graella.minutsMargeInici),
          '--marge-fi': percentMarge(graella.minutsMargeFi),
        }"
        @click="clicarCapcaleraDia"
        @pointerdown="iniciarArrossegament"
      >
        <ScheduleXCalendar :calendar-app="calendarApp" />
      </div>
      <div
        v-if="fantasma && reservaArrossegada"
        class="calendari-espais__fantasma"
        :style="{ left: `${fantasma.x}px`, top: `${fantasma.y}px` }"
      >
        {{ reservaArrossegada.space_name }}
      </div>
    </template>

    <CalendariModal
      v-if="modal"
      :modal="modal"
      :nova="modal.tipus === 'nova' ? campsNova : null"
      :resum-pendent="resumPendent"
      :resum-detall="resumDetall"
      :durada-minuts="duradaMinuts"
      :durada-detall="modal.tipus === 'detall' || modal.tipus === 'confirmar-anulacio' ? duradaDeReserva(modal.reserva) : duradaMinuts"
      :dia-horari="diaHorari"
      :hora-horari="horaHorari"
      :dies-reservables="diesReservables"
      :enviant-reprogramacio="enviantReprogramacio"
      :pot-registrar-assistencia="potRegistrarAssistencia"
      @update:dia-horari="diaHorari = $event"
      @update:hora-horari="horaHorari = $event"
      @canviar-horari="canviarHorari"
      :durades="durades"
      :enviant="enviant"
      :camp-assistencia="campAssistencia"
      :error-detall="errorDetall"
      :ok-detall="okDetall"
      :avis-aforament="avisAforament"
      :enviant-assistencia="enviantAssistencia"
      :pot-anular="potAnular"
      :enviant-anulacio="enviantAnulacio"
      :pot-reprogramar="potReprogramar"
      :reprogramacio-amb-avis="reprogramacioAmbAvis"
      @tancar="tancarModal"
      @triar-durada="triarDurada"
      @confirmar="modal.tipus === 'nova' ? confirmarFormulari() : confirmar()"
      @update:espai-nova="espaiPerCrear = $event"
      @update:dia-nova="diaNova = $event"
      @update:hora-nova="horaNova = $event"
      @desar="desarAssistencia"
      @update:camp-assistencia="actualitzarCampAssistencia"
      @demanar-anulacio="demanarAnulacio"
      @tornar-detall="tornarDetall"
      @confirmar-anulacio="anular"
    />
  </main>
</template>
