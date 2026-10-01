import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter, RouterView } from "vue-router";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent } from "vue";

import TaulerLayout from "./TaulerLayout.vue";
import { disparadorCalendariKey } from "../calendariLive";
import { avisosApiKey, type AvisDto, type AvisosApi } from "../services/avisos";
import { useSessioStore } from "../stores/sessio";
import type { SessioDto } from "../services/identitat";

const sessioAnna: SessioDto = {
  token: "t",
  entity_id: "e1",
  user_id: "u1",
  role: "responsible",
  entity_name: "AAVV Barri A",
  user_name: "Anna",
  typology: "associació de veïns",
};

async function muntar(path: string, dto: SessioDto | null = sessioAnna, avisos: AvisDto[] = []) {
  localStorage.clear();
  const pinia = createPinia();
  setActivePinia(pinia);
  if (dto) {
    useSessioStore().iniciar(dto);
  }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "inici", component: { template: "<div>landing</div>" } },
      {
        path: "/espais",
        component: TaulerLayout,
        children: [{ path: "", name: "espais", component: { template: "<div>centre-espais</div>" } }],
      },
      {
        path: "/espais/nou",
        component: TaulerLayout,
        children: [{ path: "", name: "espai-nou", component: { template: "<div>centre-nou</div>" } }],
      },
      {
        path: "/analisi",
        component: TaulerLayout,
        children: [{ path: "", name: "analisi", component: { template: "<div>centre-analisi</div>" } }],
      },
      {
        path: "/entitat/colors",
        component: TaulerLayout,
        children: [{ path: "", name: "colors-entitat", component: { template: "<div>centre-colors</div>" } }],
      },
      {
        path: "/coordinadors/convidar",
        component: TaulerLayout,
        children: [
          { path: "", name: "convidar-coordinador", component: { template: "<div>centre-convida</div>" } },
        ],
      },
      {
        path: "/calendari",
        component: TaulerLayout,
        children: [{ path: "", name: "calendari", component: { template: "<div>centre-calendari</div>" } }],
      },
      {
        path: "/avisos",
        component: TaulerLayout,
        children: [{ path: "", name: "avisos", component: { template: "<div>centre-avisos</div>" } }],
      },
    ],
  });
  await router.push(path);
  await router.isReady();
  const Host = defineComponent({
    components: { RouterView },
    template: "<RouterView />",
  });
  const avisosApi: AvisosApi = {
    llistar: async () => avisos,
    marcarLlegit: async (_token, id) => avisos.find((avis) => avis.id === id) ?? avisos[0],
    arxivar: async () => undefined,
  };
  const wrapper = mount(Host, {
    global: {
      plugins: [pinia, router],
      provide: {
        [avisosApiKey as symbol]: avisosApi,
        [disparadorCalendariKey as symbol]: { iniciar: () => () => undefined },
      },
    },
  });
  await flushPromises();
  return { wrapper, router };
}

describe("TaulerLayout", () => {
  it("mostra les opcions del responsable i el centre", async () => {
    const { wrapper } = await muntar("/espais");
    const nav = wrapper.get("nav[aria-label='Administració']");
    expect(nav.findAll("a").map((enllac) => enllac.text())).toEqual([
      "Convida coordinadors",
      "Espais",
      "Calendari",
      "Estadístiques",
      "Tria els colors",
    ]);
    expect(nav.get("a[href='/espais']").attributes("aria-current")).toBe("page");
    expect(wrapper.text()).toContain("centre-espais");
  });

  it("mostra el nom de l’entitat i de la persona, sense tipologia ni rol", async () => {
    const { wrapper } = await muntar("/espais");
    const lateral = wrapper.get("aside");
    expect(lateral.text()).toContain("Entitat");
    expect(lateral.text()).toContain("AAVV Barri A");
    expect(lateral.text()).toContain("Hola,");
    expect(lateral.text()).toContain("Anna");
    expect(lateral.text()).not.toContain("associació de veïns");
    expect(lateral.text()).not.toContain("Responsable");
  });

  it("posa Tria els colors i Surt al final, separats de les accions", async () => {
    const { wrapper } = await muntar("/espais");
    const nav = wrapper.get("nav[aria-label='Administració']");
    const items = nav.findAll("li");
    expect(items).toHaveLength(6);
    expect(items[3].get("a").text()).toBe("Estadístiques");
    expect(items[4].get("a").text()).toBe("Tria els colors");
    expect(items[4].classes()).toContain("border-t");
    const surt = items[5].get("button");
    expect(surt.text()).toBe("Surt");
    expect(surt.classes()).toContain("text-error");
  });

  it("surt de la sessió des del lateral", async () => {
    const { wrapper, router } = await muntar("/espais");
    await wrapper.get("nav[aria-label='Administració']").get("button").trigger("click");
    await flushPromises();
    expect(useSessioStore().iniciada).toBe(false);
    expect(router.currentRoute.value.name).toBe("inici");
  });

  it("marca Estadístiques com a pàgina activa", async () => {
    const { wrapper } = await muntar("/analisi");
    expect(wrapper.get("a[href='/analisi']").attributes("aria-current")).toBe("page");
    expect(wrapper.get("a[href='/espais']").attributes("aria-current")).toBeUndefined();
    expect(wrapper.text()).toContain("centre-analisi");
  });

  it("plega l’administració dins d’un details tancat a mòbil", async () => {
    const { wrapper } = await muntar("/espais");
    const plegat = wrapper.get("aside details");
    expect(plegat.attributes("open")).toBeUndefined();
    expect(plegat.get("summary").text()).toContain("AAVV Barri A");
    expect(plegat.get("summary svg").attributes("aria-hidden")).toBe("true");
    const escriptori = wrapper.get("aside .hidden.lg\\:block");
    expect(escriptori.exists()).toBe(true);
    expect(escriptori.find("svg").exists()).toBe(false);
  });

  it("marca Calendari com a pàgina activa", async () => {
    const { wrapper } = await muntar("/calendari");
    expect(wrapper.get("a[href='/calendari']").attributes("aria-current")).toBe("page");
    expect(wrapper.get("a[href='/espais']").attributes("aria-current")).toBeUndefined();
    expect(wrapper.text()).toContain("centre-calendari");
  });

  it("el coordinador veu les seves opcions i el compte d’avisos", async () => {
    const { wrapper } = await muntar("/espais", { ...sessioAnna, role: "coordinator", user_name: "Carla" }, [
      {
        id: "a1",
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
        read_at: null,
        created_at: "2026-09-08T10:00:00Z",
      },
    ]);
    const nav = wrapper.get("nav[aria-label='Administració']");
    expect(nav.findAll("a").map((enllac) => enllac.text().replace(/\s+/g, " ").trim())).toEqual([
      "Espais",
      "Calendari",
      "Avisos 1",
    ]);
    expect(nav.text()).not.toContain("Convida coordinadors");
    expect(nav.text()).not.toContain("Estadístiques");
    expect(nav.text()).not.toContain("Tria els colors");
    expect(nav.get("a[href='/avisos']").text()).toContain("1");
  });

  it("no mostra el lateral sense sessió", async () => {
    const { wrapper } = await muntar("/espais", null);
    expect(wrapper.find("nav[aria-label='Administració']").exists()).toBe(false);
    expect(wrapper.text()).toContain("centre-espais");
  });
});
