import "temporal-polyfill/global";
import { afterEach, describe, expect, it, vi } from "vitest";

const crearCalendari = vi.hoisted(() => vi.fn(() => ({ destroy() {} })));

vi.mock("@schedule-x/calendar", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@schedule-x/calendar")>();
  return { ...actual, createCalendar: crearCalendari };
});
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { flushPromises, mount } from "@vue/test-utils";

import { disparadorCalendariKey } from "../calendariLive";
import { espaisApiKey, type EspaiDto, type EspaisApi } from "../services/espais";
import { reservesApiKey, type ReservesApi } from "../services/reserves";
import type { SessioDto } from "../services/identitat";
import { useSessioStore } from "../stores/sessio";
import CalendariView from "./CalendariView.vue";

const sessioResp: SessioDto = {
  token: "tok",
  entity_id: "e1",
  user_id: "u1",
  role: "responsible",
  entity_name: "Entitat Graella",
  user_name: "Anna",
  typology: "associació de veïns",
};

const sala1: EspaiDto = {
  id: "s1",
  entity_id: "e1",
  name: "Sala 1",
  capacity: 40,
  equipment: null,
  active: true,
  windows: [
    { weekday: 0, start: "20:00", end: "22:00" },
    { weekday: 5, start: "10:00", end: "12:00" },
  ],
};

const sala2: EspaiDto = {
  id: "s2",
  entity_id: "e1",
  name: "Sala 2",
  capacity: 20,
  equipment: null,
  active: true,
  windows: [{ weekday: 0, start: "18:30", end: "23:59" }],
};

const reservesApi: ReservesApi = {
  llistar: async () => [],
  crear: async () => {
    throw new Error("no");
  },
  registrarAssistencia: async () => {
    throw new Error("no");
  },
  anular: async () => {
    throw new Error("no");
  },
  reprogramar: async () => {
    throw new Error("no");
  },
};

function espaisApi(llista: EspaiDto[]): EspaisApi {
  return {
    llistar: async () => llista,
    obtenir: async (_token, id) => llista.find((espai) => espai.id === id) ?? llista[0],
    crear: async () => llista[0],
    actualitzar: async () => llista[0],
  };
}

function pantallaEstreta(estreta: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: estreta && query.includes("max-width"),
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    },
  })) as typeof window.matchMedia;
}

async function muntar(opts: {
  role: "responsible" | "coordinator";
  espais: EspaiDto[];
  estreta: boolean;
  espai?: string;
}) {
  localStorage.clear();
  pantallaEstreta(opts.estreta);
  vi.spyOn(Temporal.Now, "zonedDateTimeISO").mockReturnValue(
    Temporal.ZonedDateTime.from("2026-10-05T10:00:00+02:00[Europe/Madrid]"),
  );
  const pinia = createPinia();
  setActivePinia(pinia);
  useSessioStore().iniciar({
    ...sessioResp,
    role: opts.role,
    user_id: opts.role === "responsible" ? "u1" : "u2",
    user_name: opts.role === "responsible" ? "Anna" : "Carla",
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/calendari", name: "calendari", component: CalendariView },
      { path: "/espais/nou", name: "espai-nou", component: { template: "<div />" } },
    ],
  });
  await router.push({ name: "calendari", query: opts.espai ? { espai: opts.espai } : {} });
  await router.isReady();
  return mount(CalendariView, {
    global: {
      plugins: [pinia, router],
      stubs: { ScheduleXCalendar: true },
      provide: {
        [espaisApiKey as symbol]: espaisApi(opts.espais),
        [reservesApiKey as symbol]: reservesApi,
        [disparadorCalendariKey as symbol]: { iniciar: () => () => {} },
      },
    },
  });
}

type ConfigCalendari = {
  dayBoundaries: { start: string; end: string };
  weekOptions: {
    gridHeight: number;
    timeAxisFormatOptions: { hour: string; minute: string; hourCycle: string };
  };
};

function darreraConfig(): ConfigCalendari {
  return crearCalendari.mock.calls.at(-1)?.[0] as unknown as ConfigCalendari;
}

