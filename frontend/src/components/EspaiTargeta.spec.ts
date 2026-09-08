import { describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import { mount } from "@vue/test-utils";

import type { EspaiDto } from "../services/espais";
import EspaiTargeta from "./EspaiTargeta.vue";

const base: EspaiDto = {
  id: "s1",
  entity_id: "e1",
  name: "Sala Pau Casals",
  capacity: 40,
  equipment: null,
  active: true,
};

function muntar(espai: EspaiDto, potEditar = false) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/espais/:id", name: "espai-editar", component: { template: "<div />" } },
    ],
  });
  return mount(EspaiTargeta, {
    props: { espai, potEditar },
    global: { plugins: [router] },
  });
}

describe("EspaiTargeta", () => {
  it("mostra l’equipament quan n’hi ha", () => {
    const wrapper = muntar({ ...base, equipment: "piano, llums" });
    expect(wrapper.text()).toContain("Sala Pau Casals");
    expect(wrapper.text()).toContain("Aforament: 40");
    expect(wrapper.text()).toContain("Equipament: piano, llums");
    expect(wrapper.text()).not.toContain("Aquest espai no té equipament");
  });

  it("mostra el missatge si no hi ha equipament", () => {
    const wrapper = muntar({ ...base, equipment: null });
    expect(wrapper.text()).toContain("Aquest espai no té equipament");
    expect(wrapper.text()).not.toContain("Equipament:");
  });

  it("tracta l’equipament en blanc com a buit", () => {
    const wrapper = muntar({ ...base, equipment: "   " });
    expect(wrapper.text()).toContain("Aquest espai no té equipament");
  });

  it("marca l’espai inactiu i el deixa visible", () => {
    const wrapper = muntar({ ...base, active: false });
    expect(wrapper.text()).toContain("Inactiu");
  });

  it("mostra l’enllaç d’edició per al responsable", () => {
    const wrapper = muntar(base, true);
    expect(wrapper.get("a").text()).toBe("Editar");
  });

  it("no mostra Editar si no es pot editar", () => {
    const wrapper = muntar(base, false);
    expect(wrapper.text()).not.toContain("Editar");
    expect(wrapper.find("a").exists()).toBe(false);
  });
});
