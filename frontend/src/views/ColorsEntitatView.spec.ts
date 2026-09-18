import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { flushPromises, mount } from "@vue/test-utils";

import { identityApiKey, type IdentityApi } from "../services/identitat";
import type { SessioDto } from "../services/identitat";
import { useSessioStore } from "../stores/sessio";
import ColorsEntitatView from "./ColorsEntitatView.vue";

const sessioAnna: SessioDto = {
  token: "t",
  entity_id: "e1",
  user_id: "u1",
  role: "responsible",
  entity_name: "AAVV Barri A",
  user_name: "Anna",
  typology: "associació de veïns",
};

const identityBuit: IdentityApi = {
  registrar: async () => sessioAnna,
  iniciarSessio: async () => sessioAnna,
  obtenirSessio: async () => sessioAnna,
  actualitzarPaleta: async (_token, palette) => ({ palette }),
  convidarCoordinador: async () => ({
    email: "carla@example.com",
    accept_url: "/invitar/token-convidat",
    expires_at: "2026-09-22T12:00:00+00:00",
  }),
  obtenirInvitacio: async () => ({
    email: "carla@example.com",
    entity_name: "AAVV Barri A",
  }),
  acceptarInvitacio: async () => sessioAnna,
};

function muntar() {
  localStorage.clear();
  const pinia = createPinia();
  setActivePinia(pinia);
  useSessioStore().iniciar(sessioAnna);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/entitat/colors", name: "colors-entitat", component: ColorsEntitatView }],
  });
  return mount(ColorsEntitatView, {
    global: {
      plugins: [pinia, router],
      provide: { [identityApiKey as symbol]: identityBuit },
    },
  });
}

describe("ColorsEntitatView", () => {
  it("mostra els swatches i tanca el desplegable en triar", async () => {
    const wrapper = muntar();
    await flushPromises();
    expect(wrapper.get("h1").text()).toContain("Colors de l’entitat");
    expect(wrapper.get("#paleta-entitat").text()).toContain("Mar i cel");
    expect(wrapper.find("#paleta-entitat-opcions").exists()).toBe(false);
    await wrapper.get("#paleta-entitat").trigger("click");
    expect(wrapper.find("#paleta-entitat-opcions").exists()).toBe(true);
    expect(wrapper.get("#paleta-entitat-opcions").text()).toContain("Cítrics i sol");
    expect(wrapper.findAll("#paleta-entitat-opcions .rounded-full")).toHaveLength(12);
    expect(wrapper.get("#paleta-entitat-opcions").html()).toContain("rgb(249, 115, 22)");
    const citrics = wrapper
      .findAll("#paleta-entitat-opcions button")
      .find((boto) => boto.text().includes("Cítrics"));
    await citrics!.trigger("click");
    await flushPromises();
    expect(wrapper.find("#paleta-entitat-opcions").exists()).toBe(false);
    expect(wrapper.get("#paleta-entitat").text()).toContain("Cítrics i sol");
  });
});
