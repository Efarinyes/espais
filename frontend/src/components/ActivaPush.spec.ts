import { afterEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { flushPromises, mount } from "@vue/test-utils";

import ActivaPush from "./ActivaPush.vue";
import type { SessioDto } from "../services/identitat";
import {
  navegadorPushKey,
  pushApiKey,
  type NavegadorPush,
  type PermisPush,
  type PushApi,
  type PushConfigDto,
  type SubscripcioPush,
  type SuportPush,
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
const SUBSCRIPCIO: SubscripcioPush = { endpoint: "https://fcm.googleapis.com/fcm/send/x", keys: { p256dh: "p", auth: "a" } };

async function muntar(opcions: {
  suport?: SuportPush;
  permis?: PermisPush;
  respostaPermis?: PermisPush;
  config?: PushConfigDto;
  subscripcio?: SubscripcioPush | null;
}) {
  localStorage.clear();
  const pinia = createPinia();
  setActivePinia(pinia);
  useSessioStore().iniciar(sessioCoord);
  let permis: PermisPush = opcions.permis ?? "default";
  let subscripcio = opcions.subscripcio ?? null;
  const registrades: SubscripcioPush[] = [];
  const cancelades: string[] = [];
  const navegador: NavegadorPush = {
    suport: () => opcions.suport ?? "suportat",
    permis: () => permis,
    demanarPermis: async () => {
      permis = opcions.respostaPermis ?? "granted";
      return permis;
    },
    subscripcioActual: async () => subscripcio,
    subscriure: async () => {
      subscripcio = SUBSCRIPCIO;
      return SUBSCRIPCIO;
    },
    cancelar: async () => {
      const endpoint = subscripcio?.endpoint ?? null;
      subscripcio = null;
      return endpoint;
    },
  };
  const api: PushApi = {
    configuracio: async () => opcions.config ?? { enabled: true, public_key: "K" },
    registrar: async (_token, item) => {
      registrades.push(item);
    },
    cancelar: async (_token, endpoint) => {
      cancelades.push(endpoint);
    },
  };
  const wrapper = mount(ActivaPush, {
    global: {
      plugins: [pinia],
      provide: { [pushApiKey as symbol]: api, [navegadorPushKey as symbol]: navegador },
    },
  });
  await flushPromises();
  return { wrapper, registrades, cancelades };
}

describe("ActivaPush", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("no mostra res si el servidor no té push configurat", async () => {
    const { wrapper } = await muntar({ config: { enabled: false, public_key: null } });
    expect(wrapper.find("[data-activa-push]").exists()).toBe(false);
  });

  it("ofereix activar les notificacions i les activa amb un clic", async () => {
    const { wrapper, registrades } = await muntar({});
    const boto = wrapper.get("button");
    expect(boto.text()).toBe("Activa les notificacions");
    expect(boto.classes()).toContain("min-h-11");
    await boto.trigger("click");
    await flushPromises();
    expect(registrades).toEqual([SUBSCRIPCIO]);
    expect(wrapper.text()).toContain("Aquest dispositiu rebrà un avís");
    expect(wrapper.get("button").text()).toBe("Desactiva les notificacions");
  });

  it("si ja són actives, permet desactivar-les i les cancel·la al servidor", async () => {
    const { wrapper, cancelades } = await muntar({ permis: "granted", subscripcio: SUBSCRIPCIO });
    expect(wrapper.get("button").text()).toBe("Desactiva les notificacions");
    await wrapper.get("button").trigger("click");
    await flushPromises();
    expect(cancelades).toEqual([SUBSCRIPCIO.endpoint]);
    expect(wrapper.get("button").text()).toBe("Activa les notificacions");
  });

  it("explica com desbloquejar-les si el permís està denegat, sense botó per forçar-ho", async () => {
    const { wrapper } = await muntar({ permis: "denied" });
    expect(wrapper.text()).toContain("Has bloquejat les notificacions d’Espais");
    expect(wrapper.find("button").exists()).toBe(false);
  });

  it("si denega el permís en activar-les, queda bloquejat i no es registra res", async () => {
    const { wrapper, registrades } = await muntar({ respostaPermis: "denied" });
    await wrapper.get("button").trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("Has bloquejat les notificacions");
    expect(registrades).toEqual([]);
  });

  it("a iOS dins del navegador explica que cal afegir l’app a la pantalla d’inici", async () => {
    const { wrapper } = await muntar({ suport: "cal-instalar" });
    expect(wrapper.text()).toContain("afegir Espais a la pantalla d’inici");
    expect(wrapper.find("button").exists()).toBe(false);
  });

  it("en un navegador sense push diu que els avisos continuaran sortint a Espais", async () => {
    const { wrapper } = await muntar({ suport: "no-suportat" });
    expect(wrapper.text()).toContain("no pot rebre notificacions fora d’Espais");
    expect(wrapper.find("button").exists()).toBe(false);
  });

  it("recorda que el push no compta com a lectura", async () => {
    const { wrapper } = await muntar({});
    expect(wrapper.text()).toContain("no compta com a llegida");
  });
});
