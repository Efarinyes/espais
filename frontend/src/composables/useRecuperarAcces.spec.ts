import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { defineComponent } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import { useRecuperarAcces } from "./useRecuperarAcces";
import { identityApiKey, type IdentityApi, type SessioDto } from "../services/identitat";
import { useSessioStore } from "../stores/sessio";

const sessioOk: SessioDto = {
  token: "tok-nou",
  entity_id: "e1",
  user_id: "u1",
  role: "responsible",
  entity_name: "AAVV Barri A",
  user_name: "Anna",
  typology: "associació de veïns",
};

function identity(api: Partial<IdentityApi> = {}): IdentityApi {
  return {
    registrar: async () => sessioOk,
    iniciarSessio: async () => sessioOk,
    obtenirSessio: async () => sessioOk,
    actualitzarPaleta: async (_token, palette) => ({ palette }),
    convidarCoordinador: async () => ({
      email: "carla@example.com",
      accept_url: "/invitar/token-convidat",
      expires_at: "2026-09-22T12:00:00+00:00",
      delivery: "unavailable",
    }),
    obtenirInvitacio: async () => ({
      email: "carla@example.com",
      entity_name: "AAVV Barri A",
    }),
    acceptarInvitacio: async () => sessioOk,
    tancarSessio: async () => undefined,
    demanarRecuperacio: async () => ({
      detall: "Si aquest correu té un compte, rebràs un enllaç per triar una contrasenya nova.",
    }),
    confirmarRecuperacio: async () => sessioOk,
    ...api,
  };
}

function muntar(api: Partial<IdentityApi> = {}) {
  localStorage.clear();
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/recuperar", name: "recuperar-acces", component: { template: "<div />" } },
      { path: "/espais", name: "espais", component: { template: "<div />" } },
    ],
  });
  const Host = defineComponent({
    setup: () => useRecuperarAcces(),
    template: "<div />",
  });
  const wrapper = mount(Host, {
    global: {
      plugins: [pinia, router],
      provide: { [identityApiKey as symbol]: identity(api) },
    },
  });
  return { wrapper, router };
}

describe("useRecuperarAcces", () => {
  it("demana l’enllaç i mostra el text genèric", async () => {
    window.location.hash = "";
    const { wrapper } = muntar();
    wrapper.vm.camps.email = "anna@example.com";
    await wrapper.vm.demanar();
    await flushPromises();
    expect(wrapper.vm.missatge).toContain("Si aquest correu té un compte");
    expect(wrapper.vm.calContrasenya).toBe(false);
  });

  it("llegeix el fragment, el treu de la barra i confirma la contrasenya", async () => {
    window.location.hash = "#token-secret";
    let rebut = "";
    const { wrapper, router } = muntar({
      confirmarRecuperacio: async (token) => {
        rebut = token;
        return sessioOk;
      },
    });
    expect(window.location.hash).toBe("");
    expect(wrapper.vm.calContrasenya).toBe(true);
    wrapper.vm.camps.password = "nova-clau";
    await wrapper.vm.confirmar();
    await flushPromises();
    expect(rebut).toBe("token-secret");
    expect(useSessioStore().token).toBe("tok-nou");
    expect(router.currentRoute.value.name).toBe("espais");
  });
});
