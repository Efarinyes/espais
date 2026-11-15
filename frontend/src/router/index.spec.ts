import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createPinia, getActivePinia, setActivePinia } from "pinia";
import { defineComponent } from "vue";
import { RouterView } from "vue-router";
import { flushPromises, mount } from "@vue/test-utils";

import { router } from "./index";
import { disparadorCalendariKey } from "../calendariLive";
import { configuraConfirmacioSessio } from "../confirmacioSessio";
import { ApiError } from "../services/http";
import type { SessioDto } from "../services/identitat";
import { analisiApiKey } from "../services/analisi";
import { avisosApiKey } from "../services/avisos";
import { espaisApiKey } from "../services/espais";
import { identityApiKey } from "../services/identitat";
import { reservesApiKey } from "../services/reserves";
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

const coordinador: SessioDto = { ...responsable, token: "tok-coord", user_id: "u2", role: "coordinator" };

const desada = {
  token: "tok-desat",
  entityId: "e1",
  entityName: "AAVV Barri A",
  userName: "Anna",
  role: "responsible",
  typology: null,
  palette: "mar-cel",
};

function sessioDesada(role: SessioDto["role"] = "responsible") {
  localStorage.setItem("espais.sessio", JSON.stringify({ ...desada, role, userName: role === "responsible" ? "Anna" : "Carla" }));
  setActivePinia(createPinia());
}

describe("guardes del router", () => {
  beforeEach(async () => {
    window.scrollTo = () => undefined;
    localStorage.clear();
    configuraConfirmacioSessio(null);
    setActivePinia(createPinia());
    await router.push("/");
  });

  afterEach(() => {
    configuraConfirmacioSessio(null);
  });

  it("sense sessió, una ruta del tauler porta a iniciar sessió", async () => {
    await router.push("/espais");
    expect(router.currentRoute.value.name).toBe("iniciar-sessio");
  });

  it("el coordinador no entra a les pantalles del responsable canviant la ruta", async () => {
    useSessioStore().iniciar(coordinador);
    for (const ruta of ["/analisi", "/coordinadors/convidar", "/espais/nou", "/espais/sala-1", "/entitat/colors"]) {
      await router.push(ruta);
      expect(router.currentRoute.value.name).toBe("espais");
    }
  });

  it("el responsable no entra a la safata del coordinador", async () => {
    useSessioStore().iniciar(responsable);
    await router.push("/avisos");
    expect(router.currentRoute.value.name).toBe("espais");
  });

  it("el coordinador entra a la seva safata i a les rutes compartides", async () => {
    useSessioStore().iniciar(coordinador);
    await router.push("/avisos");
    expect(router.currentRoute.value.name).toBe("avisos");
    await router.push("/calendari");
    expect(router.currentRoute.value.name).toBe("calendari");
    await router.push("/espais");
    expect(router.currentRoute.value.name).toBe("espais");
  });

  it("el responsable entra a les seves pantalles i a les compartides", async () => {
    useSessioStore().iniciar(responsable);
    await router.push("/analisi");
    expect(router.currentRoute.value.name).toBe("analisi");
    await router.push("/coordinadors/convidar");
    expect(router.currentRoute.value.name).toBe("convidar-coordinador");
    await router.push("/calendari");
    expect(router.currentRoute.value.name).toBe("calendari");
  });

  it("la política de cookies s’obre sense sessió", async () => {
    await router.push("/politica-de-cookies");
    expect(router.currentRoute.value.name).toBe("politica-cookies");
  });

  it("la política de cookies s’obre encara que hi hagi una sessió", async () => {
    useSessioStore().iniciar(responsable);
    await router.push("/politica-de-cookies");
    expect(router.currentRoute.value.name).toBe("politica-cookies");
  });

  it("l’enllaç de recuperació s’obre encara que hi hagi una sessió al navegador", async () => {
    useSessioStore().iniciar(coordinador);
    await router.push("/recuperar");
    expect(router.currentRoute.value.name).toBe("recuperar-acces");
  });

  it("una ruta pública no espera la confirmació de la sessió desada", async () => {
    let cridat = false;
    configuraConfirmacioSessio(() => {
      cridat = true;
      return new Promise(() => undefined);
    });
    sessioDesada();
    await router.push("/politica-de-cookies");
    expect(router.currentRoute.value.name).toBe("politica-cookies");
    expect(cridat).toBe(false);
  });

  it("una sessió desada no obre el tauler fins que el servidor confirma el rol", async () => {
    let resoldre: (vista: Omit<SessioDto, "token">) => void = () => undefined;
    configuraConfirmacioSessio(
      () =>
        new Promise((resolve) => {
          resoldre = resolve;
        }),
    );
    sessioDesada("responsible");
    const navegacio = router.push("/analisi");
    await flushPromises();
    expect(router.currentRoute.value.name).not.toBe("analisi");
    const { token: _token, ...vista } = coordinador;
    resoldre(vista);
    await navegacio;
    expect(router.currentRoute.value.name).toBe("espais");
    expect(useSessioStore().role).toBe("coordinator");
  });

  it("una sessió invàlida no deixa entrar i esborra el que hi havia desat", async () => {
    configuraConfirmacioSessio(async () => {
      throw new ApiError("sessió invàlida", 401);
    });
    sessioDesada();
    await router.push("/espais");
    expect(router.currentRoute.value.name).toBe("iniciar-sessio");
    expect(useSessioStore().iniciada).toBe(false);
    expect(localStorage.getItem("espais.sessio")).toBeNull();
  });

  it("si la confirmació falla, no es mostra la ruta privada", async () => {
    configuraConfirmacioSessio(async () => {
      throw new TypeError("Failed to fetch");
    });
    sessioDesada();
    await router.push("/analisi");
    expect(router.currentRoute.value.name).toBe("inici");
    expect(useSessioStore().iniciada).toBe(true);
    expect(useSessioStore().confirmada).toBe(false);
  });

  it("el component privat no es munta abans de confirmar la sessió", async () => {
    let resoldre: (vista: Omit<SessioDto, "token">) => void = () => undefined;
    configuraConfirmacioSessio(
      () =>
        new Promise((resolve) => {
          resoldre = resolve;
        }),
    );
    sessioDesada("responsible");
    const pinia = getActivePinia();
    if (!pinia) {
      throw new Error("cal una pinia activa");
    }
    const Host = defineComponent({ components: { RouterView }, template: "<RouterView />" });
    const wrapper = mount(Host, {
      global: {
        plugins: [pinia, router],
        provide: {
          [identityApiKey as symbol]: { tancarSessio: async () => undefined },
          [avisosApiKey as symbol]: { llistar: async () => [], marcarLlegit: async () => undefined, arxivar: async () => undefined },
          [espaisApiKey as symbol]: { llistar: async () => [] },
          [reservesApiKey as symbol]: { llistar: async () => [] },
          [analisiApiKey as symbol]: {
            resum: async () => {
              throw new Error("anàlisi abans de confirmar");
            },
          },
          [disparadorCalendariKey as symbol]: { iniciar: () => () => undefined },
        },
      },
    });
    await flushPromises();
    expect(wrapper.text()).not.toContain("Estadístiques");
    expect(wrapper.text()).not.toContain("AAVV Barri A");
    const navegacio = router.push("/analisi");
    await flushPromises();
    expect(wrapper.text()).not.toContain("Estadístiques");
    const { token: _token, ...vista } = coordinador;
    resoldre(vista);
    await navegacio;
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("espais");
    expect(wrapper.text()).not.toContain("Estadístiques");
    wrapper.unmount();
  });
});
