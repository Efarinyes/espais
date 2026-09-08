import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { defineComponent } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import { useRegistre } from "./useRegistre";
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
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "inici", component: { template: "<div>inici</div>" } },
      { path: "/registre", name: "registre", component: { template: "<div />" } },
    ],
  });
  const Host = defineComponent({
    setup: () => useRegistre(),
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
  return { wrapper, router, sessio: useSessioStore() };
}

describe("useRegistre", () => {
  it("inicia sessió i navega a l’inici després d’un registre correcte", async () => {
    const { wrapper, router, sessio } = muntar({});
    await router.push("/registre");
    wrapper.vm.camps.entity_name = "AAVV Barri A";
    wrapper.vm.camps.responsible_name = "Anna";
    wrapper.vm.camps.email = "anna@example.com";
    wrapper.vm.camps.password = "secret123";
    await wrapper.vm.enviar();
    await flushPromises();
    expect(sessio.iniciada).toBe(true);
    expect(sessio.entityName).toBe("AAVV Barri A");
    expect(router.currentRoute.value.name).toBe("inici");
  });

  it("mostra error clar si l’email ja existeix", async () => {
    const { wrapper } = muntar({
      registrar: async () => {
        throw new ApiError("aquest email ja està registrat", 409);
      },
    });
    wrapper.vm.camps.entity_name = "AAVV";
    wrapper.vm.camps.responsible_name = "Anna";
    wrapper.vm.camps.email = "anna@example.com";
    wrapper.vm.camps.password = "secret123";
    await wrapper.vm.enviar();
    await flushPromises();
    expect(wrapper.vm.errorGlobal).toContain("ja està registrat");
    expect(wrapper.vm.errorGlobal).toContain("Inicia sessió");
  });
});
