import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import { CLAU_PUSH_DESACTIVAT, cancelaPushAlSortir, usePush } from "./usePush";
import type { SessioDto } from "../services/identitat";
import type {
  NavegadorPush,
  PermisPush,
  PushApi,
  PushConfigDto,
  SubscripcioPush,
  SuportPush,
} from "../services/push";
import { useSessioStore } from "../stores/sessio";

const sessioCoord: SessioDto = {
  token: "tok",
  entity_id: "e1",
  user_id: "u2",
  role: "coordinator",
  entity_name: "AAVV Barri A",
  user_name: "Carla",
  typology: null,
};

const SUBSCRIPCIO: SubscripcioPush = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc",
  keys: { p256dh: "p", auth: "a" },
};

class NavegadorFals implements NavegadorPush {
  suportValor: SuportPush = "suportat";
  permisValor: PermisPush = "default";
  respostaPermis: PermisPush = "granted";
  actual: SubscripcioPush | null = null;
  demanatPermis = 0;
  subscrit: string[] = [];
  cancelat = 0;
  falla: "subscriure" | "cancelar" | null = null;
  suport() {
    return this.suportValor;
  }
  permis() {
    return this.permisValor;
  }
  async demanarPermis() {
    this.demanatPermis += 1;
    this.permisValor = this.respostaPermis;
    return this.respostaPermis;
  }
  async subscripcioActual() {
    return this.actual;
  }
  async subscriure(clau: string) {
    if (this.falla === "subscriure") {
      throw new Error("rebutjat");
    }
    this.subscrit.push(clau);
    this.actual = SUBSCRIPCIO;
    return SUBSCRIPCIO;
  }
  async cancelar() {
    if (this.falla === "cancelar") {
      throw new Error("no es pot");
    }
    const endpoint = this.actual?.endpoint ?? null;
    this.actual = null;
    this.cancelat += 1;
    return endpoint;
  }
}

class ApiFalsa implements PushApi {
  config: PushConfigDto = { enabled: true, public_key: "CLAU-PUBLICA" };
  registrades: { token: string; subscripcio: SubscripcioPush }[] = [];
  cancelades: { token: string; endpoint: string }[] = [];
  fallaConfig = false;
  fallaRegistre = false;
  async configuracio() {
    if (this.fallaConfig) {
      throw new Error("503");
    }
    return this.config;
  }
  async registrar(token: string, subscripcio: SubscripcioPush) {
    if (this.fallaRegistre) {
      throw new Error("400");
    }
    this.registrades.push({ token, subscripcio });
  }
  async cancelar(token: string, endpoint: string) {
    this.cancelades.push({ token, endpoint });
  }
}

function muntar(navegador: NavegadorFals, api: ApiFalsa | null) {
  localStorage.clear();
  const pinia = createPinia();
  setActivePinia(pinia);
  useSessioStore().iniciar(sessioCoord);
  const Host = defineComponent({ setup: () => usePush({ api, navegador }), template: "<div />" });
  return mount(Host, { global: { plugins: [pinia] } });
}

