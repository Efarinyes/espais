import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { flushPromises, mount } from "@vue/test-utils";

import { ApiError } from "../services/identitat";
import { espaisApiKey, type EspaisApi } from "../services/espais";
import { finestresPerDefecte } from "../disponibilitat";
import { useSessioStore } from "../stores/sessio";
import EspaisView from "./EspaisView.vue";

const apiBuit: EspaisApi = {
  llistar: async () => [],
  obtenir: async () => ({
    id: "s1",
    entity_id: "e1",
    name: "Sala 1",
    capacity: 10,
    equipment: null,
    active: true,
    windows: finestresPerDefecte(),
  }),
  crear: async () => ({
    id: "s1",
    entity_id: "e1",
    name: "Sala 1",
    capacity: 10,
    equipment: null,
    active: true,
    windows: finestresPerDefecte(),
  }),
  actualitzar: async () => ({
    id: "s1",
    entity_id: "e1",
    name: "Sala 1",
    capacity: 10,
    equipment: null,
    active: true,
    windows: finestresPerDefecte(),
  }),
};

function muntar(api: EspaisApi, role: "responsible" | "coordinator" = "responsible") {
  localStorage.clear();
  const pinia = createPinia();
  setActivePinia(pinia);
  useSessioStore().iniciar({
    token: "t",
    entity_id: "e1",
    user_id: "u1",
    role,
    entity_name: "AAVV Barri A",
    user_name: role === "responsible" ? "Anna" : "Carla",
    typology: "associació de veïns",
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/espais", name: "espais", component: EspaisView },
      { path: "/espais/nou", name: "espai-nou", component: { template: "<div />" } },
      { path: "/espais/:id", name: "espai-editar", component: { template: "<div />" } },
      { path: "/calendari", name: "calendari", component: { template: "<div />" } },
      { path: "/analisi", name: "analisi", component: { template: "<div />" } },
    ],
  });
  return mount(EspaisView, {
    global: {
      plugins: [pinia, router],
      provide: { [espaisApiKey as symbol]: api },
    },
  });
}

describe("EspaisView", () => {
  it("mostra l’empty state només quan la llista és buida", async () => {
    const wrapper = muntar(apiBuit);
    await flushPromises();
    expect(wrapper.text()).toContain("Encara no heu definit cap espai");
    expect(wrapper.text()).toContain("Espais de AAVV Barri A");
    expect(wrapper.get("a[href='/espais/nou']").text()).toContain("Defineix el primer espai");
    expect(wrapper.text()).not.toContain("Convida coordinadors");
    expect(wrapper.find("#buit-espais").exists()).toBe(true);
  });

  it("mostra l’error i no l’empty state si la llista falla", async () => {
    const wrapper = muntar({
      ...apiBuit,
      llistar: async () => {
        throw new ApiError("No s’han pogut carregar els espais.", 500);
      },
    });
    await flushPromises();
    expect(wrapper.text()).toContain("No s’han pogut carregar els espais.");
    expect(wrapper.text()).not.toContain("Encara no heu definit cap espai");
  });

  it("mostra l’equipament o el missatge de buit a cada targeta", async () => {
    const wrapper = muntar({
      ...apiBuit,
      llistar: async () => [
        {
          id: "s1",
          entity_id: "e1",
          name: "Sala 1",
          capacity: 10,
          equipment: "cadires",
          active: true,
          windows: finestresPerDefecte(),
        },
        {
          id: "s2",
          entity_id: "e1",
          name: "Sala 2",
          capacity: 8,
          equipment: null,
          active: true,
          windows: finestresPerDefecte(),
        },
      ],
    });
    await flushPromises();
    expect(wrapper.text()).toContain("Equipament: cadires");
    expect(wrapper.text()).toContain("Aquest espai no té equipament");
    expect(wrapper.text()).toContain("Disponibilitat:");
    expect(wrapper.text()).toContain("Editar");
    expect(wrapper.find("#buit-espais").exists()).toBe(false);
    expect(wrapper.get("a[href='/espais/nou']").text()).toContain("Afegeix un espai");
    expect(wrapper.get('a[href="/calendari"]').exists()).toBe(true);
    expect(wrapper.find('a[href="/calendari?espai=s1"]').exists()).toBe(false);
  });

  it("no deixa el coordinador definir ni afegir espais", async () => {
    const wrapper = muntar(apiBuit, "coordinator");
    await flushPromises();
    expect(wrapper.text()).toContain("Encara no hi ha espais");
    expect(wrapper.text()).not.toContain("Defineix el primer espai");
    expect(wrapper.text()).not.toContain("Afegeix un espai");
  });

  it("no mostra Afegeix un espai al coordinador si ja n’hi ha", async () => {
    const wrapper = muntar(
      {
        ...apiBuit,
        llistar: async () => [
          {
            id: "s1",
            entity_id: "e1",
            name: "Sala 1",
            capacity: 10,
            equipment: null,
            active: true,
            windows: finestresPerDefecte(),
          },
        ],
      },
      "coordinator",
    );
    await flushPromises();
    expect(wrapper.text()).toContain("Sala 1");
    expect(wrapper.text()).not.toContain("Afegeix un espai");
    expect(wrapper.text()).not.toContain("Editar");
    expect(wrapper.get('a[href="/calendari?espai=s1"]').text()).toContain("Sala 1");
  });
});
