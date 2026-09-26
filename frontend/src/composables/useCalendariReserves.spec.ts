import { afterEach, describe, expect, it, vi } from "vitest";
import "temporal-polyfill/global";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { flushPromises, mount } from "@vue/test-utils";

import { useCalendariReserves } from "./useCalendariReserves";
import { ApiError } from "../services/http";
import { espaisApiKey, type EspaiDto, type EspaisApi } from "../services/espais";
import { finestresPerDefecte } from "../disponibilitat";
import { reservesApiKey, type ReservesApi } from "../services/reserves";
import { useSessioStore } from "../stores/sessio";
import type { SessioDto } from "../services/identitat";
import type { ReservaDto } from "../services/reserves";

const sessioCoord: SessioDto = {
  token: "tok",
  entity_id: "e1",
  user_id: "u2",
  role: "coordinator",
  entity_name: "AAVV Barri A",
  user_name: "Carla",
  typology: "associació de veïns",
};

const sessioResp: SessioDto = {
  ...sessioCoord,
  user_id: "u1",
  role: "responsible",
  user_name: "Anna",
};

const espai = {
  id: "s1",
  entity_id: "e1",
  name: "Sala 1",
  capacity: 40,
  equipment: null,
  active: true,
  windows: finestresPerDefecte(),
};

function reserva(overrides: Partial<ReservaDto> = {}): ReservaDto {
  return {
    id: "r1",
    space_id: "s1",
    space_name: "Sala 1",
    starts_at: "2026-09-08T08:00:00Z",
    ends_at: "2026-09-08T08:30:00Z",
    status: "confirmed",
    mine: false,
    coordinator_name: "Carla",
    attendance_count: null,
    capacity: 40,
    min_attendance: null,
    exceeds_capacity: false,
    below_min_attendance: false,
    ...overrides,
  };
}

const reservaCarla = reserva();

const espaiLaborables = {
  ...espai,
  windows: [0, 1, 2, 3, 4].map((weekday) => ({ weekday, start: "18:00", end: "22:00" })),
};

async function muntar(
  reserves: Partial<ReservesApi> = {},
  query: Record<string, string> = { espai: "s1" },
  sessio: SessioDto = sessioCoord,
  espaisDto: EspaiDto | EspaiDto[] = espai,
) {
  localStorage.clear();
  const pinia = createPinia();
  setActivePinia(pinia);
  useSessioStore().iniciar(sessio);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/calendari", name: "calendari", component: { template: "<div />" } }],
  });
  await router.push({ name: "calendari", query });
  await router.isReady();
  const Host = defineComponent({
    setup: () => useCalendariReserves(),
    template: "<div />",
  });
  const llista = Array.isArray(espaisDto) ? espaisDto : [espaisDto];
  const primer = llista[0];
  const espaisApi: EspaisApi = {
    llistar: async () => llista,
    obtenir: async (_token, id) => llista.find((item) => item.id === id) ?? primer,
    crear: async () => primer,
    actualitzar: async () => primer,
  };
  return mount(Host, {
    global: {
      plugins: [pinia, router],
      provide: {
        [espaisApiKey as symbol]: espaisApi,
        [reservesApiKey as symbol]: {
          llistar: async () => [],
          crear: async () => reserva({ mine: true }),
          registrarAssistencia: async () => reserva({ mine: true, attendance_count: 0 }),
          anular: async () => reserva({ status: "cancelled" }),
          reprogramar: async (_token, id, input) =>
            reserva({ id, starts_at: input.starts_at, ends_at: input.ends_at }),
          ...reserves,
        } satisfies ReservesApi,
      },
    },
  });
}

