import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { flushPromises, mount } from "@vue/test-utils";

import { MISSATGE_PUSH_SW, escoltaPushDelServiceWorker, useComptadorAvisos } from "./useAvisos";
import { disparadorCalendariKey } from "../calendariLive";
import { avisosApiKey, type AvisDto, type AvisosApi } from "../services/avisos";
import type { SessioDto } from "../services/identitat";
import { useAvisosStore } from "../stores/avisos";
import { useSessioStore } from "../stores/sessio";

const sessioCoord: SessioDto = {
  token: "tok",
  entity_id: "e1",
  user_id: "u2",
  role: "coordinator",
  entity_name: "AAVV Barri A",
  user_name: "Carla",
  typology: null,
};

function avis(id: string, readAt: string | null = null): AvisDto {
  return {
    id,
    type: "reservation_rescheduled",
    reservation_id: "r1",
    entity_name: "AAVV Barri A",
    space_name: "Sala 1",
    starts_at: "2026-09-08T08:00:00Z",
    ends_at: "2026-09-08T09:00:00Z",
    responsible_name: "Anna",
    reason: null,
    new_starts_at: "2026-09-08T10:00:00Z",
    new_ends_at: "2026-09-08T11:00:00Z",
    read_at: readAt,
    created_at: "2026-09-08T10:00:00Z",
  };
}

class FontFalsa {
  oients = new Set<(event: MessageEvent) => void>();
  addEventListener(_type: "message", oient: (event: MessageEvent) => void) {
    this.oients.add(oient);
  }
  removeEventListener(_type: "message", oient: (event: MessageEvent) => void) {
    this.oients.delete(oient);
  }
  emet(data: unknown) {
    for (const oient of this.oients) {
      oient(new MessageEvent("message", { data }));
    }
  }
}

describe("escoltaPushDelServiceWorker", () => {
  it("només reacciona als missatges de push d’Espais", () => {
    const font = new FontFalsa();
    let crides = 0;
    const aturar = escoltaPushDelServiceWorker(() => (crides += 1), font);
    font.emet({ type: MISSATGE_PUSH_SW });
    font.emet({ type: "un-altre" });
    font.emet(null);
    expect(crides).toBe(1);
    aturar();
    font.emet({ type: MISSATGE_PUSH_SW });
    expect(crides).toBe(1);
    expect(font.oients.size).toBe(0);
  });

  it("sense Service Worker no fa res", () => {
    expect(() => escoltaPushDelServiceWorker(() => undefined, undefined)()).not.toThrow();
  });
});

describe("el comptador d’avisos i el push", () => {
  async function muntar(llistar: () => Promise<AvisDto[]>) {
    localStorage.clear();
    const pinia = createPinia();
    setActivePinia(pinia);
    useSessioStore().iniciar(sessioCoord);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/", component: { template: "<div />" } }],
    });
    await router.push("/");
    await router.isReady();
    const marcats: string[] = [];
    const Host = defineComponent({ setup: () => useComptadorAvisos(), template: "<div />" });
    const wrapper = mount(Host, {
      global: {
        plugins: [pinia, router],
        provide: {
          [avisosApiKey as symbol]: {
            llistar,
            marcarLlegit: async (_token, id) => {
              marcats.push(id);
              return avis(id, "2026-09-08T12:00:00Z");
            },
            arxivar: async () => undefined,
          } satisfies AvisosApi,
          [disparadorCalendariKey as symbol]: { iniciar: () => () => undefined },
        },
      },
    });
    await flushPromises();
    return { wrapper, marcats };
  }

  it("el comptador viu al store compartit i es buida en perdre la sessió", async () => {
    const { wrapper } = await muntar(async () => [avis("n1"), avis("n2", "2026-09-08T12:00:00Z")]);
    expect(wrapper.vm.noLlegits).toBe(1);
    expect(useAvisosStore().noLlegits).toBe(1);
    useSessioStore().sortir();
    await flushPromises();
    expect(useAvisosStore().avisos).toEqual([]);
    expect(wrapper.vm.noLlegits).toBe(0);
  });

  it("un avís nou del servidor puja el comptador sense marcar res com a llegit", async () => {
    let llista = [avis("n1")];
    const { wrapper, marcats } = await muntar(async () => llista);
    expect(wrapper.vm.noLlegits).toBe(1);
    llista = [avis("n2"), avis("n1")];
    await wrapper.vm.refrescar();
    expect(wrapper.vm.noLlegits).toBe(2);
    expect(marcats).toEqual([]);
    expect(useAvisosStore().avisos.every((item) => item.read_at === null)).toBe(true);
  });

  it("si el servidor falla, conserva l’últim estat conegut", async () => {
    let falla = false;
    const { wrapper } = await muntar(async () => {
      if (falla) {
        throw new Error("xarxa");
      }
      return [avis("n1")];
    });
    falla = true;
    await wrapper.vm.refrescar();
    expect(wrapper.vm.noLlegits).toBe(1);
  });
});
