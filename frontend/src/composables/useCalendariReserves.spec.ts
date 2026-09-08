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

const reservaCarla = {
  id: "r1",
  space_id: "s1",
  space_name: "Sala 1",
  starts_at: "2026-09-08T08:00:00Z",
  ends_at: "2026-09-08T08:30:00Z",
  status: "confirmed",
  mine: false,
  coordinator_name: "Carla",
};

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
          crear: async () => ({
            id: "r1",
            space_id: "s1",
            space_name: "Sala 1",
            starts_at: "2026-09-08T08:00:00Z",
            ends_at: "2026-09-08T08:30:00Z",
            status: "confirmed",
            mine: true,
            coordinator_name: "Carla",
          }),
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
        return {
          id: "r1",
          space_id: input.space_id,
          space_name: "Sala 1",
          starts_at: input.starts_at,
          ends_at: input.ends_at,
          status: "confirmed",
          mine: true,
          coordinator_name: "Carla",
        };
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
        return {
          id: "r1",
          space_id: input.space_id,
          space_name: "Sala 1",
          starts_at: input.starts_at,
          ends_at: input.ends_at,
          status: "confirmed",
          mine: true,
          coordinator_name: "Carla",
        };
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
});
