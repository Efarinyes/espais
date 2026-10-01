import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { mount } from "@vue/test-utils";

import App from "./App.vue";
import { disparadorCalendariKey } from "./calendariLive";
import { avisosApiKey, type AvisosApi } from "./services/avisos";
import { useSessioStore } from "./stores/sessio";
import type { SessioDto } from "./services/identitat";

const sessioResp: SessioDto = {
  token: "t",
  entity_id: "e1",
  user_id: "u1",
  role: "responsible",
  entity_name: "AAVV Barri A",
  user_name: "Anna",
  typology: "associació de veïns",
};

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
      { path: "/", name: "inici", component: { template: "<div />" } },
      { path: "/registre", name: "registre", component: { template: "<div />" } },
      { path: "/iniciar-sessio", name: "iniciar-sessio", component: { template: "<div />" } },
      { path: "/espais", name: "espais", component: { template: "<div />" } },
      { path: "/calendari", name: "calendari", component: { template: "<div />" } },
      { path: "/avisos", name: "avisos", component: { template: "<div />" } },
      { path: "/analisi", name: "analisi", component: { template: "<div />" } },
      { path: "/coordinadors/convidar", name: "convidar-coordinador", component: { template: "<div />" } },
    ],
  });
  const avisosApi: AvisosApi = {
    llistar: async () => [],
    marcarLlegit: async (_token, id) => ({
      id,
      type: "reservation_cancelled",
      reservation_id: "r1",
      entity_name: "AAVV Barri A",
      space_name: "Sala 1",
      starts_at: "2026-09-08T08:00:00Z",
      ends_at: "2026-09-08T09:00:00Z",
      new_starts_at: null,
      new_ends_at: null,
      responsible_name: "Anna",
      reason: null,
      read_at: "2026-09-08T11:00:00Z",
      created_at: "2026-09-08T10:00:00Z",
    }),
    arxivar: async () => undefined,
  };
  return mount(App, {
    global: {
      plugins: [pinia, router],
      provide: {
        [avisosApiKey as symbol]: avisosApi,
        [disparadorCalendariKey as symbol]: { iniciar: () => () => undefined },
      },
    },
  });
}

describe("App", () => {
  it("amb sessió el capçal només té el logo i el mode", () => {
    const wrapper = muntar(sessioResp);
    const capcal = wrapper.get("header");
    expect(capcal.text()).toContain("Espais");
    expect(capcal.text()).toContain("Clar");
    expect(capcal.text()).toContain("Fosc");
    expect(capcal.text()).not.toContain("Menú");
    expect(capcal.text()).not.toContain("Administració de");
    expect(capcal.text()).not.toContain("Coordinador");
    expect(capcal.text()).not.toContain("Calendari");
    expect(capcal.text()).not.toContain("Surt");
    expect(wrapper.find("nav[aria-label='Principal']").exists()).toBe(false);
    expect(wrapper.get("footer").text()).toContain("Eduard Farinyes");
    expect(wrapper.get("footer").text()).toContain("Codi obert");
    expect(wrapper.get("footer").text()).toContain("ús intern");
    expect(wrapper.get("footer").text()).not.toContain("gratuït");
  });

  it("el coordinador tampoc té insígnia ni menú al capçal", () => {
    const wrapper = muntar({ ...sessioResp, role: "coordinator", user_name: "Carla" });
    const capcal = wrapper.get("header");
    expect(capcal.text()).not.toContain("Coordinador");
    expect(capcal.text()).not.toContain("Responsable");
    expect(capcal.text()).not.toContain("Menú");
    expect(capcal.text()).not.toContain("Avisos");
    expect(wrapper.find("nav[aria-label='Principal']").exists()).toBe(false);
  });

  it("no mostra rol sense sessió i posa l’accés al capçal", () => {
    const wrapper = muntar();
    expect(wrapper.text()).not.toContain("Responsable");
    expect(wrapper.text()).not.toContain("Coordinador");
    expect(wrapper.find("nav[aria-label='Principal']").exists()).toBe(false);
    const acces = wrapper.get("nav[aria-label='Accés']");
    expect(acces.get("a[href='/iniciar-sessio']").text()).toContain("Inicia sessió");
    expect(acces.get("a[href='/registre']").text()).toContain("Registra l’entitat");
    expect(wrapper.get("footer").text()).toMatch(/© \d{4} Eduard Farinyes · Codi obert/);
  });

  it("mostra Clar i Fosc al capçal, sense paleta", () => {
    const wrapper = muntar();
    expect(wrapper.get("[aria-label='Mode de pantalla']").text()).toContain("Clar");
    expect(wrapper.get("[aria-label='Mode de pantalla']").text()).toContain("Fosc");
    expect(wrapper.find("#mode-clar").exists()).toBe(true);
    expect(wrapper.find("#mode-fosc").exists()).toBe(true);
    expect(wrapper.find("#paleta-aparenca").exists()).toBe(false);
    expect(wrapper.find("#paleta-entitat").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("Aparença");
    expect(wrapper.get("header").text()).not.toContain("Mar i cel");
  });
});
