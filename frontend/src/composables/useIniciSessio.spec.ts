import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { flushPromises, mount } from "@vue/test-utils";

import IniciSessioView from "../views/IniciSessioView.vue";
import { ConnexioVerificacioError, canalVerificacioKey, type CanalVerificacio } from "../services/canalVerificacio";
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

const coordinador: SessioDto = {
  ...responsable,
  token: "tok-coord",
  user_id: "u2",
  role: "coordinator",
  user_name: "Carla",
};

function canalDe(codi = "123456", opcions: { falla?: boolean } = {}): CanalVerificacio & { talla: () => void } {
  let desconnexio: (() => void) | null = null;
  return {
    async assegurar() {
      if (opcions.falla) {
        throw new ConnexioVerificacioError();
      }
      return "canal-test";
    },
    async esperarCodi(challengeId) {
      return { challenge_id: challengeId, code: codi, expires_at: "2026-11-18T18:02:00.000Z" };
    },
    enDesconnexio(avis) {
      desconnexio = avis;
      return () => {
        if (desconnexio === avis) {
          desconnexio = null;
        }
      };
    },
    tancar() {
      desconnexio = null;
    },
    talla() {
      desconnexio?.();
    },
  };
}

async function muntar(
  api: Partial<IdentityApi>,
  canal: CanalVerificacio = canalDe(),
) {
  localStorage.clear();
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "inici", component: { template: "<div />" } },
      { path: "/iniciar-sessio", name: "iniciar-sessio", component: { template: "<div />" } },
      { path: "/espais", name: "espais", component: { template: "<div />" } },
      { path: "/registre", name: "registre", component: { template: "<div />" } },
      { path: "/recuperar", name: "recuperar", component: { template: "<div />" } },
      { path: "/verificar", name: "verificar", component: { template: "<div />" } },
    ],
  });
  await router.push("/iniciar-sessio");
  const wrapper = mount(IniciSessioView, {
    global: {
      plugins: [pinia, router],
      provide: {
        [identityApiKey as symbol]: api as IdentityApi,
        [canalVerificacioKey as symbol]: canal,
      },
    },
  });
  return { wrapper, router, canal };
}

async function credencials(wrapper: ReturnType<typeof mount>, email: string, password: string) {
  await wrapper.get("#email").setValue(email);
  await wrapper.get("#password").setValue(password);
  await wrapper.get("form").trigger("submit");
  await flushPromises();
}

