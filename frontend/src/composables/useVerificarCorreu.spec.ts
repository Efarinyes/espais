import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { defineComponent } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import { useVerificarCorreu } from "./useVerificarCorreu";
import { ApiError } from "../services/http";
import { identityApiKey, type IdentityApi, type SessioDto } from "../services/identitat";
import { useSessioStore } from "../stores/sessio";

const sessioAntiga: SessioDto = {
  token: "tok-antic",
  entity_id: "e1",
  user_id: "u1",
  role: "responsible",
  entity_name: "AAVV Barri A",
  user_name: "Anna",
  typology: null,
};

const DETALL = "El correu s’ha verificat i l’entitat ja està activa. Ara pots iniciar sessió.";

function identity(api: Partial<IdentityApi> = {}): IdentityApi {
  return {
    registrar: async () => ({ detall: "T’hem enviat un correu.", lliurament: "sent" }),
    demanarCodiDeSessio: async () => ({ challenge_id: "repte", expires_at: "2026-11-18T18:02:00.000Z" }),
    confirmarCodiDeSessio: async () => sessioAntiga,
    obtenirSessio: async () => sessioAntiga,
    actualitzarPaleta: async (_token, palette) => ({ palette }),
    llistarCoordinadors: async () => [],
    convidarCoordinador: async () => ({
      email: "carla@example.com",
      accept_url: "/invitar/token-convidat",
      expires_at: "2026-09-22T12:00:00+00:00",
      delivery: "unavailable",
    }),
    obtenirInvitacio: async () => ({ email: "carla@example.com", entity_name: "AAVV Barri A" }),
    acceptarInvitacio: async () => sessioAntiga,
    tancarSessio: async () => undefined,
    demanarRecuperacio: async () => ({ detall: "Si aquest correu té un compte, rebràs un enllaç." }),
    confirmarRecuperacio: async () => ({ detall: "La contrasenya s’ha actualitzat." }),
    demanarVerificacio: async () => ({ detall: "Si aquest correu té un registre pendent, rebràs un enllaç." }),
    confirmarVerificacio: async () => ({ detall: DETALL }),
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
      { path: "/verificar", name: "verificar-correu", component: { template: "<div />" } },
      { path: "/iniciar-sessio", name: "iniciar-sessio", component: { template: "<div />" } },
    ],
  });
  await router.push("/verificar");
  const Host = defineComponent({ setup: () => useVerificarCorreu(), template: "<div />" });
  const wrapper = mount(Host, {
    global: {
      plugins: [pinia, router],
      provide: { [identityApiKey as symbol]: identity(api) },
    },
  });
  return { wrapper, router };
}

describe("useVerificarCorreu", () => {
  it("activa el compte amb el fragment i no obre sessió", async () => {
    window.history.replaceState(window.history.state, "", "/verificar#token-verificacio");
    const { wrapper, router } = await muntar({}, true);
    expect(window.location.hash).toBe("");
    expect(router.currentRoute.value.hash).toBe("");
    expect(wrapper.vm.pas).toBe("confirmar");
    await wrapper.vm.confirmar();
    await flushPromises();
    expect(wrapper.vm.pas).toBe("fet");
    expect(wrapper.vm.missatge).toBe(DETALL);
    expect(useSessioStore().iniciada).toBe(false);
    expect(localStorage.getItem("espais.sessio")).toBeNull();
    expect(router.currentRoute.value.name).toBe("verificar-correu");
  });

  it("un enllaç gastat ofereix demanar-ne un de nou", async () => {
    window.history.replaceState(window.history.state, "", "/verificar#token-usat");
    const { wrapper } = await muntar({
      confirmarVerificacio: async () => {
        throw new ApiError("Aquest enllaç no és vàlid o ha caducat. Demana’n un de nou.", 410);
      },
    });
    await wrapper.vm.confirmar();
    await flushPromises();
    expect(wrapper.vm.enllacInvalid).toBe(true);
    expect(wrapper.vm.errorGlobal).toContain("caducat");
    wrapper.vm.demanarEnllacNou();
    expect(wrapper.vm.pas).toBe("demanar");
  });

  it("sense fragment demana el correu i no diu si existeix", async () => {
    window.history.replaceState(window.history.state, "", "/verificar");
    let email = "";
    const { wrapper } = await muntar({
      demanarVerificacio: async (valor) => {
        email = valor;
        return { detall: "Si aquest correu té un registre pendent, rebràs un enllaç." };
      },
    });
    expect(wrapper.vm.pas).toBe("demanar");
    wrapper.vm.camps.email = "anna@example.com";
    await wrapper.vm.demanar();
    await flushPromises();
    expect(email).toBe("anna@example.com");
    expect(wrapper.vm.missatge).toContain("pendent");
  });
});
