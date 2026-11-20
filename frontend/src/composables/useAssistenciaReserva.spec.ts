import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, ref } from "vue";
import { mount } from "@vue/test-utils";

import { useAssistenciaReserva } from "./useAssistenciaReserva";
import { ApiError } from "../services/http";
import { reservesApiKey, type ReservaDto, type ReservesApi } from "../services/reserves";
import { useSessioStore } from "../stores/sessio";

function reserva(overrides: Partial<ReservaDto> = {}): ReservaDto {
  return {
    id: "r1",
    space_id: "s1",
    space_name: "Sala 1",
    starts_at: "2026-09-08T08:00:00Z",
    ends_at: "2026-09-08T08:30:00Z",
    status: "confirmed",
    mine: true,
    coordinator_name: "Carla",
    attendance_count: null,
    capacity: 40,
    min_attendance: null,
    exceeds_capacity: false,
    below_min_attendance: false,
    ...overrides,
  };
}

function muntar(reserves: Partial<ReservesApi> = {}, inicial = reserva()) {
  localStorage.clear();
  const pinia = createPinia();
  setActivePinia(pinia);
  useSessioStore().iniciar({
    token: "tok",
    entity_id: "e1",
    user_id: "u2",
    role: "coordinator",
    entity_name: "AAVV Barri A",
    user_name: "Carla",
    typology: null,
  });
  const Host = defineComponent({
    setup() {
      const oberta = ref<ReservaDto | null>(inicial);
      const esDetall = ref(true);
      const errorDetall = ref("");
      const okDetall = ref("");
      const reservesCarregades = ref<ReservaDto[]>([inicial]);
      let tancat = false;
      const assistencia = useAssistenciaReserva({
        reservaDetall: () => oberta.value,
        esDetall: () => esDetall.value,
        errorDetall,
        okDetall,
        reservesCarregades,
        tancarModal: () => {
          tancat = true;
          oberta.value = null;
        },
      });
      return { ...assistencia, oberta, esDetall, errorDetall, okDetall, reservesCarregades, tancat: () => tancat };
    },
    template: "<div />",
  });
  return mount(Host, {
    global: {
      plugins: [pinia],
      provide: {
        [reservesApiKey as symbol]: {
          llistar: async () => [],
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

describe("useAssistenciaReserva (persones previstes)", () => {
  it("rebutja unes persones previstes que no són un enter igual o superior a zero", async () => {
    let cridat = false;
    const wrapper = muntar({
      registrarAssistencia: async () => {
        cridat = true;
        return reserva();
      },
    });
    for (const valor of ["", "-1", "1.5"]) {
      wrapper.vm.campAssistencia = valor;
      expect(await wrapper.vm.desarAssistencia()).toBeNull();
      expect(wrapper.vm.errorDetall).toBe("Les persones previstes han de ser un enter ≥ 0.");
    }
    expect(cridat).toBe(false);
    expect(wrapper.vm.tancat()).toBe(false);
  });

  it("desa les persones previstes, actualitza la llista i tanca el detall", async () => {
    let enviat: { id: string; count: number } | null = null;
    const wrapper = muntar({
      registrarAssistencia: async (_token, id, count) => {
        enviat = { id, count };
        return reserva({ attendance_count: count });
      },
    });
    wrapper.vm.actualitzarCampAssistencia("12");
    const desada = await wrapper.vm.desarAssistencia();
    expect(desada?.attendance_count).toBe(12);
    expect(enviat).toEqual({ id: "r1", count: 12 });
    expect(wrapper.vm.reservesCarregades[0].attendance_count).toBe(12);
    expect(wrapper.vm.tancat()).toBe(true);
    expect(wrapper.vm.enviantAssistencia).toBe(false);
  });

  it("avisa, sense bloquejar, si les persones previstes superen l’aforament o no arriben al mínim", () => {
    const massa = muntar({}, reserva({ capacity: 10, attendance_count: null }));
    massa.vm.campAssistencia = "11";
    expect(massa.vm.avisAforament).toBe(
      "Les persones previstes superen l’aforament de l’espai. Pots continuar igualment.",
    );
    massa.vm.campAssistencia = "10";
    expect(massa.vm.avisAforament).toBe("");

    const poc = muntar({}, reserva({ capacity: 40, min_attendance: 5, attendance_count: null }));
    poc.vm.campAssistencia = "2";
    expect(poc.vm.avisAforament).toContain("aforament mínim");
    expect(poc.vm.avisAforament).not.toMatch(/assist/i);
  });

  it("sense persones previstes no hi ha cap avís", () => {
    const wrapper = muntar({}, reserva({ capacity: 10, attendance_count: null }));
    expect(wrapper.vm.avisAforament).toBe("");
  });

  it("l’avís d’aforament no impedeix desar una previsió que supera l’aforament", async () => {
    const wrapper = muntar(
      {
        registrarAssistencia: async (_token, _id, count) =>
          reserva({ capacity: 10, attendance_count: count, exceeds_capacity: true }),
      },
      reserva({ capacity: 10, attendance_count: null }),
    );
    wrapper.vm.campAssistencia = "25";
    expect(wrapper.vm.avisAforament).toContain("superen l’aforament");
    const desada = await wrapper.vm.desarAssistencia();
    expect(desada?.attendance_count).toBe(25);
    expect(wrapper.vm.reservesCarregades[0].attendance_count).toBe(25);
    expect(wrapper.vm.errorDetall).toBe("");
  });

  it("el zero és una previsió vàlida", async () => {
    const wrapper = muntar({
      registrarAssistencia: async (_token, _id, count) => reserva({ attendance_count: count }),
    });
    wrapper.vm.campAssistencia = "0";
    const desada = await wrapper.vm.desarAssistencia();
    expect(desada?.attendance_count).toBe(0);
  });

  it("no desa una reserva que no és de qui la mira", async () => {
    let cridat = false;
    const wrapper = muntar(
      {
        registrarAssistencia: async () => {
          cridat = true;
          return reserva();
        },
      },
      reserva({ mine: false, attendance_count: 8 }),
    );
    expect(wrapper.vm.potRegistrarAssistencia).toBe(false);
    expect(await wrapper.vm.desarAssistencia()).toBeNull();
    expect(cridat).toBe(false);
  });

  it("mostra l’error de permís si el servidor rebutja la previsió", async () => {
    const wrapper = muntar({
      registrarAssistencia: async () => {
        throw new ApiError("només qui ha fet la reserva", 403);
      },
    });
    wrapper.vm.campAssistencia = "3";
    expect(await wrapper.vm.desarAssistencia()).toBeNull();
    expect(wrapper.vm.errorDetall).toBe("Només qui ha fet la reserva en pot canviar les persones previstes.");
    expect(wrapper.vm.tancat()).toBe(false);
  });
});
