import { afterEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { defineComponent } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import { useSincronitzaSessio } from "./useSincronitzaSessio";
import { configuraConfirmacioSessio } from "../confirmacioSessio";
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

async function muntar(obtenirSessio: IdentityApi["obtenirSessio"], ruta = "/espais") {
  localStorage.clear();
  const pinia = createPinia();
  setActivePinia(pinia);
  configuraConfirmacioSessio(obtenirSessio);
  useSessioStore().iniciar(sessio);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/iniciar-sessio", name: "iniciar-sessio", component: { template: "<div />" } },
      { path: "/espais", name: "espais", component: { template: "<div />" }, meta: { requiresAuth: true } },
      { path: "/analisi", name: "analisi", component: { template: "<div />" }, meta: { requiresAuth: true } },
      { path: "/avisos", name: "avisos", component: { template: "<div />" }, meta: { requiresAuth: true } },
    ],
  });
  await router.push(ruta);
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
  afterEach(() => {
    configuraConfirmacioSessio(null);
  });

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

  it("confirmar el rol del servidor no treu d’una ruta que aquest rol pot veure", async () => {
    localStorage.clear();
    localStorage.setItem(
      "espais.sessio",
      JSON.stringify({
        token: "tok-desat",
        entityId: "e1",
        entityName: "AAVV Barri A",
        userName: "Anna",
        role: "coordinator",
        typology: null,
        palette: "mar-cel",
      }),
    );
    const pinia = createPinia();
    setActivePinia(pinia);
    const { token: _token, ...vista } = sessio;
    configuraConfirmacioSessio(async () => ({ ...vista, role: "responsible", user_name: "Anna" }));
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/iniciar-sessio", name: "iniciar-sessio", component: { template: "<div />" } },
        { path: "/espais", name: "espais", component: { template: "<div />" } },
        { path: "/analisi", name: "analisi", component: { template: "<div />" } },
      ],
    });
    await router.push("/analisi");
    const Host = defineComponent({ setup: () => useSincronitzaSessio(), template: "<div />" });
    mount(Host, { global: { plugins: [pinia, router] } });
    await flushPromises();
    expect(useSessioStore().role).toBe("responsible");
    expect(router.currentRoute.value.name).toBe("analisi");
  });

  it("si el servidor canvia el rol, la ruta exclusiva deixa d’estar permesa", async () => {
    const { token: _token, ...vista } = sessio;
    const router = await muntar(async () => ({ ...vista, role: "responsible" }), "/avisos");
    expect(useSessioStore().role).toBe("responsible");
    expect(router.currentRoute.value.name).toBe("espais");
  });
});
