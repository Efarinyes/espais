import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { flushPromises, mount } from "@vue/test-utils";

import { ApiError } from "../services/identitat";
import { espaisApiKey, type EspaisApi } from "../services/espais";
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
  }),
  crear: async () => ({
    id: "s1",
    entity_id: "e1",
    name: "Sala 1",
    capacity: 10,
    equipment: null,
    active: true,
  }),
  actualitzar: async () => ({
    id: "s1",
    entity_id: "e1",
    name: "Sala 1",
    capacity: 10,
    equipment: null,
    active: true,
  }),
};

function muntar(api: EspaisApi) {
  localStorage.clear();
  const pinia = createPinia();
  setActivePinia(pinia);
  useSessioStore().iniciar({
    token: "t",
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
      { path: "/espais", name: "espais", component: EspaisView },
      { path: "/espais/nou", name: "espai-nou", component: { template: "<div />" } },
      { path: "/espais/:id", name: "espai-editar", component: { template: "<div />" } },
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
    expect(wrapper.get("a[href='/espais/nou']").text()).toContain("Defineix el primer espai");
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
        },
        {
          id: "s2",
          entity_id: "e1",
          name: "Sala 2",
          capacity: 8,
          equipment: null,
          active: true,
        },
      ],
    });
    await flushPromises();
    expect(wrapper.text()).toContain("Equipament: cadires");
    expect(wrapper.text()).toContain("Aquest espai no té equipament");
    expect(wrapper.text()).toContain("Editar");
    expect(wrapper.find("#buit-espais").exists()).toBe(false);
  });
});
