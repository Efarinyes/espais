import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { flushPromises, mount } from "@vue/test-utils";

import { analisiApiKey, type AnalisiApi, type ResumUsDto } from "../services/analisi";
import { reservesApiKey, type ReservesApi, type ReservaDto } from "../services/reserves";
import { useSessioStore } from "../stores/sessio";
import AnalisiView from "./AnalisiView.vue";

function resum(): ResumUsDto {
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
  };
}

function reserva(): ReservaDto {
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
  };
}

async function muntar() {
  localStorage.clear();
  const pinia = createPinia();
  setActivePinia(pinia);
  useSessioStore().iniciar({
    token: "tok",
    entity_id: "e1",
    user_id: "u1",
    role: "responsible",
    entity_name: "AAVV Barri A",
    user_name: "Anna",
    typology: "associació de veïns",
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/analisi", name: "analisi", component: AnalisiView },
      { path: "/espais/nou", name: "espai-nou", component: { template: "<div />" } },
      { path: "/calendari", name: "calendari", component: { template: "<div />" } },
    ],
  });
  await router.push("/analisi");
  let trucades = 0;
  const analisi: AnalisiApi = {
    resum: async () => {
      trucades += 1;
      return resum();
    },
  };
  const reserves: ReservesApi = {
    llistar: async () => [reserva()],
    crear: async () => reserva(),
    registrarAssistencia: async () => reserva(),
    anular: async () => reserva(),
    reprogramar: async () => reserva(),
  };
  const wrapper = mount(AnalisiView, {
    global: {
      plugins: [pinia, router],
      provide: {
        [analisiApiKey as symbol]: analisi,
        [reservesApiKey as symbol]: reserves,
      },
    },
  });
  await flushPromises();
  return { wrapper, trucades: () => trucades };
}

describe("AnalisiView", () => {
  it("substitueix el resum per la mostra d’exemple sense tornar a cridar l’API", async () => {
    const { wrapper, trucades } = await muntar();
    expect(wrapper.text()).toContain("Sala 1");
    expect(trucades()).toBe(1);
    await wrapper.get("input[type='checkbox']").setValue(true);
    await flushPromises();
    expect(wrapper.text()).toContain("Sala gran");
    expect(wrapper.text()).toContain("Això no són dades de la vostra entitat");
    expect(trucades()).toBe(1);
  });
});