describe("usePush", () => {
  let navegador: NavegadorFals;
  let api: ApiFalsa;
  beforeEach(() => {
    navegador = new NavegadorFals();
    api = new ApiFalsa();
  });

  it("un navegador sense push ho diu i no demana permís ni subscriu res", async () => {
    navegador.suportValor = "no-suportat";
    const wrapper = muntar(navegador, api);
    await wrapper.vm.inicialitzar();
    expect(wrapper.vm.estat).toBe("no-suportat");
    expect(navegador.demanatPermis).toBe(0);
    expect(api.registrades).toEqual([]);
  });

  it("a iOS fora de l’app instal·lada demana afegir-la a la pantalla d’inici", async () => {
    navegador.suportValor = "cal-instalar";
    const wrapper = muntar(navegador, api);
    await wrapper.vm.inicialitzar();
    expect(wrapper.vm.estat).toBe("cal-instalar");
  });

  it("si el servidor no té VAPID configurat, la funció queda oculta", async () => {
    api.config = { enabled: false, public_key: null };
    const wrapper = muntar(navegador, api);
    await wrapper.vm.inicialitzar();
    expect(wrapper.vm.estat).toBe("desactivat-servidor");
    api.fallaConfig = true;
    await wrapper.vm.inicialitzar();
    expect(wrapper.vm.estat).toBe("desactivat-servidor");
  });

  it("si el servidor no té push, un navegador sense suport tampoc no ho ofereix", async () => {
    navegador.suportValor = "no-suportat";
    api.config = { enabled: false, public_key: null };
    const wrapper = muntar(navegador, api);
    await wrapper.vm.inicialitzar();
    expect(wrapper.vm.estat).toBe("desactivat-servidor");
  });

  it("sense api (entorns sense push) queda desactivat", async () => {
    const wrapper = muntar(navegador, null);
    await wrapper.vm.inicialitzar();
    expect(wrapper.vm.estat).toBe("desactivat-servidor");
  });

  it("un permís denegat es mostra com a bloquejat i no es torna a demanar", async () => {
    navegador.permisValor = "denied";
    const wrapper = muntar(navegador, api);
    await wrapper.vm.inicialitzar();
    expect(wrapper.vm.estat).toBe("bloquejat");
    expect(navegador.demanatPermis).toBe(0);
  });

  it("sense permís encara, ofereix activar-les però no el demana soles", async () => {
    const wrapper = muntar(navegador, api);
    await wrapper.vm.inicialitzar();
    expect(wrapper.vm.estat).toBe("inactiu");
    expect(navegador.demanatPermis).toBe(0);
  });

  it("activar demana el permís, subscriu amb la clau pública i registra la subscripció", async () => {
    const wrapper = muntar(navegador, api);
    await wrapper.vm.inicialitzar();
    await wrapper.vm.activar();
    expect(navegador.demanatPermis).toBe(1);
    expect(navegador.subscrit).toEqual(["CLAU-PUBLICA"]);
    expect(api.registrades).toEqual([{ token: "tok", subscripcio: SUBSCRIPCIO }]);
    expect(wrapper.vm.estat).toBe("actiu");
    expect(wrapper.vm.error).toBe("");
  });

  it("si l’usuari denega el permís, no es subscriu ni es registra res", async () => {
    navegador.respostaPermis = "denied";
    const wrapper = muntar(navegador, api);
    await wrapper.vm.inicialitzar();
    await wrapper.vm.activar();
    expect(wrapper.vm.estat).toBe("bloquejat");
    expect(navegador.subscrit).toEqual([]);
    expect(api.registrades).toEqual([]);
  });

  it("si es tanca el diàleg sense triar, continua inactiu", async () => {
    navegador.respostaPermis = "default";
    const wrapper = muntar(navegador, api);
    await wrapper.vm.inicialitzar();
    await wrapper.vm.activar();
    expect(wrapper.vm.estat).toBe("inactiu");
  });

  it("si el servidor rebutja la subscripció, ho diu i els avisos continuen sortint a Espais", async () => {
    api.fallaRegistre = true;
    const wrapper = muntar(navegador, api);
    await wrapper.vm.inicialitzar();
    await wrapper.vm.activar();
    expect(wrapper.vm.estat).toBe("inactiu");
    expect(wrapper.vm.error).toContain("No s’han pogut activar");
    expect(wrapper.vm.error).toContain("Els avisos continuen sortint aquí");
    expect(wrapper.vm.ocupat).toBe(false);
  });

  it("si el navegador falla en subscriure, ho diu", async () => {
    navegador.falla = "subscriure";
    const wrapper = muntar(navegador, api);
    await wrapper.vm.inicialitzar();
    await wrapper.vm.activar();
    expect(wrapper.vm.error).toContain("No s’han pogut activar");
    expect(api.registrades).toEqual([]);
  });

  it("amb permís i subscripció ja existents, la registra de nou al compte actual", async () => {
    navegador.permisValor = "granted";
    navegador.actual = SUBSCRIPCIO;
    const wrapper = muntar(navegador, api);
    await wrapper.vm.inicialitzar();
    expect(wrapper.vm.estat).toBe("actiu");
    expect(api.registrades).toEqual([{ token: "tok", subscripcio: SUBSCRIPCIO }]);
    expect(navegador.subscrit).toEqual([]);
  });

  it("amb permís però sense subscripció (ha sortit i torna a entrar), es torna a subscriure sola", async () => {
    navegador.permisValor = "granted";
    const wrapper = muntar(navegador, api);
    await wrapper.vm.inicialitzar();
    expect(wrapper.vm.estat).toBe("actiu");
    expect(navegador.subscrit).toEqual(["CLAU-PUBLICA"]);
    expect(navegador.demanatPermis).toBe(0);
  });

  it("si l’usuari les havia desactivat, no se li tornen a activar soles", async () => {
    navegador.permisValor = "granted";
    const wrapper = muntar(navegador, api);
    localStorage.setItem(CLAU_PUSH_DESACTIVAT, "1");
    await wrapper.vm.inicialitzar();
    expect(wrapper.vm.estat).toBe("inactiu");
    expect(navegador.subscrit).toEqual([]);
    await wrapper.vm.activar();
    expect(wrapper.vm.estat).toBe("actiu");
    expect(localStorage.getItem(CLAU_PUSH_DESACTIVAT)).toBeNull();
  });

  it("desactivar cancel·la la subscripció del navegador i del servidor", async () => {
    navegador.permisValor = "granted";
    navegador.actual = SUBSCRIPCIO;
    const wrapper = muntar(navegador, api);
    await wrapper.vm.inicialitzar();
    await wrapper.vm.desactivar();
    expect(wrapper.vm.estat).toBe("inactiu");
    expect(api.cancelades).toEqual([{ token: "tok", endpoint: SUBSCRIPCIO.endpoint }]);
    expect(localStorage.getItem(CLAU_PUSH_DESACTIVAT)).toBe("1");
    await flushPromises();
  });

  it("si el navegador no deixa desactivar, ho diu", async () => {
    navegador.permisValor = "granted";
    navegador.actual = SUBSCRIPCIO;
    const wrapper = muntar(navegador, api);
    await wrapper.vm.inicialitzar();
    navegador.falla = "cancelar";
    await wrapper.vm.desactivar();
    expect(wrapper.vm.error).toContain("No s’han pogut desactivar");
  });
});

