import { afterEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { flushPromises, mount } from "@vue/test-utils";

import AvisosEnviatsView from "./AvisosEnviatsView.vue";
import { ApiError } from "../services/http";
import {
  avisosEnviatsApiKey,
  type AvisEnviatDto,
  type AvisosEnviatsApi,
} from "../services/avisosEnviats";
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

function enviat(overrides: Partial<AvisEnviatDto> = {}): AvisEnviatDto {
  return {
    id: "n1",
    type: "reservation_rescheduled",
    reservation_id: "r1",
    coordinator_name: "Carla",
    space_name: "Sala 1",
    starts_at: "2026-09-08T08:00:00Z",
    ends_at: "2026-09-08T09:00:00Z",
    new_starts_at: "2026-09-09T16:00:00Z",
    new_ends_at: "2026-09-09T17:00:00Z",
    changes: ["date", "start_time", "end_time"],
    reservation_status: "confirmed",
    created_at: "2026-09-08T10:00:00Z",
    read_at: null,
    ...overrides,
  };
}

function muntar(api: AvisosEnviatsApi["llistar"]) {
  localStorage.clear();
  const pinia = createPinia();
  setActivePinia(pinia);
  useSessioStore().iniciar(sessioResp);
  return mount(AvisosEnviatsView, {
    global: {
      plugins: [pinia],
      provide: { [avisosEnviatsApiKey as symbol]: { llistar: api } satisfies AvisosEnviatsApi },
    },
  });
}

describe("AvisosEnviatsView", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("explica que encara no hi ha cap avís", async () => {
    const wrapper = muntar(async () => []);
    await flushPromises();
    expect(wrapper.text()).toContain("Encara no has enviat cap avís");
  });

  it("diu si cada avís és pendent de lectura o llegit i quan", async () => {
    const wrapper = muntar(async () => [
      enviat({ id: "n1" }),
      enviat({
        id: "n2",
        type: "reservation_cancelled",
        new_starts_at: null,
        new_ends_at: null,
        changes: [],
        reservation_status: "cancelled",
        read_at: "2026-09-08T11:30:00Z",
      }),
    ]);
    await flushPromises();
    const [pendent, llegit] = wrapper.findAll("article");
    expect(pendent.attributes("data-llegit")).toBe("false");
    expect(pendent.text()).toContain("Modificada");
    expect(pendent.text()).toContain("Pendent de lectura");
    expect(pendent.text()).toContain("Coordinador: Carla");
    expect(pendent.text()).toContain("Nou horari:");
    expect(pendent.text()).toContain("Ha canviat el dia, l’hora d’inici i l’hora de fi.");
    expect(llegit.attributes("data-llegit")).toBe("true");
    expect(llegit.text()).toContain("Anul·lada");
    expect(llegit.text()).toMatch(/Llegit el /);
    expect(llegit.text()).not.toContain("Pendent de lectura");
    expect(llegit.text()).not.toContain("Nou horari");
    expect(wrapper.get("[role='status']").text()).toBe("1 avís pendent de lectura.");
  });

  it("resumeix quan tot s’ha llegit", async () => {
    const wrapper = muntar(async () => [enviat({ read_at: "2026-09-08T11:30:00Z" })]);
    await flushPromises();
    expect(wrapper.get("[role='status']").text()).toBe("Tots els avisos s’han llegit.");
  });

  it("deixa clar que el push no compta com a lectura", async () => {
    const wrapper = muntar(async () => []);
    await flushPromises();
    expect(wrapper.text()).toContain("una notificació al dispositiu no compta com a lectura");
  });

  it("mostra l’error del servidor", async () => {
    const wrapper = muntar(async () => {
      throw new ApiError("només el responsable", 403);
    });
    await flushPromises();
    expect(wrapper.get("[role='alert']").text()).toBe("només el responsable");
    expect(wrapper.text()).not.toContain("Encara no has enviat cap avís");
  });
});
