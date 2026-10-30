import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { defineComponent } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import { useIniciSessio } from "./useIniciSessio";
import { ApiError } from "../services/http";
import { identityApiKey, type IdentityApi, type SessioDto } from "../services/identitat";
import { useSessioStore } from "../stores/sessio";

const responsable: SessioDto = {
  token: "tok-resp",
  entity_id: "e1",
  user_id: "u1",
  role: "responsible",
  entity_name: "AAVV Barri A",
  user_name: "Anna",
  typology: null,
};

const coordinador: SessioDto = { ...responsable, token: "tok-coord", user_id: "u2", role: "coordinator", user_name: "Carla" };

async function muntar(iniciarSessio: IdentityApi["iniciarSessio"]) {
  localStorage.clear();
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "inici", component: { template: "<div />" } },
      { path: "/iniciar-sessio", name: "iniciar-sessio", component: { template: "<div />" } },
      { path: "/espais", name: "espais", component: { template: "<div />" } },
    ],
  });
  await router.push("/iniciar-sessio");
  const Host = defineComponent({ setup: () => useIniciSessio(), template: "<div />" });
  const wrapper = mount(Host, {
    global: {
      plugins: [pinia, router],
      provide: { [identityApiKey as symbol]: { iniciarSessio } as IdentityApi },
    },
  });
  return { wrapper, router };
}

describe("useIniciSessio", () => {
  it("el responsable entra amb el rol que diu el servidor", async () => {
    const { wrapper, router } = await muntar(async () => responsable);
    wrapper.vm.camps.email = "anna@example.com";
    wrapper.vm.camps.password = "nova-clau";
    await wrapper.vm.enviar();
    await flushPromises();
    expect(useSessioStore().role).toBe("responsible");
    expect(useSessioStore().token).toBe("tok-resp");
    expect(router.currentRoute.value.name).toBe("espais");
  });

  it("el coordinador entra pel mateix formulari i el rol el decideix el servidor", async () => {
    const { wrapper, router } = await muntar(async () => coordinador);
    wrapper.vm.camps.email = "carla@example.com";
    wrapper.vm.camps.password = "nova-clau";
    await wrapper.vm.enviar();
    await flushPromises();
    expect(useSessioStore().role).toBe("coordinator");
    expect(router.currentRoute.value.name).toBe("espais");
  });

  it("amb la contrasenya antiga no entra i no diu quin camp falla", async () => {
    const { wrapper, router } = await muntar(async () => {
      throw new ApiError("email o contrasenya incorrectes", 401);
    });
    wrapper.vm.camps.email = "carla@example.com";
    wrapper.vm.camps.password = "contrasenya-antiga";
    await wrapper.vm.enviar();
    await flushPromises();
    expect(wrapper.vm.errorGlobal).toBe("Email o contrasenya incorrectes.");
    expect(useSessioStore().iniciada).toBe(false);
    expect(router.currentRoute.value.name).toBe("iniciar-sessio");
  });
});
