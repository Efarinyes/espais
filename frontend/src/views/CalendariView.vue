<script setup lang="ts">
import { computed, onMounted, shallowRef, watch } from "vue";
import { RouterLink } from "vue-router";
import { ScheduleXCalendar } from "@schedule-x/vue";
import { createCalendar, createViewDay, createViewWeek } from "@schedule-x/calendar";
import { createEventsServicePlugin } from "@schedule-x/events-service";
import "@schedule-x/theme-default/dist/index.css";
import "temporal-polyfill/global";

import { etiquetaDurada } from "../calendari";
import { useCalendariReserves } from "../composables/useCalendariReserves";
import { useRefrescCalendari } from "../composables/useRefrescCalendari";

const {
  vistaGlobal,
  espaisActius,
  espaiSeleccionat,
  calendaris,
  carregant,
  error,
  pendent,
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
  cancelarPendent,
  confirmarPendent,
  darrerRang,
} = useCalendariReserves();

const eventsServiceHolder = { current: createEventsServicePlugin() };
const calendarApp = shallowRef<ReturnType<typeof createCalendar> | null>(null);
const clauCalendari = computed(
  () => `${vistaGlobal.value ? "tots" : espaiSeleccionat.value?.id ?? "cap"}-${espaisActius.value.map((e) => e.id).join(",")}`,
);

function muntarCalendari() {
  if (carregant.value || espaisActius.value.length === 0) {
    calendarApp.value = null;
    return;
  }
  if (!vistaGlobal.value && !espaiSeleccionat.value) {
    calendarApp.value = null;
    return;
  }
  eventsServiceHolder.current = createEventsServicePlugin();
  const vistaSetmana = createViewWeek();
  const vistaDia = createViewDay();
  calendarApp.value = createCalendar(
    {
      locale: "ca-ES",
      timezone: "Europe/Madrid",
      firstDayOfWeek: 1,
      isDark: false,
      views: [vistaSetmana, vistaDia],
      defaultView: vistaSetmana.name,
      dayBoundaries: { start: "08:00", end: "22:00" },
      weekOptions: { gridStep: 30, gridHeight: 1960 },
      calendars: calendaris.value,
      callbacks: {
        onBeforeEventUpdate() {
          return false;
        },
        async fetchEvents(range) {
          const items = await carregarReserves(range.start, range.end);
          return eventsDeReserves(items);
        },
        onClickDateTime(dateTime) {
          clicarFranja(dateTime);
        },
      },
    },
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
  () => Boolean(pendent.value),
);

async function confirmar() {
  const creada = await confirmarPendent();
  if (creada) {
    const [event] = eventsDeReserves([creada]);
    eventsServiceHolder.current.add(event);
  }
}

onMounted(() => {
  void carregarEspais();
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
    <h1 class="text-3xl font-semibold">Calendari</h1>
    <p v-if="vistaGlobal" class="mt-2 text-base-content/80">
      Reserves de tots els espais. Cada color és un espai; el títol indica qui ha reservat.
    </p>
    <p v-else-if="espaiSeleccionat" class="mt-2 text-base-content/80">
      {{ espaiSeleccionat.name }}: clica l’hora d’inici i tria la durada (1 hora per defecte).
    </p>
    <p v-else class="mt-2 text-base-content/80">Tria un espai a la llista per veure’n la disponibilitat i reservar.</p>

    <div v-if="error" class="alert alert-error mt-6" role="alert">
      <span>{{ error }}</span>
    </div>

    <section v-if="carregant" class="mt-6" role="status">Carregant espais…</section>

    <section
      v-else-if="espaisActius.length === 0"
      class="card bg-base-100 shadow-sm mt-6"
      aria-labelledby="buit-cal-titol"
    >
      <div class="card-body">
        <h2 id="buit-cal-titol" class="card-title">Encara no hi ha espais</h2>
        <p>Cal que el responsable n’hagi definit un abans de reservar.</p>
      </div>
    </section>

    <section
      v-else-if="!vistaGlobal && !espaiSeleccionat"
      class="card bg-base-100 shadow-sm mt-6"
      aria-labelledby="tria-espai-titol"
    >
      <div class="card-body">
        <h2 id="tria-espai-titol" class="card-title">Tria un espai</h2>
        <p>Obre el calendari des de la targeta de l’espai per veure franges lliures i reservar.</p>
        <RouterLink class="btn btn-primary min-h-11" to="/espais">Veure els espais</RouterLink>
      </div>
    </section>

    <template v-else>
      <ul v-if="vistaGlobal" class="mt-4 flex flex-wrap gap-3" aria-label="Llegenda d’espais">
        <li v-for="espai in espaisActius" :key="espai.id" class="flex items-center gap-2 text-sm">
          <span
            class="inline-block h-4 w-4 rounded-full"
            :style="{ backgroundColor: calendaris[espai.id]?.lightColors.main }"
            aria-hidden="true"
          />
          {{ espai.name }}
        </li>
      </ul>

      <div v-if="calendarApp" class="calendari-espais mt-4">
        <ScheduleXCalendar :calendar-app="calendarApp" />
      </div>
    </template>

    <div class="modal" :class="{ 'modal-open': pendent }" role="dialog" aria-modal="true" aria-labelledby="confirma-titol">
      <div class="modal-box">
        <h2 id="confirma-titol" class="font-semibold text-lg">Confirmar reserva</h2>
        <p class="py-4">{{ resumPendent }}</p>
        <p class="font-medium">Durada</p>
        <div class="mt-2 flex flex-wrap gap-2">
          <button
            v-for="minuts in durades"
            :key="minuts"
            class="btn min-h-11"
            :class="duradaMinuts === minuts ? 'btn-primary' : 'btn-outline'"
            type="button"
            :disabled="enviant"
            @click="triarDurada(minuts)"
          >
            {{ etiquetaDurada(minuts) }}
          </button>
        </div>
        <div class="modal-action">
          <button class="btn btn-ghost min-h-11" type="button" :disabled="enviant" @click="cancelarPendent">
            Cancel·la
          </button>
          <button class="btn btn-primary min-h-11" type="button" :disabled="enviant" @click="confirmar">
            {{ enviant ? "Reservant…" : "Confirma" }}
          </button>
        </div>
      </div>
    </div>
  </main>
</template>