describe("cancelaPushAlSortir", () => {
  it("cancel·la la subscripció d’aquest dispositiu abans de tancar la sessió", async () => {
    const navegador = new NavegadorFals();
    navegador.permisValor = "granted";
    navegador.actual = SUBSCRIPCIO;
    const api = new ApiFalsa();
    await cancelaPushAlSortir("tok", api, navegador);
    expect(api.cancelades).toEqual([{ token: "tok", endpoint: SUBSCRIPCIO.endpoint }]);
    expect(navegador.actual).toBeNull();
  });

  it("no fa res sense permís, sense suport o sense api", async () => {
    const navegador = new NavegadorFals();
    const api = new ApiFalsa();
    await cancelaPushAlSortir("tok", api, navegador);
    navegador.permisValor = "granted";
    navegador.suportValor = "no-suportat";
    await cancelaPushAlSortir("tok", api, navegador);
    await cancelaPushAlSortir("tok", null, navegador);
    await cancelaPushAlSortir("tok", api, null);
    expect(api.cancelades).toEqual([]);
    expect(navegador.cancelat).toBe(0);
  });

  it("un error no impedeix sortir", async () => {
    const navegador = new NavegadorFals();
    navegador.permisValor = "granted";
    navegador.actual = SUBSCRIPCIO;
    navegador.falla = "cancelar";
    await expect(cancelaPushAlSortir("tok", new ApiFalsa(), navegador)).resolves.toBeUndefined();
  });
});
