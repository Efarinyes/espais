import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { mount } from "@vue/test-utils";

import type { SessioDto } from "../services/identitat";
import { useSessioStore } from "../stores/sessio";
import IniciView from "./IniciView.vue";

function muntar(dto?: SessioDto) {
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
    ],
  });
  return mount(IniciView, { global: { plugins: [pinia, router] } });
}

describe("IniciView", () => {
  it("mostra el títol de l’app en català sense sessió", () => {
    const wrapper = muntar();
    expect(wrapper.text()).toContain("Espais");
    expect(wrapper.text()).toContain("gratuït");
    expect(wrapper.text()).toContain("Registra l’entitat");
    expect(wrapper.text()).toContain("Inicia sessió");
  });

  it("mostra l’empty state de l’entitat quan hi ha sessió", () => {
    const wrapper = muntar({
      token: "t",
      entity_id: "e1",
      user_id: "u1",
      role: "responsible",
      entity_name: "AAVV Barri A",
      user_name: "Anna",
      typology: "associació de veïns",
    });
    expect(wrapper.text()).toContain("AAVV Barri A");
    expect(wrapper.text()).toContain("Defineix el primer espai");
    expect(wrapper.text()).toContain("Els espais són vostres");
  });
});
