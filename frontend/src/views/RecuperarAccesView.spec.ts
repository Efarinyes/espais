import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { flushPromises, mount } from "@vue/test-utils";

import { ApiError } from "../services/http";
import { identityApiKey, type IdentityApi, type SessioDto } from "../services/identitat";
import RecuperarAccesView from "./RecuperarAccesView.vue";

async function confirmacioCorrecta() {
  return { detall: "La contrasenya s’ha actualitzat correctament. Ara pots iniciar sessió." };
}

const sessio: SessioDto = {
  token: "t",
  entity_id: "e1",
  user_id: "u1",
  role: "responsible",
  entity_name: "AAVV Barri A",
  user_name: "Anna",
  typology: null,
};

const api: IdentityApi = {
  registrar: async () => sessio,
  iniciarSessio: async () => sessio,
  obtenirSessio: async () => sessio,
  actualitzarPaleta: async (_token, palette) => ({ palette }),
  convidarCoordinador: async () => ({
    email: "carla@example.com",
    accept_url: "/invitar/x",
    expires_at: "2026-09-22T12:00:00+00:00",
    delivery: "unavailable",
  }),
  obtenirInvitacio: async () => ({ email: "carla@example.com", entity_name: "AAVV Barri A" }),
  acceptarInvitacio: async () => sessio,
  tancarSessio: async () => undefined,
  demanarRecuperacio: async () => ({ detall: "Si aquest correu té un compte, rebràs un enllaç." }),
  confirmarRecuperacio: confirmacioCorrecta,
};

async function muntar() {
  localStorage.clear();
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/recuperar", component: RecuperarAccesView },
      { path: "/iniciar-sessio", component: { template: "<div />" } },
    ],
  });
  await router.push("/recuperar");
  return mount(RecuperarAccesView, {
    global: { plugins: [pinia, router], provide: { [identityApiKey as symbol]: api } },
  });
}

describe("RecuperarAccesView", () => {
  it("amb un enllaç caducat no demana contrasenya i ofereix un enllaç nou", async () => {
    window.location.hash = "#token-caducat";
    api.confirmarRecuperacio = async () => {
      throw new ApiError("Aquest enllaç no és vàlid o ha caducat. Demana’n un de nou.", 410);
    };
    const wrapper = await muntar();
    await wrapper.get("#password").setValue("nova-clau");
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(wrapper.get("[role='alert']").text()).toContain("no és vàlid o ha caducat");
    expect(wrapper.text()).not.toContain("Tria una contrasenya nova");
    expect(wrapper.find("#password").exists()).toBe(false);
    await wrapper.get("button").trigger("click");
    expect(wrapper.find("#email").exists()).toBe(true);
    api.confirmarRecuperacio = confirmacioCorrecta;
  });

  it("no pinta el token enlloc de la pàgina", async () => {
    window.location.hash = "#token-que-no-es-mostra";
    const wrapper = await muntar();
    expect(wrapper.find("#password").exists()).toBe(true);
    expect(wrapper.html()).not.toContain("token-que-no-es-mostra");
  });

  it("en acabar diu que ja es pot iniciar sessió i hi porta", async () => {
    window.location.hash = "#token-secret";
    const wrapper = await muntar();
    await wrapper.get("#password").setValue("nova-clau");
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(wrapper.get("[role='status']").text()).toBe(
      "La contrasenya s’ha actualitzat correctament. Ara pots iniciar sessió.",
    );
    const enllac = wrapper.get("a.btn[href='/iniciar-sessio']");
    expect(enllac.text()).toBe("Inicia sessió");
    expect(wrapper.find("form").exists()).toBe(false);
  });
});