describe("IniciSessioView", () => {
  it("el responsable entra quan escriu el codi que ha arribat a la finestra", async () => {
    let canalEnviat = "";
    const { wrapper, router } = await muntar({
      async demanarCodiDeSessio(_email, _password, channel) {
        canalEnviat = channel;
        return { challenge_id: "repte-1", expires_at: "2026-11-18T18:02:00.000Z" };
      },
      async confirmarCodiDeSessio(challengeId, code, channel) {
        expect(challengeId).toBe("repte-1");
        expect(code).toBe("123456");
        expect(channel).toBe("canal-test");
        return responsable;
      },
    });
    await credencials(wrapper, "anna@example.com", "nova-clau");
    expect(canalEnviat).toBe("canal-test");
    expect(wrapper.get("#codi-rebut").text()).toBe("123456");
    expect(useSessioStore().iniciada).toBe(false);
    await wrapper.get("#codi").setValue("123456");
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(useSessioStore().role).toBe("responsible");
    expect(useSessioStore().token).toBe("tok-resp");
    expect(router.currentRoute.value.name).toBe("espais");
  });

  it("el coordinador entra pel mateix formulari", async () => {
    const { wrapper, router } = await muntar({
      async demanarCodiDeSessio() {
        return { challenge_id: "repte-2", expires_at: "2026-11-18T18:02:00.000Z" };
      },
      async confirmarCodiDeSessio() {
        return coordinador;
      },
    });
    await credencials(wrapper, "carla@example.com", "nova-clau");
    await wrapper.get("#codi").setValue("123456");
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(useSessioStore().role).toBe("coordinator");
    expect(router.currentRoute.value.name).toBe("espais");
  });

  it("amb la contrasenya antiga no passa al codi", async () => {
    const { wrapper, router } = await muntar({
      async demanarCodiDeSessio() {
        throw new ApiError("email o contrasenya incorrectes", 401);
      },
      async confirmarCodiDeSessio() {
        return responsable;
      },
    });
    await credencials(wrapper, "carla@example.com", "contrasenya-antiga");
    expect(wrapper.text()).toContain("Email o contrasenya incorrectes.");
    expect(wrapper.find("#codi").exists()).toBe(false);
    expect(useSessioStore().iniciada).toBe(false);
    expect(router.currentRoute.value.name).toBe("iniciar-sessio");
  });

  it("un compte sense verificar no entra i ofereix tornar a enviar el correu", async () => {
    const { wrapper } = await muntar({
      async demanarCodiDeSessio() {
        throw new ApiError("Verifica el correu abans d’iniciar sessió.", 403);
      },
      async confirmarCodiDeSessio() {
        return responsable;
      },
    });
    await credencials(wrapper, "anna@example.com", "secret123");
    expect(wrapper.text()).toContain("Verifica el correu abans d’iniciar sessió.");
    expect(wrapper.text()).toContain("Torna a enviar el correu de verificació");
    expect(useSessioStore().iniciada).toBe(false);
  });

  it("un codi incorrecte es mostra al camp i no obre sessió", async () => {
    const { wrapper } = await muntar({
      async demanarCodiDeSessio() {
        return { challenge_id: "repte-3", expires_at: "2026-11-18T18:02:00.000Z" };
      },
      async confirmarCodiDeSessio() {
        throw new ApiError("El codi no és correcte.", 400);
      },
    });
    await credencials(wrapper, "anna@example.com", "secret123");
    await wrapper.get("#codi").setValue("000000");
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(wrapper.get("#codi-error").text()).toBe("El codi no és correcte.");
    expect(useSessioStore().iniciada).toBe(false);
    expect(wrapper.find("#codi").exists()).toBe(true);
  });

  it("si la connexió es talla torna al formulari", async () => {
    const canal = canalDe();
    const { wrapper } = await muntar(
      {
        async demanarCodiDeSessio() {
          return { challenge_id: "repte-4", expires_at: "2026-11-18T18:02:00.000Z" };
        },
        async confirmarCodiDeSessio() {
          return responsable;
        },
      },
      canal,
    );
    await credencials(wrapper, "anna@example.com", "secret123");
    expect(wrapper.get("#codi-rebut").text()).toBe("123456");
    canal.talla();
    await flushPromises();
    expect(wrapper.text()).toContain("S’ha tallat la connexió.");
    expect(wrapper.find("#email").exists()).toBe(true);
    expect(useSessioStore().iniciada).toBe(false);
  });

  it("sense connexió no demana el codi", async () => {
    let demanat = false;
    const { wrapper } = await muntar(
      {
        async demanarCodiDeSessio() {
          demanat = true;
          return { challenge_id: "repte", expires_at: "2026-11-18T18:02:00.000Z" };
        },
        async confirmarCodiDeSessio() {
          return responsable;
        },
      },
      canalDe("123456", { falla: true }),
    );
    await credencials(wrapper, "anna@example.com", "secret123");
    expect(demanat).toBe(false);
    expect(wrapper.text()).toContain("No s’ha pogut obrir la connexió de verificació.");
  });

  it("un codi caducat es pot tornar a començar", async () => {
    const { wrapper } = await muntar({
      async demanarCodiDeSessio() {
        return { challenge_id: "repte-5", expires_at: "2026-11-18T18:02:00.000Z" };
      },
      async confirmarCodiDeSessio() {
        throw new ApiError("El codi ha caducat. Torna a iniciar el procés.", 410);
      },
    });
    await credencials(wrapper, "anna@example.com", "secret123");
    await wrapper.get("#codi").setValue("123456");
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(wrapper.text()).toContain("El codi ha caducat.");
    await wrapper.get("button[type='button']").trigger("click");
    await flushPromises();
    expect(wrapper.find("#email").exists()).toBe(true);
    expect(useSessioStore().iniciada).toBe(false);
  });
});
