import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { defineComponent } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import { useAcceptaInvitacio } from "./useAcceptaInvitacio";
import { ApiError, identityApiKey, type IdentityApi, type SessioDto } from "../services/identitat";
import { useSessioStore } from "../stores/sessio";

const sessioCoord: SessioDto = {
  token: "tok-coord",
  entity_id: "e1",
  user_id: "u2",
  membership_id: "m2",
  role: "coordinator",
  entity_name: "AAVV Barri A",
  user_name: "Carla",
  typology: "associació de veïns",
};

function identityBase(api: Partial<IdentityApi>): IdentityApi {
  return {
    registrar: async () => sessioCoord,
    iniciarSessio: async () => sessioCoord,
    obtenirSessio: async () => sessioCoord,
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
    acceptarInvitacio: async () => sessioCoord,
    ...api,
  };
}

async function muntar(api: Partial<IdentityApi>) {
  localStorage.clear();
  const pinia = createPinia();
  setActivePinia(pinia);
  const Host = defineComponent({
    setup: () => useAcceptaInvitacio(),
    template: "<div />",
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "inici", component: { template: "<div>inici</div>" } },
      { path: "/invitar/:token", name: "acceptar-invitacio", component: Host },
    ],
  });
  await router.push("/invitar/token-convidat");
  await router.isReady();
  const wrapper = mount(Host, {
    global: {
      plugins: [pinia, router],
      provide: { [identityApiKey as symbol]: identityBase(api) },
    },
  });
  await flushPromises();
  return { wrapper, router, sessio: useSessioStore() };
}

describe("useAcceptaInvitacio", () => {
  it("carrega el nom de l’entitat i inicia sessió en acceptar", async () => {
    const { wrapper, router, sessio } = await muntar({});
    expect(wrapper.vm.preview?.entity_name).toBe("AAVV Barri A");
    expect(wrapper.vm.preview?.email).toBe("carla@example.com");
    wrapper.vm.camps.name = "Carla";
    wrapper.vm.camps.password = "secret123";
    await wrapper.vm.enviar();
    await flushPromises();
    expect(sessio.iniciada).toBe(true);
    expect(sessio.role).toBe("coordinator");
    expect(router.currentRoute.value.name).toBe("inici");
  });

  it("mostra error si la invitació no existeix", async () => {
    const { wrapper } = await muntar({
      obtenirInvitacio: async () => {
        throw new ApiError("aquesta invitació no existeix", 404);
      },
    });
    expect(wrapper.vm.errorCarrega).toContain("no existeix");
    expect(wrapper.vm.preview).toBeNull();
  });
});