describe("CalendariView graella", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    crearCalendari.mockClear();
  });

  it("una sala de 20:00 a 23:59 es veu de 19:30 a 24:00", async () => {
    const sala = {
      id: "s1",
      entity_id: "e1",
      name: "Sala pilars",
      capacity: 40,
      equipment: null,
      active: true,
      windows: [2, 3, 4, 5, 6].map((weekday) => ({ weekday, start: "20:00", end: "23:59" })),
    };
    const wrapper = await muntar({
      role: "responsible",
      espais: [sala],
      estreta: false,
    });
    await flushPromises();
    const config = darreraConfig();
    expect(config.dayBoundaries).toEqual({ start: "19:30", end: "24:00" });
    expect(config.weekOptions.gridHeight).toBe(396);
    expect(config.weekOptions.timeAxisFormatOptions).toEqual({
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    const graella = wrapper.get(".calendari-espais");
    expect(graella.attributes("data-dies-oberts")).toBe("2 3 4 5 6");
    expect(graella.attributes("style")).not.toContain("--retall");
    expect(graella.attributes("style")).toContain("--marge-inici: 11.11111111111111%");
    wrapper.unmount();
  });

  it("el responsable a l’ordinador veu de mitja hora abans a mitja hora després de totes les sales", async () => {
    const wrapper = await muntar({
      role: "responsible",
      espais: [sala1, sala2],
      estreta: false,
    });
    await flushPromises();
    expect(darreraConfig().dayBoundaries).toEqual({ start: "09:30", end: "24:00" });
    expect(wrapper.get(".calendari-espais").attributes("data-dies-oberts")).toBe("0 5");
    wrapper.unmount();
  });

  it("el responsable al telèfon només compta les sales obertes aquell dia", async () => {
    const wrapper = await muntar({
      role: "responsible",
      espais: [sala1, sala2],
      estreta: true,
    });
    await flushPromises();
    expect(darreraConfig().dayBoundaries).toEqual({ start: "18:00", end: "24:00" });
    const graella = wrapper.get(".calendari-espais");
    expect(graella.attributes("data-slots-inici")).toBe("1");
    expect(graella.attributes("data-slots-fi")).toBe("0");
    expect(graella.attributes("style")).toContain("--marge-inici: 8.333333333333332%");
    expect(graella.attributes("style")).toContain("--marge-fi: 0.2777777777777778%");
    wrapper.unmount();
  });

  it("el coordinador a l’ordinador usa la setmana de la sala seleccionada", async () => {
    const wrapper = await muntar({
      role: "coordinator",
      espais: [sala1, sala2],
      estreta: false,
      espai: "s1",
    });
    await flushPromises();
    expect(darreraConfig().dayBoundaries).toEqual({ start: "09:30", end: "22:30" });
    expect(darreraConfig().weekOptions.gridHeight).toBe(1144);
    const graella = wrapper.get(".calendari-espais");
    expect(graella.attributes("data-dies-oberts")).toBe("0 5");
    expect(graella.attributes("data-slots-inici")).toBe("1");
    expect(graella.attributes("data-slots-fi")).toBe("1");
    wrapper.unmount();
  });

  it("el coordinador al telèfon usa l’horari d’aquell dia de la sala", async () => {
    const wrapper = await muntar({
      role: "coordinator",
      espais: [sala1, sala2],
      estreta: true,
      espai: "s1",
    });
    await flushPromises();
    expect(darreraConfig().dayBoundaries).toEqual({ start: "19:30", end: "22:30" });
    const graella = wrapper.get(".calendari-espais");
    expect(graella.attributes("style")).toContain("--marge-inici: 16.666666666666664%");
    expect(graella.attributes("style")).toContain("--marge-fi: 16.666666666666664%");
    wrapper.unmount();
  });

  it("el coordinador que canvia de sala veu el rang de la nova", async () => {
    const wrapper = await muntar({
      role: "coordinator",
      espais: [sala1, sala2],
      estreta: false,
      espai: "s1",
    });
    await flushPromises();
    expect(darreraConfig().dayBoundaries).toEqual({ start: "09:30", end: "22:30" });
    await wrapper.vm.$router.push({ name: "calendari", query: { espai: "s2" } });
    await flushPromises();
    expect(darreraConfig().dayBoundaries).toEqual({ start: "18:00", end: "24:00" });
    expect(wrapper.get(".calendari-espais").attributes("data-dies-oberts")).toBe("0");
    wrapper.unmount();
  });
});
