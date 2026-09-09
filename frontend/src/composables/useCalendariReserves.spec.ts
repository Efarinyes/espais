import { describe, expect, it } from "vitest";
import "temporal-polyfill/global";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { flushPromises, mount } from "@vue/test-utils";

import { useCalendariReserves } from "./useCalendariReserves";
import { ApiError } from "../services/identitat";
import { espaisApiKey, type EspaisApi } from "../services/espais";
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

async function muntar(
  reserves: Partial<ReservesApi> = {},
  query: Record<string, string> = { espai: "s1" },
  sessio: SessioDto = sessioCoord,
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
  const espaisApi: EspaisApi = {
    llistar: async () => [espai],
    obtenir: async () => espai,
    crear: async () => espai,
    actualitzar: async () => espai,
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
          ...reserves,
        } satisfies ReservesApi,
      },
    },
  });
}

describe("useCalendariReserves", () => {
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

  it("el coordinador sense espai a la ruta no reserva", async () => {
    const wrapper = await muntar({}, {});
    await wrapper.vm.carregarEspais();
    expect(wrapper.vm.espaiId).toBe("");
    expect(wrapper.vm.potReservar).toBe(false);
    wrapper.vm.clicarFranja(Temporal.ZonedDateTime.from("2026-09-08T10:00:00+02:00[Europe/Madrid]"));
    expect(wrapper.vm.pendent).toBeNull();
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
    expect(wrapper.vm.vistaGlobal).toBe(true);
    expect(wrapper.vm.potReservar).toBe(false);
    const items = await wrapper.vm.carregarReserves("2026-09-07T22:00:00Z", "2026-09-14T22:00:00Z");
    expect(espaiFiltrat).toBeUndefined();
    const [event] = wrapper.vm.eventsDeReserves(items);
    expect(event.title).toBe("Carla");
    expect(event.calendarId).toBe("s1");
    expect(event.people).toEqual(["Carla"]);
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
});
