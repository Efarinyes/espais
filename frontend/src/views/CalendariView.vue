<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from "vue";
import { RouterLink } from "vue-router";
import { ScheduleXCalendar } from "@schedule-x/vue";
import { createCalendar, createViewDay, createViewWeek } from "@schedule-x/calendar";
import { createEventsServicePlugin } from "@schedule-x/events-service";
import "@schedule-x/theme-default/dist/index.css";
import "temporal-polyfill/global";

import CalendariModal from "../components/CalendariModal.vue";
import { useCalendariReserves } from "../composables/useCalendariReserves";
import { useRefrescCalendari } from "../composables/useRefrescCalendari";
import {
  diaIsoDeElement,
  reservaIdDeElement,
  zonedDesDePuntGraella,
} from "../arrossegarReserva";
import { configGraella, finestresDelsEspais } from "../disponibilitat";

type CalendariIntern = {
  destroy: () => void;
  $app?: {
    calendarState: {
      setRange: (date: Temporal.PlainDate) => void;
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
  espaiSeleccionat,
  calendaris,
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
  darrerRang,
  okReprogramacio,
} = useCalendariReserves();

const eventsServiceHolder = { current: createEventsServicePlugin() };
const calendarApp = shallowRef<ReturnType<typeof createCalendar> | null>(null);
const diaActiu = ref(Temporal.Now.zonedDateTimeISO("Europe/Madrid").toPlainDate());
const arrossegant = ref(false);
const acabaDArrossegar = ref(false);
const fantasma = ref<{ x: number; y: number } | null>(null);
const reservaArrossegadaId = ref("");
let origenArrossegament: { x: number; y: number } | null = null;
let netejaArrossegament: (() => void) | null = null;
const graella = computed(() => configGraella(finestresDelsEspais(espaisActius.value)));
const reservaArrossegada = computed(() => reservaCarregada(reservaArrossegadaId.value));
const clauCalendari = computed(
  () =>
    `tots-${graella.value.start}-${graella.value.end}-${espaisActius.value.map((e) => e.id).join(",")}`,
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
      isDark: false,
      views: [vistaSetmana, vistaDia],
      defaultView: vistaSetmana.name,
      selectedDate: diaActiu.value,
      dayBoundaries: { start, end },
      weekOptions: { gridStep: 30, gridHeight, nDays: 7 },
      isCalendarSmall: () => false,
      calendars: calendaris.value,
      callbacks: {
        onBeforeEventUpdate() {
          return false;
        },
        onSelectedDateUpdate(date) {
          diaActiu.value = date;
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
  if (creada) {
    const [event] = eventsDeReserves([creada]);
    eventsServiceHolder.current.add(event);
  }
}

async function anular() {
  const anulada = await confirmarAnulacio();
  if (anulada) {
    await aplicarAvisCalendari();
  }
}

onMounted(() => {
  void carregarEspais();
});

onUnmounted(() => {
  netejaArrossegament?.();
  calendarApp.value?.destroy();
});

watch([carregant, clauCalendari], () => {
  if (!carregant.value) {
    muntarCalendari();
  }
});

watch(calendarApp, (app) => {
  if (app) {
    engegar();
  } else {
    aturarRefresc();
  }
});
</script>

<template>
  <main class="mx-auto w-full max-w-6xl px-4 py-6">
    <h1 class="text-3xl font-semibold">
      {{ esResponsable ? "Totes les reserves" : "Les meves reserves" }}
    </h1>
    <p v-if="esResponsable" class="mt-2 text-base-content/80">
      Tots els espais i coordinadors. Arrossega una reserva per canviar l’horari, o obre-la per anul·lar.
    </p>
    <p v-else-if="potReservar && espaiSeleccionat" class="mt-2 text-base-content/80">
      Clica l’hora d’inici per reservar {{ espaiSeleccionat.name }}.
    </p>
    <p v-else-if="espaisActius.length > 0" class="mt-2 text-base-content/80">
      Les teves reserves de tots els espais. Arrossega-ne una per canviar l’horari.
    </p>

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
      <div
        v-if="calendarApp"
        :key="clauCalendari"
        class="calendari-espais mt-4"
        :class="{ 'calendari-espais--arrossegant': arrossegant }"
        :style="{ '--cal-alcada': `${graella.gridHeight + 120}px` }"
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
      :resum-pendent="resumPendent"
      :resum-detall="resumDetall"
      :durada-minuts="duradaMinuts"
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
      @confirmar="confirmar"
      @desar="desarAssistencia"
      @update:camp-assistencia="actualitzarCampAssistencia"
      @demanar-anulacio="demanarAnulacio"
      @tornar-detall="tornarDetall"
      @confirmar-anulacio="anular"
    />
  </main>
</template>
