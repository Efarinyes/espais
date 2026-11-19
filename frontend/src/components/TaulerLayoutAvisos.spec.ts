import { afterEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter, RouterView } from "vue-router";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent } from "vue";

import TaulerLayout from "./TaulerLayout.vue";
import { disparadorCalendariKey } from "../calendariLive";
import { avisosApiKey, type AvisDto, type AvisosApi } from "../services/avisos";
import { identityApiKey, type IdentityApi, type SessioDto } from "../services/identitat";
import {
  navegadorPushKey,
  pushApiKey,
  type NavegadorPush,
  type PushApi,
  type SubscripcioPush,
} from "../services/push";
import { useSessioStore } from "../stores/sessio";

const coordinador: SessioDto = {
  token: "tok",
  entity_id: "e1",
  user_id: "u2",
  role: "coordinator",
  entity_name: "AAVV Barri A",
  user_name: "Carla",
  typology: null,
};
const responsable: SessioDto = { ...coordinador, user_id: "u1", role: "responsible", user_name: "Anna" };

function avis(id: string, readAt: string | null = null): AvisDto {
  return {
    id,
    type: "reservation_cancelled",
    reservation_id: "r1",
    entity_name: "AAVV Barri A",
    space_name: "Sala 1",
    starts_at: "2026-09-08T08:00:00Z",
    ends_at: "2026-09-08T09:00:00Z",
    new_starts_at: null,
    new_ends_at: null,
    responsible_name: "Anna",
    reason: null,
    read_at: readAt,
    created_at: "2026-09-08T10:00:00Z",
  };
}

const SUBSCRIPCIO: SubscripcioPush = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc",
  keys: { p256dh: "p", auth: "a" },
};

async function muntar(
  path: string,
  dto: SessioDto,
  avisos: AvisDto[],
  opcions: { push?: boolean } = {},
) {
  localStorage.clear();
  const pinia = createPinia();
  setActivePinia(pinia);
  useSessioStore().iniciar(dto);
  const pagina = (text: string) => ({ template: `<div>${text}</div>` });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "inici", component: pagina("landing") },
      ...[
        ["/espais", "espais"],
        ["/avisos", "avisos"],
        ["/avisos-enviats", "avisos-enviats"],
        ["/calendari", "calendari"],
        ["/analisi", "analisi"],
        ["/coordinadors/convidar", "convidar-coordinador"],
        ["/entitat/colors", "colors-entitat"],
      ].map(([path, name]) => ({
        path,
        component: TaulerLayout,
        children: [{ path: "", name, component: pagina(`centre-${name}`) }],
      })),
    ],
  });
  await router.push(path);
  await router.isReady();
  const registrades: SubscripcioPush[] = [];
  const cancelades: string[] = [];
  let subscripcio: SubscripcioPush | null = SUBSCRIPCIO;
  const pushApi: PushApi = {
    configuracio: async () => ({ enabled: true, public_key: "K" }),
    registrar: async (_token, item) => {
      registrades.push(item);
    },
    cancelar: async (_token, endpoint) => {
      cancelades.push(endpoint);
    },
  };
  const navegador: NavegadorPush = {
    suport: () => "suportat",
    permis: () => "granted",
    demanarPermis: async () => "granted",
    subscripcioActual: async () => subscripcio,
    subscriure: async () => SUBSCRIPCIO,
    cancelar: async () => {
      const endpoint = subscripcio?.endpoint ?? null;
      subscripcio = null;
      return endpoint;
    },
  };
  const Host = defineComponent({ components: { RouterView }, template: "<RouterView />" });
  const avisosApi: AvisosApi = {
    llistar: async () => avisos,
    marcarLlegit: async (_token, id) => avisos.find((item) => item.id === id) ?? avisos[0],
    arxivar: async () => undefined,
  };
  const wrapper = mount(Host, {
    attachTo: document.body,
    global: {
      plugins: [pinia, router],
      provide: {
        [avisosApiKey as symbol]: avisosApi,
        [identityApiKey as symbol]: { tancarSessio: async () => undefined } as IdentityApi,
        [disparadorCalendariKey as symbol]: { iniciar: () => () => undefined },
        ...(opcions.push === false
          ? {}
          : { [pushApiKey as symbol]: pushApi, [navegadorPushKey as symbol]: navegador }),
      },
    },
  });
  await flushPromises();
  return { wrapper, router, registrades, cancelades };
}

