import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { mount } from "@vue/test-utils";

import { useAvisos } from "./useAvisos";
import { avisosApiKey, titolAvis, type AvisDto, type AvisosApi } from "../services/avisos";
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

function avis(overrides: Partial<AvisDto> = {}): AvisDto {
  return {
    id: "n1",
    type: "reservation_cancelled",
    reservation_id: "r1",
    entity_name: "AAVV Barri A",
    space_name: "Sala 1",
    starts_at: "2026-09-08T08:00:00Z",
    ends_at: "2026-09-08T09:00:00Z",
    responsible_name: "Anna",
    reason: "canvi de sala",
    new_starts_at: null,
    new_ends_at: null,
    read_at: null,
    created_at: "2026-09-08T10:00:00Z",
    ...overrides,
  };
}

async function muntar(api: Partial<AvisosApi> = {}) {
  localStorage.clear();
  const pinia = createPinia();
  setActivePinia(pinia);
  useSessioStore().iniciar(sessioCoord);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/avisos", name: "avisos", component: { template: "<div />" } }],
  });
  await router.push({ name: "avisos" });
  await router.isReady();
  const Host = defineComponent({
    setup: () => useAvisos(),
    template: "<div />",
  });
  return mount(Host, {
    global: {
      plugins: [pinia, router],
      provide: {
        [avisosApiKey as symbol]: {
          llistar: async () => [avis()],
          marcarLlegit: async (_token, id) => avis({ id, read_at: "2026-09-08T11:00:00Z" }),
          ...api,
        } satisfies AvisosApi,
      },
    },
  });
}

describe("useAvisos", () => {
  it("carrega avisos i compta els no llegits", async () => {
    const wrapper = await muntar();
    await wrapper.vm.carregar();
    expect(wrapper.vm.avisos).toHaveLength(1);
    expect(wrapper.vm.noLlegits).toBe(1);
  });

  it("marca com a llegit en obrir", async () => {
    let marcat: string | null = null;
    const wrapper = await muntar({
      marcarLlegit: async (_token, id) => {
        marcat = id;
        return avis({ id, read_at: "2026-09-08T11:00:00Z" });
      },
    });
    await wrapper.vm.carregar();
    await wrapper.vm.obrir("n1");
    expect(marcat).toBe("n1");
    expect(wrapper.vm.noLlegits).toBe(0);
    expect(wrapper.vm.seleccionat).toBe("n1");
  });

  it("distingueix anul·lada i reprogramada", () => {
    expect(titolAvis(avis())).toBe("Reserva anul·lada: Sala 1");
    expect(titolAvis(avis({ type: "reservation_rescheduled" }))).toBe("Reserva reprogramada: Sala 1");
  });

  it("empty: cap avís", async () => {
    const wrapper = await muntar({ llistar: async () => [] });
    await wrapper.vm.carregar();
    expect(wrapper.vm.avisos).toEqual([]);
    expect(wrapper.vm.noLlegits).toBe(0);
  });
});
