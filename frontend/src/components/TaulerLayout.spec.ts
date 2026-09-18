import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter, RouterView } from "vue-router";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent } from "vue";

import TaulerLayout from "./TaulerLayout.vue";
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

async function muntar(path: string, dto: SessioDto = sessioAnna) {
  localStorage.clear();
  const pinia = createPinia();
  setActivePinia(pinia);
  useSessioStore().iniciar(dto);
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
    ],
  });
  await router.push(path);
  await router.isReady();
  const Host = defineComponent({
    components: { RouterView },
    template: "<RouterView />",
  });
  const wrapper = mount(Host, { global: { plugins: [pinia, router] } });
  await flushPromises();
  return { wrapper, router };
}

describe("TaulerLayout", () => {
  it("mostra les quatre opcions d’administració i el centre", async () => {
    const { wrapper } = await muntar("/espais");
    const nav = wrapper.get("nav[aria-label='Administració']");
    expect(nav.findAll("a").map((enllac) => enllac.text())).toEqual([
      "Colors de l’entitat",
      "Convida coordinadors",
      "Espais",
      "Estadístiques",
    ]);
    expect(nav.get("a[href='/espais']").attributes("aria-current")).toBe("page");
    expect(wrapper.text()).toContain("centre-espais");
  });

  it("mostra el nom de l’entitat i del responsable", async () => {
    const { wrapper } = await muntar("/espais");
    const lateral = wrapper.get("aside");
    expect(lateral.text()).toContain("Entitat");
    expect(lateral.text()).toContain("AAVV Barri A");
    expect(lateral.text()).toContain("associació de veïns");
    expect(lateral.text()).toContain("Anna");
    expect(lateral.text()).toContain("Responsable");
  });

  it("posa Surt al final del lateral, separat", async () => {
    const { wrapper } = await muntar("/espais");
    const nav = wrapper.get("nav[aria-label='Administració']");
    const items = nav.findAll("li");
    expect(items).toHaveLength(5);
    const surt = items[4].get("button");
    expect(surt.text()).toBe("Surt");
    expect(surt.classes()).toContain("text-error");
    expect(items[4].classes()).toContain("border-t");
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

  it("no mostra el lateral al coordinador", async () => {
    const { wrapper } = await muntar("/espais", { ...sessioAnna, role: "coordinator", user_name: "Carla" });
    expect(wrapper.find("nav[aria-label='Administració']").exists()).toBe(false);
    expect(wrapper.text()).toContain("centre-espais");
  });
});