describe("TaulerLayout: avisos pendents del coordinador", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("mostra un avís clar, amb enllaç a la safata, quan hi ha avisos sense llegir", async () => {
    const { wrapper } = await muntar("/espais", coordinador, [avis("a1"), avis("a2"), avis("a3", "2026-09-08T11:00:00Z")]);
    const banner = wrapper.get("[data-avisos-pendents]");
    expect(banner.text()).toContain("Tens 2 avisos nous");
    expect(banner.attributes("href")).toBe("/avisos");
    expect(banner.attributes("role")).toBe("status");
    expect(banner.classes()).toContain("min-h-11");
  });

  it("en singular diu «1 avís nou»", async () => {
    const { wrapper } = await muntar("/espais", coordinador, [avis("a1")]);
    expect(wrapper.get("[data-avisos-pendents]").text()).toContain("Tens 1 avís nou");
  });

  it("no molesta quan tot està llegit, a la safata mateixa ni al responsable", async () => {
    const llegits = [avis("a1", "2026-09-08T11:00:00Z")];
    expect((await muntar("/espais", coordinador, llegits)).wrapper.find("[data-avisos-pendents]").exists()).toBe(false);
    document.body.innerHTML = "";
    expect((await muntar("/avisos", coordinador, [avis("a1")])).wrapper.find("[data-avisos-pendents]").exists()).toBe(
      false,
    );
    document.body.innerHTML = "";
    expect((await muntar("/espais", responsable, [avis("a1")])).wrapper.find("[data-avisos-pendents]").exists()).toBe(
      false,
    );
  });

  it("el botó del menú mòbil mostra el compte i l’anuncia", async () => {
    const { wrapper } = await muntar("/espais", coordinador, [avis("a1"), avis("a2")]);
    const boto = wrapper.get("[data-obre-menu]");
    expect(boto.get("[data-pendents-menu]").text()).toBe("2");
    expect(boto.attributes("aria-label")).toBe("Menú, AAVV Barri A, 2 avisos nous");
  });

  it("sense avisos pendents el botó del menú queda net", async () => {
    const { wrapper } = await muntar("/espais", coordinador, []);
    expect(wrapper.find("[data-pendents-menu]").exists()).toBe(false);
    expect(wrapper.get("[data-obre-menu]").attributes("aria-label")).toBe("Menú, AAVV Barri A");
  });

  it("en entrar al tauler, el coordinador deixa el dispositiu subscrit al seu compte", async () => {
    const { registrades } = await muntar("/espais", coordinador, []);
    expect(registrades).toEqual([SUBSCRIPCIO]);
  });

  it("el responsable no registra cap subscripció", async () => {
    const { registrades } = await muntar("/espais", responsable, []);
    expect(registrades).toEqual([]);
  });

  it("en sortir, el coordinador deixa de rebre push en aquest dispositiu", async () => {
    const { wrapper, cancelades, router } = await muntar("/espais", coordinador, []);
    await wrapper.get("nav[aria-label='Navegació']").get("button").trigger("click");
    await flushPromises();
    expect(cancelades).toEqual([SUBSCRIPCIO.endpoint]);
    expect(router.currentRoute.value.name).toBe("inici");
  });

  it("sense push configurat al frontend, tot continua funcionant", async () => {
    const { wrapper, router } = await muntar("/espais", coordinador, [avis("a1")], { push: false });
    expect(wrapper.find("[data-avisos-pendents]").exists()).toBe(true);
    await wrapper.get("nav[aria-label='Navegació']").get("button").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("inici");
  });

  it("el responsable té «Avisos enviats» i el coordinador no", async () => {
    const resp = await muntar("/espais", responsable, []);
    expect(resp.wrapper.get("a[href='/avisos-enviats']").text()).toBe("Avisos enviats");
    document.body.innerHTML = "";
    const coord = await muntar("/espais", coordinador, []);
    expect(coord.wrapper.find("a[href='/avisos-enviats']").exists()).toBe(false);
  });
});
