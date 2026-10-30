import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { router } from "./index";
import type { SessioDto } from "../services/identitat";
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

describe("guardes del router", () => {
  beforeEach(async () => {
    localStorage.clear();
    setActivePinia(createPinia());
    await router.push("/");
  });

  it("sense sessió, una ruta del tauler porta a iniciar sessió", async () => {
    await router.push("/espais");
    expect(router.currentRoute.value.name).toBe("iniciar-sessio");
  });

  it("el coordinador no entra a les pantalles del responsable canviant la ruta", async () => {
    useSessioStore().iniciar(coordinador);
    for (const ruta of ["/analisi", "/coordinadors/convidar", "/espais/nou", "/entitat/colors"]) {
      await router.push(ruta);
      expect(router.currentRoute.value.name).toBe("espais");
    }
  });

  it("el responsable hi entra", async () => {
    useSessioStore().iniciar(responsable);
    await router.push("/analisi");
    expect(router.currentRoute.value.name).toBe("analisi");
    await router.push("/coordinadors/convidar");
    expect(router.currentRoute.value.name).toBe("convidar-coordinador");
  });

  it("l’enllaç de recuperació s’obre encara que hi hagi una sessió al navegador", async () => {
    useSessioStore().iniciar(coordinador);
    await router.push("/recuperar");
    expect(router.currentRoute.value.name).toBe("recuperar-acces");
  });
});
