import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { mount } from "@vue/test-utils";

import { identityApiKey, type IdentityApi, type SessioDto } from "../services/identitat";
import RegistreView from "./RegistreView.vue";

const sessioBuida: SessioDto = {
  token: "",
  entity_id: "",
  user_id: "",
  role: "responsible",
  entity_name: "",
  user_name: "",
  typology: null,
};

const api: IdentityApi = {
  registrar: async () => sessioBuida,
  iniciarSessio: async () => sessioBuida,
  obtenirSessio: async () => sessioBuida,
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
  acceptarInvitacio: async () => sessioBuida,
};

describe("RegistreView", () => {
  it("mostra les etiquetes del formulari en català", async () => {
    localStorage.clear();
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/registre", component: RegistreView },
        { path: "/iniciar-sessio", component: { template: "<div />" } },
      ],
    });
    await router.push("/registre");
    const wrapper = mount(RegistreView, {
      global: {
        plugins: [pinia, router],
        provide: { [identityApiKey as symbol]: api },
      },
    });
    expect(wrapper.text()).toContain("Nom de l’entitat");
    expect(wrapper.text()).toContain("Nom del responsable");
    expect(wrapper.get("label[for='entity_name']").text()).toContain("entitat");
  });

  it("associa els errors de camp amb aria-describedby", async () => {
    localStorage.clear();
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/registre", component: RegistreView },
        { path: "/iniciar-sessio", component: { template: "<div />" } },
      ],
    });
    await router.push("/registre");
    const wrapper = mount(RegistreView, {
      global: {
        plugins: [pinia, router],
        provide: { [identityApiKey as symbol]: api },
      },
    });
    expect(wrapper.get("#email").attributes("aria-describedby")).toBeUndefined();
    await wrapper.get("form").trigger("submit");
    expect(wrapper.get("#email").attributes("aria-invalid")).toBe("true");
    expect(wrapper.get("#email").attributes("aria-describedby")).toBe("email-error");
    expect(wrapper.get("#email-error").text().length).toBeGreaterThan(0);
    expect(wrapper.get("#entity_name").attributes("aria-describedby")).toBe("entity_name-error");
    expect(wrapper.get("#password").attributes("aria-describedby")).toBe("password-error");
    await wrapper.get("#email").setValue("anna@example.com");
    await wrapper.get("form").trigger("submit");
    expect(wrapper.get("#email").attributes("aria-describedby")).toBeUndefined();
    expect(wrapper.find("#email-error").exists()).toBe(false);
  });
});
