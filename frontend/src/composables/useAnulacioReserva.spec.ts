import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, ref } from "vue";
import { mount } from "@vue/test-utils";

import { useAnulacioReserva } from "./useAnulacioReserva";
import { ApiError } from "../services/http";
import { reservesApiKey, type ReservaDto, type ReservesApi } from "../services/reserves";
import type { SessioDto } from "../services/identitat";
import { useSessioStore } from "../stores/sessio";

const sessioResp: SessioDto = {
  token: "tok",
  entity_id: "e1",
  user_id: "u1",
  role: "responsible",
  entity_name: "AAVV Barri A",
  user_name: "Anna",
  typology: null,
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

function muntar(reserves: Partial<ReservesApi> = {}, sessio: SessioDto = sessioResp, inicial = reserva()) {
  localStorage.clear();
  const pinia = createPinia();
  setActivePinia(pinia);
  useSessioStore().iniciar(sessio);
  const Host = defineComponent({
    setup() {
      const modal = ref<"detall" | "confirmar-anulacio" | null>("detall");
      const oberta = ref<ReservaDto | null>(inicial);
      const errorDetall = ref("");
      const reservesCarregades = ref<ReservaDto[]>([inicial]);
      let tancat = false;
      const anulacio = useAnulacioReserva({
        reservaEnDetall: () => (modal.value === "detall" ? oberta.value : null),
        reservaEnConfirmacio: () => (modal.value === "confirmar-anulacio" ? oberta.value : null),
        errorDetall,
        reservesCarregades,
        obrirConfirmacio: (item) => {
          oberta.value = item;
          modal.value = "confirmar-anulacio";
        },
        tornarAlDetall: (item) => {
          oberta.value = item;
          modal.value = "detall";
        },
        tancarModal: () => {
          tancat = true;
          modal.value = null;
          oberta.value = null;
        },
      });
      return { ...anulacio, modal, errorDetall, reservesCarregades, tancat: () => tancat };
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

describe("useAnulacioReserva", () => {
  it("el responsable confirma l’anul·lació i treu la reserva de la llista", async () => {
    let cridat: string | null = null;
    const wrapper = muntar({
      anular: async (_token, id) => {
        cridat = id;
        return reserva({ id, status: "cancelled" });
      },
    });
    expect(wrapper.vm.potAnular).toBe(true);
    wrapper.vm.demanarAnulacio();
    expect(wrapper.vm.modal).toBe("confirmar-anulacio");
    const anulada = await wrapper.vm.confirmarAnulacio();
    expect(anulada?.status).toBe("cancelled");
    expect(cridat).toBe("r1");
    expect(wrapper.vm.reservesCarregades).toHaveLength(0);
    expect(wrapper.vm.tancat()).toBe(true);
  });

  it("el coordinador no obre la confirmació des del detall", () => {
    const wrapper = muntar({}, { ...sessioResp, role: "coordinator", user_id: "u2" }, reserva({ mine: true }));
    expect(wrapper.vm.potAnular).toBe(false);
    wrapper.vm.demanarAnulacio();
    expect(wrapper.vm.modal).toBe("detall");
  });

  it("torna al detall des de la confirmació", () => {
    const wrapper = muntar();
    wrapper.vm.demanarAnulacio();
    wrapper.vm.errorDetall = "abans";
    wrapper.vm.tornarDetall();
    expect(wrapper.vm.modal).toBe("detall");
    expect(wrapper.vm.errorDetall).toBe("");
  });

  it("deixa la confirmació oberta si el servidor rebutja l’anul·lació", async () => {
    const wrapper = muntar({
      anular: async () => {
        throw new ApiError("només el responsable", 403);
      },
    });
    wrapper.vm.demanarAnulacio();
    expect(await wrapper.vm.confirmarAnulacio()).toBeNull();
    expect(wrapper.vm.errorDetall).toContain("avís al coordinador");
    expect(wrapper.vm.modal).toBe("confirmar-anulacio");
    expect(wrapper.vm.tancat()).toBe(false);
    expect(wrapper.vm.enviantAnulacio).toBe(false);
  });
});
