import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import { useAnalisi } from "./useAnalisi";
import { analisiApiKey, type AnalisiApi, type ResumUsDto } from "../services/analisi";
import { reservesApiKey, type ReservesApi, type ReservaDto } from "../services/reserves";
import { useSessioStore } from "../stores/sessio";
import type { SessioDto } from "../services/identitat";

const sessioResp: SessioDto = {
  token: "tok",
  entity_id: "e1",
  user_id: "u1",
  role: "responsible",
  entity_name: "AAVV Barri A",
  user_name: "Anna",
  typology: "associació de veïns",
};

function resum(overrides: Partial<ResumUsDto> = {}): ResumUsDto {
  return {
    starts_at: "2026-08-31T22:00:00Z",
    ends_at: "2026-09-30T22:00:00Z",
    confirmed_count: 1,
    cancelled_count: 1,
    reserved_hours: 1,
    available_hours: 14,
    occupancy_ratio: 1 / 14,
    average_attendance: 10,
    unregistered_count: 0,
    below_min_attendance: false,
    spaces: [
      {
        space_id: "s1",
        space_name: "Sala 1",
        capacity: 40,
        min_attendance: 8,
        confirmed_count: 1,
        cancelled_count: 1,
        reserved_hours: 1,
        available_hours: 14,
        occupancy_ratio: 1 / 14,
        average_attendance: 10,
        unregistered_count: 0,
        below_min_attendance: false,
      },
    ],
    ...overrides,
  };
}

function reserva(overrides: Partial<ReservaDto> = {}): ReservaDto {
  return {
    id: "r1",
    space_id: "s1",
    space_name: "Sala 1",
    starts_at: "2026-09-08T08:00:00Z",
    ends_at: "2026-09-08T09:00:00Z",
    status: "confirmed",
    mine: false,
    coordinator_name: "Carla",
    attendance_count: 10,
    capacity: 40,
    min_attendance: 8,
    exceeds_capacity: false,
    below_min_attendance: false,
    ...overrides,
  };
}

async function muntar(analisi: Partial<AnalisiApi> = {}, reserves: Partial<ReservesApi> = {}) {
  localStorage.clear();
  const pinia = createPinia();
  setActivePinia(pinia);
  useSessioStore().iniciar(sessioResp);
  const Host = defineComponent({
    setup: () => useAnalisi(),
    template: "<div />",
  });
  return mount(Host, {
    global: {
      plugins: [pinia],
      provide: {
        [analisiApiKey as symbol]: {
          resum: async () => resum(),
          ...analisi,
        } satisfies AnalisiApi,
        [reservesApiKey as symbol]: {
          llistar: async () => [reserva(), reserva({ id: "r2", status: "cancelled", attendance_count: null })],
          crear: async () => reserva(),
          registrarAssistencia: async () => reserva(),
          anular: async () => reserva({ status: "cancelled" }),
          reprogramar: async () => reserva(),
          ...reserves,
        } satisfies ReservesApi,
      },
    },
  });
}

describe("useAnalisi", () => {
  it("carrega el resum i les reserves anul·lades del període", async () => {
    let incloses: boolean | undefined;
    const wrapper = await muntar(
      {},
      {
        llistar: async (_token, _des, _fins, _espai, inclouAnulades) => {
          incloses = inclouAnulades;
          return [reserva({ status: "cancelled" })];
        },
      },
    );
    await wrapper.vm.carregar();
    expect(wrapper.vm.resum?.confirmed_count).toBe(1);
    expect(wrapper.vm.reserves).toHaveLength(1);
    expect(wrapper.vm.reserves[0]?.status).toBe("cancelled");
    expect(incloses).toBe(true);
  });

  it("demana un altre mes en canviar el selector", async () => {
    const periodes: string[] = [];
    const wrapper = await muntar({
      resum: async (_token, des) => {
        periodes.push(des);
        return resum({ starts_at: des });
      },
    });
    await flushPromises();
    wrapper.vm.mes = "2026-08";
    await flushPromises();
    expect(periodes).toContain("2026-07-31T22:00:00Z");
  });

  it("substitueix el resum per dades d’exemple sense trucar l’API de nou", async () => {
    const wrapper = await muntar();
    await flushPromises();
    expect(wrapper.vm.resum?.spaces[0]?.space_name).toBe("Sala 1");
    wrapper.vm.mostraExemple = true;
    await flushPromises();
    expect(wrapper.vm.resum?.spaces).toHaveLength(4);
    expect(wrapper.vm.resum?.spaces[0]?.space_name).toBe("Sala gran");
  });
});
