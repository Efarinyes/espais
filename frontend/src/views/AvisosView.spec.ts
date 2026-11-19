import { afterEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { flushPromises, mount } from "@vue/test-utils";

import AvisosView from "./AvisosView.vue";
import { avisosApiKey, type AvisDto, type AvisosApi } from "../services/avisos";
import type { SessioDto } from "../services/identitat";
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

function avis(overrides: Partial<AvisDto> = {}): AvisDto {
  return {
    id: "n1",
    type: "reservation_rescheduled",
    reservation_id: "r1",
    entity_name: "AAVV Barri A",
    space_name: "Sala 1",
    space_id: "s1",
    starts_at: "2026-09-08T08:00:00Z",
    ends_at: "2026-09-08T09:00:00Z",
    new_starts_at: "2026-09-09T16:00:00Z",
    new_ends_at: "2026-09-09T17:00:00Z",
    changes: ["date", "start_time", "end_time"],
    responsible_name: "Anna",
    reason: "acte municipal",
    read_at: null,
    created_at: "2026-09-08T10:00:00Z",
    ...overrides,
  };
}

async function muntar(llista: AvisDto[], path = "/avisos", api: Partial<AvisosApi> = {}) {
  localStorage.clear();
  const pinia = createPinia();
  setActivePinia(pinia);
  useSessioStore().iniciar(sessioCoord);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/avisos", name: "avisos", component: AvisosView },
      { path: "/calendari", name: "calendari", component: { template: "<div />" } },
    ],
  });
  await router.push(path);
  await router.isReady();
  const marcats: string[] = [];
  const wrapper = mount(AvisosView, {
    attachTo: document.body,
    global: {
      plugins: [pinia, router],
      provide: {
        [avisosApiKey as symbol]: {
          llistar: async () => llista,
          marcarLlegit: async (_token, id) => {
            marcats.push(id);
            const actual = llista.find((item) => item.id === id) ?? llista[0];
            return { ...actual, read_at: "2026-09-08T12:00:00Z" };
          },
          arxivar: async () => undefined,
          ...api,
        } satisfies AvisosApi,
      },
    },
  });
  await flushPromises();
  return { wrapper, marcats, router };
}

