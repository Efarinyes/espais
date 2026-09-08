import { describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import { mount } from "@vue/test-utils";

import type { EspaiDto } from "../services/espais";
import { finestresPerDefecte } from "../disponibilitat";
import EspaiTargeta from "./EspaiTargeta.vue";

const base: EspaiDto = {
  id: "s1",
  entity_id: "e1",
  name: "Sala Pau Casals",
  capacity: 40,
  equipment: null,
  active: true,
  windows: finestresPerDefecte(),
};

function muntar(espai: EspaiDto, potEditar = false) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/espais/:id", name: "espai-editar", component: { template: "<div />" } },
      { path: "/calendari", name: "calendari", component: { template: "<div />" } },
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
    expect(wrapper.text()).not.toContain("Reservar");
    expect(wrapper.find('a[href="/calendari?espai=s1"]').exists()).toBe(false);
  });

  it("obre el calendari de l’espai en clicar la targeta", () => {
    const wrapper = muntar(base);
    expect(wrapper.get('a[href="/calendari?espai=s1"]').text()).toContain("Sala Pau Casals");
    expect(wrapper.text()).toContain("Reservar");
  });

  it("mostra l’enllaç d’edició per al responsable", () => {
    const wrapper = muntar(base, true);
    expect(wrapper.get('a[href="/espais/s1"]').text()).toBe("Editar");
  });

  it("no mostra Editar si no es pot editar", () => {
    const wrapper = muntar(base, false);
    expect(wrapper.text()).not.toContain("Editar");
    expect(wrapper.find('a[href="/espais/s1"]').exists()).toBe(false);
  });

  it("mostra el resum de disponibilitat", () => {
    const wrapper = muntar(base);
    expect(wrapper.text()).toContain("Disponibilitat: Tots els dies 08:00–22:00");
  });

  it("mostra Sense horari si la llista de finestres és buida", () => {
    const wrapper = muntar({ ...base, windows: [] });
    expect(wrapper.text()).toContain("Disponibilitat: Sense horari");
  });
});
