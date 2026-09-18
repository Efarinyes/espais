import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { defineComponent } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import { useConvidaCoordinador } from "./useConvidaCoordinador";
import { ApiError, identityApiKey, type IdentityApi, type SessioDto } from "../services/identitat";
import { useSessioStore } from "../stores/sessio";

const sessioOk: SessioDto = {
  token: "tok",
  entity_id: "e1",
  user_id: "u1",
  membership_id: "m1",
  role: "responsible",
  entity_name: "AAVV Barri A",
  user_name: "Anna",
  typology: "associació de veïns",
};

function muntar(api: Partial<IdentityApi>) {
  localStorage.clear();
  const pinia = createPinia();
  setActivePinia(pinia);
  useSessioStore().iniciar(sessioOk);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/coordinadors/convidar", name: "convidar-coordinador", component: { template: "<div />" } }],
  });
  const Host = defineComponent({
    setup: () => useConvidaCoordinador(),
    template: "<div />",
  });
  const wrapper = mount(Host, {
    global: {
      plugins: [pinia, router],
      provide: {
        [identityApiKey as symbol]: {
          registrar: async () => sessioOk,
          iniciarSessio: async () => sessioOk,
          obtenirSessio: async () => sessioOk,
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
          acceptarInvitacio: async () => sessioOk,
          ...api,
        } satisfies IdentityApi,
      },
    },
  });
  return wrapper;
}

describe("useConvidaCoordinador", () => {
  it("mostra l’enllaç copiable després de convidar", async () => {
    const wrapper = muntar({});
    wrapper.vm.camps.email = "carla@example.com";
    await wrapper.vm.enviar();
    await flushPromises();
    expect(wrapper.vm.acceptUrl).toBe("/invitar/token-convidat");
    expect(wrapper.vm.enllacComplet).toContain("/invitar/token-convidat");
    expect(wrapper.vm.errorGlobal).toBe("");
  });

  it("mostra error si l’email ja existeix", async () => {
    const wrapper = muntar({
      convidarCoordinador: async () => {
        throw new ApiError("aquest email ja està registrat", 409);
      },
    });
    wrapper.vm.camps.email = "anna@example.com";
    await wrapper.vm.enviar();
    await flushPromises();
    expect(wrapper.vm.errorGlobal).toContain("ja està registrat");
    expect(wrapper.vm.acceptUrl).toBe("");
  });
});
