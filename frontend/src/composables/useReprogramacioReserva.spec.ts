import { describe, expect, it } from "vitest";
import "temporal-polyfill/global";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, ref } from "vue";
import { mount } from "@vue/test-utils";

import { useReprogramacioReserva } from "./useReprogramacioReserva";
import { ApiError } from "../services/http";
import type { FinestraDto } from "../disponibilitat";
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

const sessioCoord: SessioDto = {
  ...sessioResp,
  user_id: "u2",
  role: "coordinator",
  user_name: "Carla",
};

const finestresSempre: FinestraDto[] = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
  weekday,
  start: "08:00",
  end: "22:00",
}));

const finestresLaborables: FinestraDto[] = [0, 1, 2, 3, 4].map((weekday) => ({
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

function muntar(
  reserves: Partial<ReservesApi> = {},
  sessio: SessioDto = sessioResp,
  inicial = reserva(),
  finestres: FinestraDto[] = finestresSempre,
) {
  localStorage.clear();
  const pinia = createPinia();
  setActivePinia(pinia);
  useSessioStore().iniciar(sessio);
  const Host = defineComponent({
    setup() {
      const oberta = ref<ReservaDto | null>(inicial);
      const reservesCarregades = ref<ReservaDto[]>([inicial]);
      const error = ref("");
      const errorDetall = ref("");
      const okReprogramacio = ref("");
      let tancat = false;
      const reprogramacio = useReprogramacioReserva({
        reservaEnDetall: () => oberta.value,
        reservesCarregades,
        error,
        errorDetall,
        okReprogramacio,
        mostrarError: (text) => {
          okReprogramacio.value = "";
          error.value = text;
        },
        mostrarOkReprogramacio: (text) => {
          error.value = "";
          okReprogramacio.value = text;
        },
        tancarModal: () => {
          tancat = true;
          oberta.value = null;
        },
        finestresDe: () => finestres,
      });
      return {
        ...reprogramacio,
        oberta,
        reservesCarregades,
        error,
        okReprogramacio,
        tancat: () => tancat,
      };
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
          anular: async () => reserva(),
          reprogramar: async (_token, id, input) =>
            reserva({ id, starts_at: input.starts_at, ends_at: input.ends_at }),
          ...reserves,
        } satisfies ReservesApi,
      },
    },
  });
}

describe("useReprogramacioReserva", () => {
  it("el responsable mou la reserva i avisa que s’ha avisat el coordinador", async () => {
    let enviat: { id: string; starts_at: string; ends_at: string } | null = null;
    const wrapper = muntar({
      reprogramar: async (_token, id, input) => {
        enviat = { id, starts_at: input.starts_at, ends_at: input.ends_at };
        return reserva({ id, starts_at: input.starts_at, ends_at: input.ends_at });
      },
    });
    expect(wrapper.vm.esReservaMovible("r1")).toBe(true);
    expect(wrapper.vm.reprogramacioAmbAvis).toBe(true);
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
    expect(wrapper.vm.okReprogramacio).toContain("avisat el coordinador");
    expect(wrapper.vm.tancat()).toBe(true);
    expect(wrapper.vm.reservesCarregades[0].starts_at).toBe("2026-09-08T10:00:00Z");
  });

  it("el coordinador mou la seva reserva sense avís", async () => {
    const wrapper = muntar({}, sessioCoord, reserva({ mine: true }));
    expect(wrapper.vm.reprogramacioAmbAvis).toBe(false);
    const moguda = await wrapper.vm.moureReserva(
      "r1",
      Temporal.ZonedDateTime.from("2026-09-09T10:00:00+02:00[Europe/Madrid]"),
      Temporal.ZonedDateTime.from("2026-09-09T10:30:00+02:00[Europe/Madrid]"),
    );
    expect(moguda?.starts_at).toBe("2026-09-09T08:00:00Z");
    expect(wrapper.vm.okReprogramacio).toBe("");
    expect(wrapper.vm.tancat()).toBe(true);
  });

  it("no mou una reserva que el coordinador no ha fet", async () => {
    let cridat = false;
    const wrapper = muntar(
      {
        reprogramar: async () => {
          cridat = true;
          return reserva();
        },
      },
      sessioCoord,
      reserva({ mine: false }),
    );
    expect(wrapper.vm.esReservaMovible("r1")).toBe(false);
    expect(wrapper.vm.potReprogramar).toBe(false);
    const moguda = await wrapper.vm.moureReserva(
      "r1",
      Temporal.ZonedDateTime.from("2026-09-08T12:00:00+02:00[Europe/Madrid]"),
      Temporal.ZonedDateTime.from("2026-09-08T12:30:00+02:00[Europe/Madrid]"),
    );
    expect(moguda).toBeNull();
    expect(cridat).toBe(false);
    expect(wrapper.vm.error).toContain("No pots reprogramar");
  });

  it("rebutja un dia tancat i una hora fora de l’horari", async () => {
    let cridat = false;
    const wrapper = muntar(
      {
        reprogramar: async () => {
          cridat = true;
          return reserva();
        },
      },
      sessioResp,
      reserva(),
      finestresLaborables,
    );
    const diumenge = await wrapper.vm.moureReserva(
      "r1",
      Temporal.ZonedDateTime.from("2026-09-13T18:00:00+02:00[Europe/Madrid]"),
      Temporal.ZonedDateTime.from("2026-09-13T18:30:00+02:00[Europe/Madrid]"),
    );
    expect(diumenge).toBeNull();
    expect(wrapper.vm.error).toContain("no és accessible");
    const mati = await wrapper.vm.moureReserva(
      "r1",
      Temporal.ZonedDateTime.from("2026-09-08T10:00:00+02:00[Europe/Madrid]"),
      Temporal.ZonedDateTime.from("2026-09-08T10:30:00+02:00[Europe/Madrid]"),
    );
    expect(mati).toBeNull();
    expect(wrapper.vm.error).toContain("fora de l’horari");
    expect(cridat).toBe(false);
  });

  it("no crida l’API si l’interval no canvia", async () => {
    let cridat = false;
    const wrapper = muntar({
      reprogramar: async () => {
        cridat = true;
        return reserva();
      },
    });
    const moguda = await wrapper.vm.moureReserva(
      "r1",
      Temporal.ZonedDateTime.from("2026-09-08T10:00:00+02:00[Europe/Madrid]"),
      Temporal.ZonedDateTime.from("2026-09-08T10:30:00+02:00[Europe/Madrid]"),
    );
    expect(moguda?.id).toBe("r1");
    expect(cridat).toBe(false);
    expect(wrapper.vm.tancat()).toBe(false);
  });

  it("avisa si el nou interval ja està ocupat", async () => {
    const wrapper = muntar({
      reprogramar: async () => {
        throw new ApiError("ocupat", 409);
      },
    });
    const moguda = await wrapper.vm.moureReserva(
      "r1",
      Temporal.ZonedDateTime.from("2026-09-08T12:00:00+02:00[Europe/Madrid]"),
      Temporal.ZonedDateTime.from("2026-09-08T12:30:00+02:00[Europe/Madrid]"),
    );
    expect(moguda).toBeNull();
    expect(wrapper.vm.error).toContain("ocupat");
    expect(wrapper.vm.tancat()).toBe(false);
    expect(wrapper.vm.okReprogramacio).toBe("");
  });
});
