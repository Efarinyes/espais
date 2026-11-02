import { afterEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter, RouterView } from "vue-router";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent } from "vue";

import TaulerLayout from "./TaulerLayout.vue";
import { disparadorCalendariKey } from "../calendariLive";
import { avisosApiKey, type AvisDto, type AvisosApi } from "../services/avisos";
import { identityApiKey, type IdentityApi, type SessioDto } from "../services/identitat";
import { useSessioStore } from "../stores/sessio";

const sessioAnna: SessioDto = {
  token: "t",
  entity_id: "e1",
  user_id: "u1",
  role: "responsible",
  entity_name: "AAVV Barri A",
  user_name: "Anna",
  typology: "associació de veïns",
};

async function muntar(
  path: string,
  dto: SessioDto | null = sessioAnna,
  avisos: AvisDto[] = [],
  tancarSessio: IdentityApi["tancarSessio"] = async () => undefined,
) {
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
    attachTo: document.body,
    global: {
      plugins: [pinia, router],
      provide: {
        [avisosApiKey as symbol]: avisosApi,
        [identityApiKey as symbol]: { tancarSessio } as IdentityApi,
        [disparadorCalendariKey as symbol]: { iniciar: () => () => undefined },
      },
    },
  });
  await flushPromises();
  return { wrapper, router };
}

function esMenuPetit(amplada: number): boolean {
  return amplada < 1024;
}

function textosMenu(wrapper: { get: (selector: string) => { findAll: (selector: string) => { text: () => string }[] } }, selector: string) {
  return wrapper
    .get(selector)
    .findAll("a")
    .map((enllac) => enllac.text().replace(/\s+/g, " ").trim());
}

describe("TaulerLayout", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });
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
    expect(localStorage.getItem("espais.sessio")).toBeNull();
    expect(router.currentRoute.value.name).toBe("inici");
  });

  it("conserva la sessió si el servidor no confirma el tancament", async () => {
    const { wrapper, router } = await muntar("/espais", sessioAnna, [], async () => {
      throw new Error("xarxa");
    });
    const desada = localStorage.getItem("espais.sessio");
    await wrapper.get("nav[aria-label='Administració']").get("button").trigger("click");
    await flushPromises();
    expect(useSessioStore().iniciada).toBe(true);
    expect(localStorage.getItem("espais.sessio")).toBe(desada);
    expect(router.currentRoute.value.name).toBe("espais");
    expect(wrapper.text()).toContain("No s’ha pogut confirmar el tancament de la sessió.");
  });

  it("marca Estadístiques com a pàgina activa", async () => {
    const { wrapper } = await muntar("/analisi");
    expect(wrapper.get("a[href='/analisi']").attributes("aria-current")).toBe("page");
    expect(wrapper.get("a[href='/espais']").attributes("aria-current")).toBeUndefined();
    expect(wrapper.text()).toContain("centre-analisi");
  });

  it("el botó hamburguesa és de pantalles petites i l’escriptori conserva el lateral", async () => {
    const { wrapper } = await muntar("/espais");
    const boto = wrapper.get("[data-obre-menu]");
    const escriptori = wrapper.get("aside .hidden.lg\\:block");
    expect(boto.element.parentElement?.className).toContain("lg:hidden");
    expect(escriptori.classes()).toContain("lg:block");
    expect(wrapper.find("details").exists()).toBe(false);
    expect(wrapper.find("#menu-mobil").exists()).toBe(false);
    for (const amplada of [360, 390, 430, 768]) {
      expect(esMenuPetit(amplada)).toBe(true);
    }
    expect(esMenuPetit(1280)).toBe(false);
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

  it("obre el menú superposat sense moure el contingut", async () => {
    const { wrapper } = await muntar("/espais");
    const contingut = wrapper.get("[data-contingut]").element;
    const abans = contingut.getBoundingClientRect();
    await wrapper.get("[data-obre-menu]").trigger("click");
    const panell = wrapper.get("#menu-mobil");
    expect(panell.classes()).toContain("fixed");
    expect(panell.classes()).toContain("overflow-y-auto");
    expect(wrapper.get("[data-fons-menu]").classes()).toContain("fixed");
    expect(contingut.getBoundingClientRect()).toEqual(abans);
    expect(wrapper.get("[data-obre-menu]").attributes("aria-expanded")).toBe("true");
  });

  it("tanca el menú amb el botó, el fons i Escape, i torna el focus", async () => {
    const { wrapper } = await muntar("/espais");
    const boto = wrapper.get("[data-obre-menu]");
    await boto.trigger("click");
    await flushPromises();
    expect(document.activeElement).toBe(wrapper.get("[data-tanca-menu]").element);
    await wrapper.get("[data-tanca-menu]").trigger("click");
    await flushPromises();
    expect(wrapper.find("#menu-mobil").exists()).toBe(false);
    expect(document.activeElement).toBe(boto.element);

    await boto.trigger("click");
    await wrapper.get("[data-fons-menu]").trigger("click");
    await flushPromises();
    expect(wrapper.find("#menu-mobil").exists()).toBe(false);
    expect(document.activeElement).toBe(boto.element);

    await boto.trigger("click");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await flushPromises();
    expect(wrapper.find("#menu-mobil").exists()).toBe(false);
    expect(wrapper.find("[data-fons-menu]").exists()).toBe(false);
    expect(document.activeElement).toBe(boto.element);
  });

  it("tanca el menú en navegar i es pot tornar a obrir", async () => {
    const { wrapper } = await muntar("/espais");
    await wrapper.get("[data-obre-menu]").trigger("click");
    await wrapper.get("#menu-mobil a[href='/calendari']").trigger("click");
    await flushPromises();
    expect(wrapper.find("#menu-mobil").exists()).toBe(false);
    expect(document.activeElement).toBe(wrapper.get("[data-contingut]").element);
    await wrapper.get("[data-obre-menu]").trigger("click");
    expect(wrapper.find("#menu-mobil").exists()).toBe(true);
    expect(wrapper.get("#menu-mobil a[href='/calendari']").attributes("aria-current")).toBe("page");
  });

  it("el panell mòbil repeteix les opcions del rol, sense afegir-ne", async () => {
    const responsable = await muntar("/espais");
    await responsable.wrapper.get("[data-obre-menu]").trigger("click");
    expect(textosMenu(responsable.wrapper, "#menu-mobil")).toEqual(textosMenu(responsable.wrapper, "aside .hidden"));
    responsable.wrapper.unmount();

    const coordinador = await muntar("/espais", { ...sessioAnna, role: "coordinator", user_name: "Carla" });
    await coordinador.wrapper.get("[data-obre-menu]").trigger("click");
    expect(textosMenu(coordinador.wrapper, "#menu-mobil")).toEqual(["Espais", "Calendari", "Avisos"]);
    expect(coordinador.wrapper.get("#menu-mobil").text()).not.toContain("Convida coordinadors");
    expect(coordinador.wrapper.get("#menu-mobil").text()).not.toContain("Tria els colors");
  });

  it("no mostra el lateral sense sessió", async () => {
    const { wrapper } = await muntar("/espais", null);
    expect(wrapper.find("nav[aria-label='Administració']").exists()).toBe(false);
    expect(wrapper.text()).toContain("centre-espais");
  });
});