describe("AvisosView", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("explica que no hi ha avisos", async () => {
    const { wrapper } = await muntar([]);
    expect(wrapper.text()).toContain("No tens avisos");
    expect(wrapper.find("ul[aria-label='Avisos']").exists()).toBe(false);
  });

  it("distingeix una modificació d’una anul·lació amb text, no només amb color", async () => {
    const { wrapper } = await muntar([
      avis({ id: "n1" }),
      avis({ id: "n2", type: "reservation_cancelled", new_starts_at: null, new_ends_at: null, changes: [] }),
    ]);
    const targetes = wrapper.findAll("article");
    expect(targetes[0].text()).toContain("Modificada");
    expect(targetes[0].text()).toContain("Reserva modificada: Sala 1");
    expect(targetes[0].text()).toContain("Aquesta reserva ha estat modificada.");
    expect(targetes[0].text()).toContain("Nou horari:");
    expect(targetes[1].text()).toContain("Anul·lada");
    expect(targetes[1].text()).toContain("Reserva anul·lada: Sala 1");
    expect(targetes[1].text()).toContain("Aquesta reserva ha estat anul·lada.");
    expect(targetes[1].text()).toContain("Horari original:");
    expect(targetes[1].text()).not.toContain("Nou horari");
  });

  it("distingeix els avisos llegits dels no llegits", async () => {
    const { wrapper } = await muntar([avis({ id: "n1" }), avis({ id: "n2", read_at: "2026-09-08T11:00:00Z" })]);
    const [pendent, llegit] = wrapper.findAll("article");
    expect(pendent.attributes("data-llegit")).toBe("false");
    expect(pendent.text()).toContain("No llegit");
    expect(pendent.classes()).toContain("border-primary");
    expect(llegit.attributes("data-llegit")).toBe("true");
    expect(llegit.text()).not.toContain("No llegit");
    expect(llegit.text()).toContain("Llegit");
    expect(llegit.find("button[aria-label^='Arxiva']").exists()).toBe(true);
    expect(pendent.find("button[aria-label^='Arxiva']").exists()).toBe(false);
  });

  it("mostrar la llista no marca res com a llegit: només obrir l’avís", async () => {
    const { wrapper, marcats } = await muntar([avis()]);
    expect(marcats).toEqual([]);
    expect(wrapper.get("article").attributes("data-llegit")).toBe("false");
    await wrapper.get("article button[aria-expanded]").trigger("click");
    await flushPromises();
    expect(marcats).toEqual(["n1"]);
    expect(wrapper.get("article").attributes("data-llegit")).toBe("true");
  });

  it("en obrir mostra què ha canviat, qui ho ha fet i el motiu", async () => {
    const { wrapper } = await muntar([avis()]);
    expect(wrapper.text()).not.toContain("Ha canviat el dia");
    await wrapper.get("article button[aria-expanded]").trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("Ha canviat el dia, l’hora d’inici i l’hora de fi.");
    expect(wrapper.text()).toContain("Ho ha fet Anna. Motiu: acte municipal.");
  });

  it("una reserva modificada porta un enllaç al calendari, el dia nou i l’espai", async () => {
    const { wrapper } = await muntar([avis()]);
    const enllac = wrapper.get("a");
    expect(enllac.text()).toBe("Veure la reserva");
    expect(enllac.attributes("href")).toBe("/calendari?data=2026-09-09&espai=s1");
    expect(enllac.classes()).toContain("min-h-11");
  });

  it("una reserva anul·lada no té enllaç, perquè ja no surt al calendari", async () => {
    const { wrapper } = await muntar([
      avis({ type: "reservation_cancelled", new_starts_at: null, new_ends_at: null, changes: [] }),
    ]);
    expect(wrapper.find("a").exists()).toBe(false);
  });

  it("una notificació del dispositiu obre l’avís i el deixa llegit dins d’Espais", async () => {
    const { wrapper, marcats } = await muntar([avis({ id: "n1" }), avis({ id: "n2" })], "/avisos?avis=n2");
    expect(marcats).toEqual(["n2"]);
    const targetes = wrapper.findAll("article");
    expect(targetes[0].attributes("data-llegit")).toBe("false");
    expect(targetes[1].attributes("data-llegit")).toBe("true");
    expect(targetes[1].get("button[aria-expanded]").attributes("aria-expanded")).toBe("true");
  });

  it("un enllaç a un avís que ja no existeix no trenca la safata", async () => {
    const { wrapper, marcats } = await muntar([avis()], "/avisos?avis=inexistent");
    expect(marcats).toEqual([]);
    expect(wrapper.findAll("article")).toHaveLength(1);
  });

  it("mostra l’error si no es poden carregar", async () => {
    const { wrapper } = await muntar([], "/avisos", {
      llistar: async () => {
        throw new Error("xarxa");
      },
    });
    expect(wrapper.get("[role='alert']").text()).toContain("No s’han pogut carregar els avisos.");
  });

  it("pensada per al mòbil: una columna, targetes de tota l’amplada i botons de 44 px", async () => {
    const { wrapper } = await muntar([avis({ read_at: "2026-09-08T11:00:00Z" })]);
    expect(wrapper.get("main").classes()).toEqual(expect.arrayContaining(["w-full", "max-w-md"]));
    expect(wrapper.get("article button[aria-expanded]").classes()).toEqual(
      expect.arrayContaining(["w-full", "min-h-11"]),
    );
    for (const boto of wrapper.findAll("article .card-actions .btn")) {
      expect(boto.classes()).toContain("min-h-11");
    }
  });

  it("no ofereix push si no hi ha cap servei de push disponible", async () => {
    const { wrapper } = await muntar([avis()]);
    expect(wrapper.find("[data-activa-push]").exists()).toBe(false);
  });
});
