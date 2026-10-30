import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { defineComponent } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import { useRecuperarAcces } from "./useRecuperarAcces";
import { ApiError } from "../services/http";
import { identityApiKey, type IdentityApi, type SessioDto } from "../services/identitat";
import { useSessioStore } from "../stores/sessio";

const sessioAntiga: SessioDto = {
  token: "tok-antic",
  entity_id: "e1",
  user_id: "u1",
  role: "coordinator",
  entity_name: "AAVV Barri A",
  user_name: "Carla",
  typology: "associació de veïns",
};

const DETALL_CANVI = "La contrasenya s’ha actualitzat correctament. Ara pots iniciar sessió.";

function identity(api: Partial<IdentityApi> = {}): IdentityApi {
  return {
    registrar: async () => sessioAntiga,
    iniciarSessio: async () => sessioAntiga,
    obtenirSessio: async () => sessioAntiga,
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
    acceptarInvitacio: async () => sessioAntiga,
    tancarSessio: async () => undefined,
    demanarRecuperacio: async () => ({
      detall: "Si aquest correu té un compte, rebràs un enllaç per triar una contrasenya nova.",
    }),
    confirmarRecuperacio: async () => ({ detall: DETALL_CANVI }),
    ...api,
  };
}

async function muntar(api: Partial<IdentityApi> = {}, ambSessio = false) {
  localStorage.clear();
  const pinia = createPinia();
  setActivePinia(pinia);
  if (ambSessio) {
    useSessioStore().iniciar(sessioAntiga);
  }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/recuperar", name: "recuperar-acces", component: { template: "<div />" } },
      { path: "/iniciar-sessio", name: "iniciar-sessio", component: { template: "<div />" } },
      { path: "/espais", name: "espais", component: { template: "<div />" } },
    ],
  });
  await router.push("/recuperar");
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
  it("sense fragment demana l’email i mostra el text genèric", async () => {
    window.location.hash = "";
    const { wrapper } = await muntar();
    expect(wrapper.vm.pas).toBe("demanar");
    wrapper.vm.camps.email = "anna@example.com";
    await wrapper.vm.demanar();
    await flushPromises();
    expect(wrapper.vm.missatge).toContain("Si aquest correu té un compte");
  });

  it("treu el token de la barra i no l’envia fins que es desa la contrasenya", async () => {
    window.location.hash = "#token-secret";
    const enviats: string[] = [];
    const { wrapper } = await muntar({
      confirmarRecuperacio: async (token) => {
        enviats.push(token);
        return { detall: DETALL_CANVI };
      },
    });
    expect(window.location.hash).toBe("");
    expect(window.location.href).not.toContain("token-secret");
    expect(JSON.stringify(window.history.state ?? null)).not.toContain("token-secret");
    expect(wrapper.vm.pas).toBe("contrasenya");
    expect(enviats).toEqual([]);
    wrapper.vm.camps.password = "nova-clau";
    await wrapper.vm.confirmar();
    await flushPromises();
    expect(enviats).toEqual(["token-secret"]);
  });

  it("un enllaç obert a la mateixa pestanya també es llegeix i surt de la ruta", async () => {
    window.location.hash = "";
    const enviats: string[] = [];
    const { wrapper, router } = await muntar({
      confirmarRecuperacio: async (token) => {
        enviats.push(token);
        return { detall: DETALL_CANVI };
      },
    });
    expect(wrapper.vm.pas).toBe("demanar");
    await router.push("/recuperar#token-enganxat");
    await flushPromises();
    expect(wrapper.vm.pas).toBe("contrasenya");
    expect(router.currentRoute.value.hash).toBe("");
    expect(router.currentRoute.value.fullPath).not.toContain("token-enganxat");
    wrapper.vm.camps.password = "nova-clau";
    await wrapper.vm.confirmar();
    await flushPromises();
    expect(enviats).toEqual(["token-enganxat"]);
  });

  it("després del canvi no obre sessió, esborra l’anterior i es queda a la pantalla", async () => {
    window.location.hash = "#token-secret";
    const { wrapper, router } = await muntar({}, true);
    expect(localStorage.getItem("espais.sessio")).not.toBeNull();
    wrapper.vm.camps.password = "nova-clau";
    await wrapper.vm.confirmar();
    await flushPromises();
    const sessio = useSessioStore();
    expect(sessio.iniciada).toBe(false);
    expect(sessio.token).toBe("");
    expect(localStorage.getItem("espais.sessio")).toBeNull();
    expect(wrapper.vm.pas).toBe("fet");
    expect(wrapper.vm.missatge).toBe(DETALL_CANVI);
    expect(wrapper.vm.camps.password).toBe("");
    expect(router.currentRoute.value.name).toBe("recuperar-acces");
  });

  it("un enllaç caducat o ja usat ofereix demanar-ne un de nou", async () => {
    window.location.hash = "#token-usat";
    const { wrapper } = await muntar(
      {
        confirmarRecuperacio: async () => {
          throw new ApiError("Aquest enllaç no és vàlid o ha caducat. Demana’n un de nou.", 410);
        },
      },
      true,
    );
    wrapper.vm.camps.password = "nova-clau";
    await wrapper.vm.confirmar();
    await flushPromises();
    expect(wrapper.vm.enllacInvalid).toBe(true);
    expect(wrapper.vm.errorGlobal).toContain("no és vàlid o ha caducat");
    expect(useSessioStore().iniciada).toBe(true);
    wrapper.vm.demanarEnllacNou();
    expect(wrapper.vm.pas).toBe("demanar");
    expect(wrapper.vm.errorGlobal).toBe("");
  });

  it("una contrasenya curta no arriba al servidor", async () => {
    window.location.hash = "#token-secret";
    let crides = 0;
    const { wrapper } = await muntar({
      confirmarRecuperacio: async () => {
        crides += 1;
        return { detall: DETALL_CANVI };
      },
    });
    wrapper.vm.camps.password = "curta";
    await wrapper.vm.confirmar();
    expect(crides).toBe(0);
    expect(wrapper.vm.errorsCamp.password).toContain("8 caràcters");
  });

  it("si el servidor rebutja la contrasenya, el token continua servint", async () => {
    window.location.hash = "#token-secret";
    const enviats: string[] = [];
    let primera = true;
    const { wrapper } = await muntar({
      confirmarRecuperacio: async (token) => {
        enviats.push(token);
        if (primera) {
          primera = false;
          throw new ApiError("la contrasenya és massa llarga", 400);
        }
        return { detall: DETALL_CANVI };
      },
    });
    wrapper.vm.camps.password = "x".repeat(80);
    await wrapper.vm.confirmar();
    await flushPromises();
    expect(wrapper.vm.errorGlobal).toContain("massa llarga");
    expect(wrapper.vm.pas).toBe("contrasenya");
    wrapper.vm.camps.password = "nova-clau";
    await wrapper.vm.confirmar();
    await flushPromises();
    expect(enviats).toEqual(["token-secret", "token-secret"]);
    expect(wrapper.vm.pas).toBe("fet");
  });
});
