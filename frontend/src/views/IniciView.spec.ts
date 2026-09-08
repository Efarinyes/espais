import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { flushPromises, mount } from "@vue/test-utils";

import type { SessioDto } from "../services/identitat";
import { espaisApiKey, type EspaisApi } from "../services/espais";
import { useSessioStore } from "../stores/sessio";
import IniciView from "./IniciView.vue";

const apiBuit: EspaisApi = {
  llistar: async () => [],
  crear: async () => ({
    id: "s1",
    entity_id: "e1",
    name: "Sala 1",
    capacity: 10,
    equipment: null,
    active: true,
  }),
};

function muntar(dto?: SessioDto, api: EspaisApi = apiBuit) {
  localStorage.clear();
  const pinia = createPinia();
  setActivePinia(pinia);
  if (dto) {
    useSessioStore().iniciar(dto);
  }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "inici", component: IniciView },
      { path: "/registre", name: "registre", component: { template: "<div />" } },
      { path: "/iniciar-sessio", name: "iniciar-sessio", component: { template: "<div />" } },
      { path: "/espais/nou", name: "espai-nou", component: { template: "<div />" } },
      { path: "/espais", name: "espais", component: { template: "<div />" } },
    ],
  });
  return mount(IniciView, {
    global: {
      plugins: [pinia, router],
      provide: { [espaisApiKey as symbol]: api },
    },
  });
}

const sessioAnna: SessioDto = {
  token: "t",
  entity_id: "e1",
  user_id: "u1",
  role: "responsible",
  entity_name: "AAVV Barri A",
  user_name: "Anna",
  typology: "associació de veïns",
};

describe("IniciView", () => {
  it("mostra el títol de l’app en català sense sessió", () => {
    const wrapper = muntar();
    expect(wrapper.text()).toContain("Espais");
    expect(wrapper.text()).toContain("gratuït");
    expect(wrapper.text()).toContain("Registra l’entitat");
    expect(wrapper.text()).toContain("Inicia sessió");
  });

  it("mostra l’empty state accionable quan no hi ha espais", async () => {
    const wrapper = muntar(sessioAnna);
    await flushPromises();
    expect(wrapper.text()).toContain("AAVV Barri A");
    expect(wrapper.text()).toContain("Defineix el primer espai");
    expect(wrapper.get("a[href='/espais/nou']").text()).toContain("Defineix el primer espai");
  });

  it("llista els espais de l’entitat quan n’hi ha", async () => {
    const wrapper = muntar(sessioAnna, {
      ...apiBuit,
      llistar: async () => [
        {
          id: "s1",
          entity_id: "e1",
          name: "Sala Pau Casals",
          capacity: 40,
          equipment: null,
          active: true,
        },
      ],
    });
    await flushPromises();
    expect(wrapper.text()).toContain("Sala Pau Casals");
    expect(wrapper.text()).toContain("Aforament: 40");
  });
});
