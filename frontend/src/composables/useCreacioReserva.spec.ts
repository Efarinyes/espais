import { describe, expect, it } from "vitest";
import "temporal-polyfill/global";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, ref } from "vue";
import { mount } from "@vue/test-utils";

import { useCreacioReserva } from "./useCreacioReserva";
import type { FranjaReserva } from "../calendari";
import { ApiError } from "../services/http";
import { reservesApiKey, type ReservaDto, type ReservesApi } from "../services/reserves";
import { useSessioStore } from "../stores/sessio";

const finestresLaborables = [0, 1, 2, 3, 4].map((weekday) => ({
  weekday,
  start: "18:00",
  end: "22:00",
}));

function reserva(overrides: Partial<ReservaDto> = {}): ReservaDto {
  return {
    id: "r1",
    space_id: "s1",
    space_name: "Sala 1",
    starts_at: "2026-09-08T08:00:00Z",
    ends_at: "2026-09-08T09:00:00Z",
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

function muntar(
  reserves: Partial<ReservesApi> = {},
  opcions: { espaiId?: string; franja?: FranjaReserva | null; token?: string } = {},
) {
  localStorage.clear();
  const pinia = createPinia();
  setActivePinia(pinia);
  useSessioStore().iniciar({
    token: opcions.token ?? "tok",
    entity_id: "e1",
    user_id: "u2",
    role: "coordinator",
    entity_name: "AAVV Barri A",
    user_name: "Carla",
    typology: null,
  });
  const Host = defineComponent({
    setup() {
      const espaiId = ref(opcions.espaiId ?? "s1");
      const franja = ref<FranjaReserva | null>(opcions.franja === undefined ? null : opcions.franja);
      const enviant = ref(false);
      const error = ref("");
      const reservesCarregades = ref<ReservaDto[]>([]);
      let tancat = false;
      const creacio = useCreacioReserva({
        espaiId,
        franjaOberta: () => franja.value,
        enviant,
        error,
        reservesCarregades,
        mostrarError: (text) => {
          error.value = text;
        },
        tancarModal: () => {
          tancat = true;
          franja.value = null;
        },
      });
      return { ...creacio, espaiId, franja, enviant, error, reservesCarregades, tancat: () => tancat };
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

describe("useCreacioReserva", () => {
  it("arrodonix el clic a l’hora i proposa una franja d’una hora", () => {
    const wrapper = muntar();
    const franja = wrapper.vm.franjaDesDeClic(
      Temporal.ZonedDateTime.from("2026-09-08T10:07:00+02:00[Europe/Madrid]"),
      [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, start: "08:00", end: "22:00" })),
      60,
    );
    expect(franja).toEqual({
      starts_at: "2026-09-08T08:00:00Z",
      ends_at: "2026-09-08T09:00:00Z",
    });
    expect(wrapper.vm.error).toBe("");
  });

  it("rebutja un dia tancat i una hora fora de l’horari, i encaixa el clic proper", () => {
    const wrapper = muntar();
    const tancat = wrapper.vm.franjaDesDeClic(
      Temporal.ZonedDateTime.from("2026-09-13T18:00:00+02:00[Europe/Madrid]"),
      finestresLaborables,
      60,
    );
    expect(tancat).toBeNull();
    expect(wrapper.vm.error).toContain("no és accessible");

    const fora = wrapper.vm.franjaDesDeClic(
      Temporal.ZonedDateTime.from("2026-09-08T10:00:00+02:00[Europe/Madrid]"),
      finestresLaborables,
      60,
    );
    expect(fora).toBeNull();
    expect(wrapper.vm.error).toContain("fora de l’horari");

    const encaixat = wrapper.vm.franjaDesDeClic(
      Temporal.ZonedDateTime.from("2026-09-08T17:45:00+02:00[Europe/Madrid]"),
      finestresLaborables,
      60,
    );
    expect(encaixat?.starts_at).toBe("2026-09-08T16:00:00Z");
  });

  it("no crea si no hi ha franja oberta o espai", async () => {
    let cridat = false;
    const senseFranja = muntar({
      crear: async () => {
        cridat = true;
        return reserva();
      },
    });
    expect(await senseFranja.vm.confirmarPendent()).toBeNull();
    expect(cridat).toBe(false);

    const senseEspai = muntar(
      {
        crear: async () => {
          cridat = true;
          return reserva();
        },
      },
      {
        espaiId: "",
        franja: { starts_at: "2026-09-08T08:00:00Z", ends_at: "2026-09-08T09:00:00Z" },
      },
    );
    expect(await senseEspai.vm.confirmarPendent()).toBeNull();
    expect(cridat).toBe(false);
  });

  it("desa la reserva confirmada i la suma a les carregades", async () => {
    let creat: { space_id: string; starts_at: string; ends_at: string } | null = null;
    let alliberar: (value: ReservaDto) => void = () => undefined;
    const wrapper = muntar(
      {
        crear: (_token, input) => {
          creat = input;
          return new Promise((resolve) => {
            alliberar = resolve;
          });
        },
      },
      { franja: { starts_at: "2026-09-08T08:00:00Z", ends_at: "2026-09-08T09:00:00Z" } },
    );
    const pendent = wrapper.vm.confirmarPendent();
    expect(wrapper.vm.enviant).toBe(true);
    alliberar(reserva({ mine: true }));
    const creada = await pendent;
    expect(creada?.id).toBe("r1");
    expect(creat).toEqual({
      space_id: "s1",
      starts_at: "2026-09-08T08:00:00Z",
      ends_at: "2026-09-08T09:00:00Z",
    });
    expect(wrapper.vm.reservesCarregades).toHaveLength(1);
    expect(wrapper.vm.tancat()).toBe(true);
    expect(wrapper.vm.enviant).toBe(false);
    expect(wrapper.vm.franja).toBeNull();
  });

  it("deixa la franja oberta si l’interval ja està ocupat", async () => {
    const wrapper = muntar(
      {
        crear: async () => {
          throw new ApiError("aquest interval ja està ocupat", 409);
        },
      },
      { franja: { starts_at: "2026-09-08T08:00:00Z", ends_at: "2026-09-08T09:00:00Z" } },
    );
    expect(await wrapper.vm.confirmarPendent()).toBeNull();
    expect(wrapper.vm.error).toContain("ocupat");
    expect(wrapper.vm.tancat()).toBe(false);
    expect(wrapper.vm.franja).not.toBeNull();
    expect(wrapper.vm.enviant).toBe(false);
  });

  it("mostra l’error del servidor o un avís genèric si la creació falla", async () => {
    const servidor = muntar(
      {
        crear: async () => {
          throw new ApiError("no s’ha pogut crear", 500);
        },
      },
      { franja: { starts_at: "2026-09-08T08:00:00Z", ends_at: "2026-09-08T09:00:00Z" } },
    );
    expect(await servidor.vm.confirmarPendent()).toBeNull();
    expect(servidor.vm.error).toContain("no s’ha pogut crear");

    const caiguda = muntar(
      {
        crear: async () => {
          throw new Error("xarxa");
        },
      },
      { franja: { starts_at: "2026-09-08T08:00:00Z", ends_at: "2026-09-08T09:00:00Z" } },
    );
    expect(await caiguda.vm.confirmarPendent()).toBeNull();
    expect(caiguda.vm.error).toContain("No s’ha pogut crear la reserva");
  });
});
