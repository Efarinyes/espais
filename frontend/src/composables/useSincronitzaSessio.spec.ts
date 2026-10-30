import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { defineComponent } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import { useSincronitzaSessio } from "./useSincronitzaSessio";
import { ApiError } from "../services/http";
import { identityApiKey, type IdentityApi, type SessioDto } from "../services/identitat";
import { useSessioStore } from "../stores/sessio";

const sessio: SessioDto = {
  token: "tok-antic",
  entity_id: "e1",
  user_id: "u2",
  role: "coordinator",
  entity_name: "AAVV Barri A",
  user_name: "Carla",
  typology: null,
};

async function muntar(obtenirSessio: IdentityApi["obtenirSessio"]) {
  localStorage.clear();
  const pinia = createPinia();
  setActivePinia(pinia);
  useSessioStore().iniciar(sessio);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/iniciar-sessio", name: "iniciar-sessio", component: { template: "<div />" } },
      { path: "/espais", name: "espais", component: { template: "<div />" }, meta: { requiresAuth: true } },
    ],
  });
  await router.push("/espais");
  const Host = defineComponent({ setup: () => useSincronitzaSessio(), template: "<div />" });
  mount(Host, {
    global: {
      plugins: [pinia, router],
      provide: { [identityApiKey as symbol]: { obtenirSessio } as IdentityApi },
    },
  });
  await flushPromises();
  return router;
}

describe("useSincronitzaSessio", () => {
  it("si el servidor ja no accepta el token, esborra la sessió i porta a iniciar sessió", async () => {
    const router = await muntar(async () => {
      throw new ApiError("sessió invàlida", 401);
    });
    expect(useSessioStore().iniciada).toBe(false);
    expect(localStorage.getItem("espais.sessio")).toBeNull();
    expect(router.currentRoute.value.name).toBe("iniciar-sessio");
  });

  it("un error de xarxa no tanca la sessió", async () => {
    const router = await muntar(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(useSessioStore().iniciada).toBe(true);
    expect(router.currentRoute.value.name).toBe("espais");
  });

  it("amb el token vàlid la sessió continua i el rol és el del servidor", async () => {
    const { token: _token, ...vista } = sessio;
    await muntar(async () => vista);
    expect(useSessioStore().iniciada).toBe(true);
    expect(useSessioStore().token).toBe("tok-antic");
    expect(useSessioStore().role).toBe("coordinator");
  });
});
