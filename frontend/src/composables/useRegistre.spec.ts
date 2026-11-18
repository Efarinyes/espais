import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { defineComponent } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import { useRegistre } from "./useRegistre";
import { ApiError } from "../services/http";
import { identityApiKey, type IdentityApi, type SessioDto } from "../services/identitat";
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
      { path: "/espais", name: "espais", component: { template: "<div>espais</div>" } },
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
          registrar: async () => ({ detall: "T’hem enviat un correu.", lliurament: "sent" as const }),
          demanarCodiDeSessio: async () => ({ challenge_id: "repte", expires_at: "2026-11-18T18:02:00.000Z" }),
          confirmarCodiDeSessio: async () => sessioOk,
          obtenirSessio: async () => sessioOk,
          actualitzarPaleta: async (_token, palette) => ({ palette }),
          llistarCoordinadors: async () => [],
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
          demanarRecuperacio: async () => ({ detall: "Si aquest correu té un compte, rebràs un enllaç." }),
          confirmarRecuperacio: async () => ({ detall: "La contrasenya s’ha actualitzat." }),
          demanarVerificacio: async () => ({
            detall: "Si aquest correu té un registre pendent de verificar, rebràs un enllaç.",
          }),
          confirmarVerificacio: async () => ({
            detall: "El correu s’ha verificat i l’entitat ja està activa. Ara pots iniciar sessió.",
          }),
          ...api,
        } satisfies IdentityApi,
      },
    },
  });
  return { wrapper, router, sessio: useSessioStore() };
}

describe("useRegistre", () => {
  it("deixa el compte pendent de verificació i no obre sessió", async () => {
    const { wrapper, router, sessio } = muntar({});
    await router.push("/registre");
    wrapper.vm.camps.entity_name = "AAVV Barri A";
    wrapper.vm.camps.responsible_name = "Anna";
    wrapper.vm.camps.email = "anna@example.com";
    wrapper.vm.camps.password = "secret123";
    await wrapper.vm.enviar();
    await flushPromises();
    expect(sessio.iniciada).toBe(false);
    expect(wrapper.vm.pendent).toBe(true);
    expect(wrapper.vm.missatge).toContain("correu");
    expect(router.currentRoute.value.name).toBe("registre");
  });

  it("mentre el primer registre no ha respost, un segon clic no fa una altra petició", async () => {
    let crides = 0;
    let resoldre: (valor: { detall: string; lliurament: "sent" }) => void = () => undefined;
    const { wrapper } = muntar({
      registrar: () => {
        crides += 1;
        return new Promise((resolve) => {
          resoldre = resolve;
        });
      },
    });
    wrapper.vm.camps.entity_name = "AAVV";
    wrapper.vm.camps.responsible_name = "Anna";
    wrapper.vm.camps.email = "anna@example.com";
    wrapper.vm.camps.password = "secret123";
    const primer = wrapper.vm.enviar();
    const segon = wrapper.vm.enviar();
    expect(crides).toBe(1);
    resoldre({ detall: "T’hem enviat un correu.", lliurament: "sent" });
    await primer;
    await segon;
    await flushPromises();
    expect(crides).toBe(1);
    expect(wrapper.vm.pendent).toBe(true);
    expect(wrapper.vm.errorGlobal).toBe("");
  });

  it("no diu que l’email ja existeix si el registre no es completa", async () => {
    const { wrapper } = muntar({
      registrar: async () => {
        throw new ApiError(
          "No s’ha pogut completar el registre. Revisa les dades o inicia la sessió.",
          400,
        );
      },
    });
    wrapper.vm.camps.entity_name = "AAVV";
    wrapper.vm.camps.responsible_name = "Anna";
    wrapper.vm.camps.email = "anna@example.com";
    wrapper.vm.camps.password = "secret123";
    await wrapper.vm.enviar();
    await flushPromises();
    expect(wrapper.vm.errorGlobal).toContain("Revisa les dades o inicia la sessió");
    expect(wrapper.vm.errorGlobal).not.toContain("registrat");
    expect(wrapper.vm.errorGlobal).not.toContain("recupera");
  });

  it("tampoc no revela un 409 antic de registre", async () => {
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
    expect(wrapper.vm.errorGlobal).not.toContain("registrat");
    expect(wrapper.vm.errorGlobal).toContain("inicia la sessió");
  });
});