describe("useCalendariReserves", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("crea una reserva d’1 hora després de confirmar", async () => {
    let creat: { space_id: string; starts_at: string; ends_at: string } | null = null;
    const wrapper = await muntar({
      crear: async (_token, input) => {
        creat = input;
        return reserva({
          mine: true,
          space_id: input.space_id,
          starts_at: input.starts_at,
          ends_at: input.ends_at,
        });
      },
    });
    await wrapper.vm.carregarEspais();
    await flushPromises();
    expect(wrapper.vm.espaiId).toBe("s1");
    wrapper.vm.clicarFranja(Temporal.ZonedDateTime.from("2026-09-08T10:07:00+02:00[Europe/Madrid]"));
    expect(wrapper.vm.resumPendent).toContain("Sala 1");
    const creada = await wrapper.vm.confirmarPendent();
    expect(creada?.id).toBe("r1");
    expect(creat).toEqual({
      space_id: "s1",
      starts_at: "2026-09-08T08:00:00Z",
      ends_at: "2026-09-08T09:00:00Z",
    });
  });

  it("canvia la durada abans de confirmar", async () => {
    let creat: { starts_at: string; ends_at: string } | null = null;
    const wrapper = await muntar({
      crear: async (_token, input) => {
        creat = { starts_at: input.starts_at, ends_at: input.ends_at };
        return reserva({
          mine: true,
          space_id: input.space_id,
          starts_at: input.starts_at,
          ends_at: input.ends_at,
        });
      },
    });
    await wrapper.vm.carregarEspais();
    wrapper.vm.clicarFranja(Temporal.ZonedDateTime.from("2026-09-08T10:00:00+02:00[Europe/Madrid]"));
    wrapper.vm.triarDurada(90);
    expect(wrapper.vm.resumPendent).toContain("11:30");
    await wrapper.vm.confirmarPendent();
    expect(creat).toEqual({
      starts_at: "2026-09-08T08:00:00Z",
      ends_at: "2026-09-08T09:30:00Z",
    });
  });

  it("mostra l’error de solapament del backend", async () => {
    const wrapper = await muntar({
      crear: async () => {
        throw new ApiError("aquest interval ja està ocupat", 409);
      },
    });
    await wrapper.vm.carregarEspais();
    wrapper.vm.clicarFranja(Temporal.ZonedDateTime.from("2026-09-08T10:00:00+02:00[Europe/Madrid]"));
    await wrapper.vm.confirmarPendent();
    expect(wrapper.vm.error).toContain("ocupat");
    expect(wrapper.vm.pendent).not.toBeNull();
  });

  it("el coordinador sense espai a la ruta veu la setmana de tots els espais", async () => {
    let espaiFiltrat: string | undefined = "sentinel";
    const wrapper = await muntar(
      {
        llistar: async (_token, _des, _fins, espaiId) => {
          espaiFiltrat = espaiId;
          return [
            reserva({ mine: true, id: "r1", space_id: "s1", space_name: "Sala 1" }),
            reserva({ mine: true, id: "r2", space_id: "s2", space_name: "Sala 2" }),
            reserva({ mine: false, id: "r3", space_id: "s2", space_name: "Sala 2" }),
          ];
        },
      },
      {},
      sessioCoord,
      [espai, { ...espai, id: "s2", name: "Sala 2" }],
    );
    await wrapper.vm.carregarEspais();
    expect(wrapper.vm.espaiId).toBe("");
    expect(wrapper.vm.potReservar).toBe(false);
    const items = await wrapper.vm.carregarReserves("2026-09-07T22:00:00Z", "2026-09-14T22:00:00Z");
    expect(espaiFiltrat).toBeUndefined();
    expect(items).toHaveLength(3);
    const events = wrapper.vm.eventsDeReserves(items);
    expect(events.map((event) => event.calendarId)).toEqual(["s1", "s2"]);
    expect(events.map((event) => event.title)).toEqual(["Sala 1", "Sala 2"]);
  });

  it("canviar l’espai de la ruta permet reservar-hi sense amagar la setmana", async () => {
    let espaiFiltrat: string | undefined = "sentinel";
    const wrapper = await muntar(
      {
        llistar: async (_token, _des, _fins, espaiId) => {
          espaiFiltrat = espaiId;
          return [
            reserva({ mine: true, id: "r1", space_id: "s1", space_name: "Sala 1" }),
            reserva({ mine: true, id: "r2", space_id: "s2", space_name: "Sala 2" }),
            reserva({ mine: false, id: "r3", space_id: "s3", space_name: "Sala 3" }),
          ];
        },
      },
      {},
      sessioCoord,
      [
        espai,
        { ...espai, id: "s2", name: "Sala 2" },
        { ...espai, id: "s3", name: "Sala 3" },
      ],
    );
    await wrapper.vm.carregarEspais();
    expect(wrapper.vm.espaiId).toBe("");
    await wrapper.vm.$router.push({ name: "calendari", query: { espai: "s3" } });
    await flushPromises();
    expect(wrapper.vm.espaiId).toBe("s3");
    expect(wrapper.vm.espaiSeleccionat?.name).toBe("Sala 3");
    expect(wrapper.vm.potReservar).toBe(true);
    const items = await wrapper.vm.carregarReserves("2026-09-07T22:00:00Z", "2026-09-14T22:00:00Z");
    expect(espaiFiltrat).toBeUndefined();
    const events = wrapper.vm.eventsDeReserves(items);
    expect(events.map((event) => event.id)).toEqual(["r1", "r2", "r3"]);
  });

  it("el responsable sense espai a la ruta llista totes les reserves", async () => {
    let espaiFiltrat: string | undefined = "sentinel";
    const wrapper = await muntar(
      {
        llistar: async (_token, _des, _fins, espaiId) => {
          espaiFiltrat = espaiId;
          return [reservaCarla];
        },
      },
      {},
      sessioResp,
    );
    await wrapper.vm.carregarEspais();
    expect(wrapper.vm.potReservar).toBe(false);
    const items = await wrapper.vm.carregarReserves("2026-09-07T22:00:00Z", "2026-09-14T22:00:00Z");
    expect(espaiFiltrat).toBeUndefined();
    const [event] = wrapper.vm.eventsDeReserves(items);
    expect(event.title).toBe("Carla");
    expect(event.calendarId).toBe("s1");
    expect(event.people).toEqual(["Carla"]);
  });

  it("el responsable ignora ?espai= i llista totes les reserves", async () => {
    let espaiFiltrat: string | undefined = "sentinel";
    const wrapper = await muntar(
      {
        llistar: async (_token, _des, _fins, espaiId) => {
          espaiFiltrat = espaiId;
          return [
            reservaCarla,
            reserva({ id: "r2", space_id: "s2", space_name: "Sala 2", coordinator_name: "Núria" }),
          ];
        },
      },
      { espai: "s1" },
      sessioResp,
      [espai, { ...espai, id: "s2", name: "Sala 2" }],
    );
    await wrapper.vm.carregarEspais();
    expect(wrapper.vm.espaiId).toBe("");
    expect(wrapper.vm.potReservar).toBe(false);
    const items = await wrapper.vm.carregarReserves("2026-09-07T22:00:00Z", "2026-09-14T22:00:00Z");
    expect(espaiFiltrat).toBeUndefined();
    expect(items).toHaveLength(2);
    wrapper.vm.clicarFranja(Temporal.ZonedDateTime.from("2026-09-08T10:00:00+02:00[Europe/Madrid]"));
    expect(wrapper.vm.pendent).toBeNull();
    expect(wrapper.vm.modal).toBeNull();
  });

  it("refresca el mateix rang ja carregat", async () => {
    let vegades = 0;
    const wrapper = await muntar(
      {
        llistar: async () => {
          vegades += 1;
          return [reservaCarla];
        },
      },
      {},
      sessioResp,
    );
    await wrapper.vm.carregarEspais();
    await wrapper.vm.carregarReserves("2026-09-07T22:00:00Z", "2026-09-14T22:00:00Z");
    expect(vegades).toBe(1);
    const items = await wrapper.vm.refrescarReserves();
    expect(vegades).toBe(2);
    expect(items).toHaveLength(1);
  });

  it("no refresca si encara no hi ha rang", async () => {
    let vegades = 0;
    const wrapper = await muntar({
      llistar: async () => {
        vegades += 1;
        return [];
      },
    });
    await wrapper.vm.carregarEspais();
    const items = await wrapper.vm.refrescarReserves();
    expect(vegades).toBe(0);
    expect(items).toEqual([]);
  });

  it("el coordinador desa l’assistència de la seva reserva", async () => {
    let enviat: { id: string; count: number } | null = null;
    const wrapper = await muntar({
      llistar: async () => [reserva({ mine: true })],
      registrarAssistencia: async (_token, id, count) => {
        enviat = { id, count };
        return reserva({
          mine: true,
          attendance_count: count,
          exceeds_capacity: count > 40,
        });
      },
    });
    await wrapper.vm.carregarEspais();
    await wrapper.vm.carregarReserves("2026-09-07T22:00:00Z", "2026-09-14T22:00:00Z");
    wrapper.vm.obrirDetall("r1");
    expect(wrapper.vm.potRegistrarAssistencia).toBe(true);
    wrapper.vm.campAssistencia = "12";
    const desada = await wrapper.vm.desarAssistencia();
    expect(desada?.attendance_count).toBe(12);
    expect(enviat).toEqual({ id: "r1", count: 12 });
    expect(wrapper.vm.modal).toBeNull();
  });

  it("desa l’assistència si el camp arriba com a número", async () => {
    let enviat: number | null = null;
    const wrapper = await muntar({
      llistar: async () => [reserva({ mine: true })],
      registrarAssistencia: async (_token, _id, count) => {
        enviat = count;
        return reserva({ mine: true, attendance_count: count });
      },
    });
    await wrapper.vm.carregarEspais();
    await wrapper.vm.carregarReserves("2026-09-07T22:00:00Z", "2026-09-14T22:00:00Z");
    wrapper.vm.obrirDetall("r1");
    wrapper.vm.campAssistencia = 12 as unknown as string;
    const desada = await wrapper.vm.desarAssistencia();
    expect(desada?.attendance_count).toBe(12);
    expect(enviat).toBe(12);
    expect(wrapper.vm.modal).toBeNull();
  });

  it("avisa si el compte supera l’aforament però desa", async () => {
    const wrapper = await muntar({
      llistar: async () => [reserva({ mine: true, capacity: 10 })],
      registrarAssistencia: async (_token, _id, count) =>
        reserva({ mine: true, capacity: 10, attendance_count: count, exceeds_capacity: true }),
    });
    await wrapper.vm.carregarEspais();
    await wrapper.vm.carregarReserves("2026-09-07T22:00:00Z", "2026-09-14T22:00:00Z");
    wrapper.vm.obrirDetall("r1");
    wrapper.vm.campAssistencia = "11";
    expect(wrapper.vm.avisAforament).toContain("aforament");
    const desada = await wrapper.vm.desarAssistencia();
    expect(desada?.exceeds_capacity).toBe(true);
    expect(wrapper.vm.modal).toBeNull();
  });

  it("el responsable veu l’assistència d’una reserva aliena sense editar-la", async () => {
    const wrapper = await muntar(
      {
        llistar: async () => [reserva({ attendance_count: 8 })],
      },
      {},
      sessioResp,
    );
    await wrapper.vm.carregarEspais();
    await wrapper.vm.carregarReserves("2026-09-07T22:00:00Z", "2026-09-14T22:00:00Z");
    wrapper.vm.obrirDetall("r1");
    expect(wrapper.vm.potRegistrarAssistencia).toBe(false);
    expect(wrapper.vm.detall?.attendance_count).toBe(8);
    expect(await wrapper.vm.desarAssistencia()).toBeNull();
  });

  it("el coordinador no obre el detall d’una reserva d’altri", async () => {
    const wrapper = await muntar({
      llistar: async () => [reserva({ mine: false })],
    });
    await wrapper.vm.carregarEspais();
    await wrapper.vm.carregarReserves("2026-09-07T22:00:00Z", "2026-09-14T22:00:00Z");
    wrapper.vm.obrirDetall("r1");
    expect(wrapper.vm.modal).toBeNull();
    expect(wrapper.vm.detall).toBeNull();
  });

  it("mostra l’error si no es pot registrar l’assistència d’altri", async () => {
    const wrapper = await muntar({
      llistar: async () => [reserva({ mine: true })],
      registrarAssistencia: async () => {
        throw new ApiError("només qui ha fet la reserva pot registrar-ne l’assistència", 403);
      },
    });
    await wrapper.vm.carregarEspais();
    await wrapper.vm.carregarReserves("2026-09-07T22:00:00Z", "2026-09-14T22:00:00Z");
    wrapper.vm.obrirDetall("r1");
    wrapper.vm.campAssistencia = "3";
    await wrapper.vm.desarAssistencia();
    expect(wrapper.vm.errorDetall).toContain("qui ha fet la reserva");
  });

  it("el responsable confirma l’anul·lació i treu la reserva de la llista", async () => {
    let cridat: string | null = null;
    const wrapper = await muntar(
      {
        llistar: async () => [reservaCarla],
        anular: async (_token, id) => {
          cridat = id;
          return reserva({ id, status: "cancelled" });
        },
      },
      {},
      sessioResp,
    );
    await wrapper.vm.carregarEspais();
    await wrapper.vm.carregarReserves("2026-09-07T22:00:00Z", "2026-09-14T22:00:00Z");
    wrapper.vm.obrirDetall("r1");
    expect(wrapper.vm.potAnular).toBe(true);
    wrapper.vm.demanarAnulacio();
    expect(wrapper.vm.modal?.tipus).toBe("confirmar-anulacio");
    const anulada = await wrapper.vm.confirmarAnulacio();
    expect(anulada?.status).toBe("cancelled");
    expect(cridat).toBe("r1");
    expect(wrapper.vm.modal).toBeNull();
  });

  it("el coordinador no pot anul·lar des del detall", async () => {
    const wrapper = await muntar({
      llistar: async () => [reserva({ mine: true })],
    });
    await wrapper.vm.carregarEspais();
    await wrapper.vm.carregarReserves("2026-09-07T22:00:00Z", "2026-09-14T22:00:00Z");
    wrapper.vm.obrirDetall("r1");
    expect(wrapper.vm.potAnular).toBe(false);
    wrapper.vm.demanarAnulacio();
    expect(wrapper.vm.modal?.tipus).toBe("detall");
  });

  it("el responsable reprograma l’horari sense modal", async () => {
    let enviat: { id: string; starts_at: string; ends_at: string } | null = null;
    const wrapper = await muntar(
      {
        llistar: async () => [reservaCarla],
        reprogramar: async (_token, id, input) => {
          enviat = { id, starts_at: input.starts_at, ends_at: input.ends_at };
          return reserva({ id, starts_at: input.starts_at, ends_at: input.ends_at, mine: false });
        },
      },
      { espai: "s1" },
      sessioResp,
    );
    await wrapper.vm.carregarEspais();
    await wrapper.vm.carregarReserves("2026-09-07T22:00:00Z", "2026-09-14T22:00:00Z");
    expect(wrapper.vm.esReservaMovible("r1")).toBe(true);
    const moguda = await wrapper.vm.moureReserva(
      "r1",
      Temporal.ZonedDateTime.from("2026-09-08T12:00:00+02:00[Europe/Madrid]"),
      Temporal.ZonedDateTime.from("2026-09-08T12:30:00+02:00[Europe/Madrid]"),
    );
    expect(moguda?.starts_at).toBe("2026-09-08T10:00:00Z");
    expect(enviat).toEqual({
      id: "r1",
      starts_at: "2026-09-08T10:00:00Z",
      ends_at: "2026-09-08T10:30:00Z",
    });
    expect(wrapper.vm.modal).toBeNull();
    expect(wrapper.vm.okReprogramacio).toContain("avisat el coordinador");
  });

  it("el coordinador reprograma la seva reserva sense modal", async () => {
    let enviat: { id: string; starts_at: string } | null = null;
    const wrapper = await muntar({
      llistar: async () => [reserva({ mine: true })],
      reprogramar: async (_token, id, input) => {
        enviat = { id, starts_at: input.starts_at };
        return reserva({ mine: true, id, starts_at: input.starts_at, ends_at: input.ends_at });
      },
    });
    await wrapper.vm.carregarEspais();
    await wrapper.vm.carregarReserves("2026-09-07T22:00:00Z", "2026-09-14T22:00:00Z");
    const moguda = await wrapper.vm.moureReserva(
      "r1",
      Temporal.ZonedDateTime.from("2026-09-09T10:00:00+02:00[Europe/Madrid]"),
      Temporal.ZonedDateTime.from("2026-09-09T10:30:00+02:00[Europe/Madrid]"),
    );
    expect(moguda?.starts_at).toBe("2026-09-09T08:00:00Z");
    expect(enviat?.id).toBe("r1");
    expect(wrapper.vm.modal).toBeNull();
    expect(wrapper.vm.okReprogramacio).toBe("");
  });

  it("el coordinador no reprograma una reserva d’altri", async () => {
    let cridat = false;
    const wrapper = await muntar({
      llistar: async () => [reserva({ mine: false })],
      reprogramar: async () => {
        cridat = true;
        return reserva();
      },
    });
    await wrapper.vm.carregarEspais();
    await wrapper.vm.carregarReserves("2026-09-07T22:00:00Z", "2026-09-14T22:00:00Z");
    expect(wrapper.vm.esReservaMovible("r1")).toBe(false);
    expect(wrapper.vm.obrirDetall("r1")).toBeUndefined();
    expect(wrapper.vm.modal).toBeNull();
    const moguda = await wrapper.vm.moureReserva(
      "r1",
      Temporal.ZonedDateTime.from("2026-09-08T12:00:00+02:00[Europe/Madrid]"),
      Temporal.ZonedDateTime.from("2026-09-08T12:30:00+02:00[Europe/Madrid]"),
    );
    expect(moguda).toBeNull();
    expect(cridat).toBe(false);
    expect(wrapper.vm.modal).toBeNull();
  });

  it("no obre el modal de crear en un dia tancat ni fora d’hora", async () => {
    const wrapper = await muntar({}, { espai: "s1" }, sessioCoord, espaiLaborables);
    await wrapper.vm.carregarEspais();
    wrapper.vm.clicarFranja(Temporal.ZonedDateTime.from("2026-09-13T18:00:00+02:00[Europe/Madrid]"));
    expect(wrapper.vm.pendent).toBeNull();
    expect(wrapper.vm.error).toContain("no és accessible");
    wrapper.vm.clicarFranja(Temporal.ZonedDateTime.from("2026-09-08T10:00:00+02:00[Europe/Madrid]"));
    expect(wrapper.vm.pendent).toBeNull();
    expect(wrapper.vm.error).toContain("fora de l’horari");
    wrapper.vm.clicarFranja(Temporal.ZonedDateTime.from("2026-09-08T17:45:00+02:00[Europe/Madrid]"));
    expect(wrapper.vm.pendent?.starts_at).toBe("2026-09-08T16:00:00Z");
    wrapper.vm.clicarFranja(Temporal.ZonedDateTime.from("2026-09-08T18:00:00+02:00[Europe/Madrid]"));
    expect(wrapper.vm.pendent).not.toBeNull();
  });

  it("a Sala Tècnica el dijous és tancat i el divendres 18:00 es pot reservar", async () => {
    const wrapper = await muntar(
      {},
      { espai: "s1" },
      sessioCoord,
      {
        ...espai,
        name: "Sala Tècnica",
        windows: [0, 2, 4].map((weekday) => ({ weekday, start: "17:30", end: "22:00" })),
      },
    );
    await wrapper.vm.carregarEspais();
    wrapper.vm.clicarFranja(Temporal.ZonedDateTime.from("2026-09-10T18:00:00+02:00[Europe/Madrid]"));
    expect(wrapper.vm.pendent).toBeNull();
    expect(wrapper.vm.error).toContain("no és accessible");
    wrapper.vm.clicarFranja(Temporal.ZonedDateTime.from("2026-09-11T18:00:00+02:00[Europe/Madrid]"));
    expect(wrapper.vm.pendent).not.toBeNull();
    expect(wrapper.vm.pendent?.starts_at).toBe("2026-09-11T16:00:00Z");
  });

  it("l’avís de dia tancat desapareix sol", async () => {
    vi.useFakeTimers();
    const wrapper = await muntar({}, { espai: "s1" }, sessioCoord, espaiLaborables);
    await wrapper.vm.carregarEspais();
    wrapper.vm.clicarFranja(Temporal.ZonedDateTime.from("2026-09-13T18:00:00+02:00[Europe/Madrid]"));
    expect(wrapper.vm.error).toContain("no és accessible");
    vi.advanceTimersByTime(6000);
    expect(wrapper.vm.error).toBe("");
    wrapper.unmount();
  });
});
