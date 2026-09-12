import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { flushPromises, mount } from "@vue/test-utils";

import { ApiError } from "../services/identitat";
import type { SessioDto } from "../services/identitat";
import { espaisApiKey, type EspaisApi } from "../services/espais";
import { finestresPerDefecte } from "../disponibilitat";
import { useSessioStore } from "../stores/sessio";
import IniciView from "./IniciView.vue";

const apiBuit: EspaisApi = {
  llistar: async () => [],
  obtenir: async () => ({
    id: "s1",
    entity_id: "e1",
    name: "Sala 1",
    capacity: 10,
    equipment: null,
    active: true,
    windows: finestresPerDefecte(),
  }),
  crear: async () => ({
    id: "s1",
    entity_id: "e1",
    name: "Sala 1",
    capacity: 10,
    equipment: null,
    active: true,
    windows: finestresPerDefecte(),
  }),
  actualitzar: async () => ({
    id: "s1",
    entity_id: "e1",
    name: "Sala 1",
    capacity: 10,
    equipment: null,
    active: true,
    windows: finestresPerDefecte(),
  }),
};

function muntar(dto?: SessioDto, api: EspaisApi = apiBuit) {
  localStorage.clear();
  const pinia = createPinia();
  setActivePinia(pinia);
  if (dto) {
    useSessioStore().iniciar(dto);
  }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "inici", component: IniciView },
      { path: "/registre", name: "registre", component: { template: "<div />" } },
      { path: "/iniciar-sessio", name: "iniciar-sessio", component: { template: "<div />" } },
      { path: "/espais/nou", name: "espai-nou", component: { template: "<div />" } },
      { path: "/coordinadors/convidar", name: "convidar-coordinador", component: { template: "<div />" } },
      { path: "/espais/:id", name: "espai-editar", component: { template: "<div />" } },
      { path: "/espais", name: "espais", component: { template: "<div />" } },
      { path: "/calendari", name: "calendari", component: { template: "<div />" } },
    ],
  });
  return mount(IniciView, {
    global: {
      plugins: [pinia, router],
      provide: { [espaisApiKey as symbol]: api },
    },
  });
}

const sessioAnna: SessioDto = {
  token: "t",
  entity_id: "e1",
  user_id: "u1",
  role: "responsible",
  entity_name: "AAVV Barri A",
  user_name: "Anna",
  typology: "associació de veïns",
};

describe("IniciView", () => {
  it("mostra el problema, la solució i com funciona sense CTAs d’accés", () => {
    const wrapper = muntar();
    expect(wrapper.text()).toContain("Qui té la sala, a quina hora, i amb quants?");
    expect(wrapper.text()).toContain("Gestionar un col·lectiu és molt més que tenir un grup de xat");
    expect(wrapper.text()).toContain("app interna i gratuïta");
    expect(wrapper.get("#com-funciona").text()).toBe("Com funciona");
    expect(wrapper.text()).toContain("Defineix els espais");
    expect(wrapper.text()).toContain("Reserva al calendari");
    expect(wrapper.text()).toContain("Governa i avisa");
    expect(wrapper.find("a[href='/registre']").exists()).toBe(false);
    expect(wrapper.find("a[href='/iniciar-sessio']").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("Registra l’entitat");
    expect(wrapper.text()).not.toContain("Inicia sessió");
    expect(wrapper.get(".landing-hero img").attributes("src")).toBe("/landing/hero.jpg");
    expect(wrapper.findAll(".landing-hero img")).toHaveLength(4);
    expect(wrapper.text()).toContain("Atura el fons");
    expect(wrapper.find("nav[aria-label='Prova de foto del hero']").exists()).toBe(false);
  });

  it("mostra l’empty state accionable quan no hi ha espais", async () => {
    const wrapper = muntar(sessioAnna);
    await flushPromises();
    expect(wrapper.text()).toContain("AAVV Barri A");
    expect(wrapper.text()).toContain("Defineix el primer espai");
    expect(wrapper.get("a[href='/espais/nou']").text()).toContain("Defineix el primer espai");
    expect(wrapper.get("a[href='/coordinadors/convidar']").text()).toContain("Convida coordinadors");
    expect(wrapper.find("#buit-titol").exists()).toBe(true);
    expect(wrapper.find("#llista-titol").exists()).toBe(false);
  });

  it("no convida ni defineix espais si el coordinador entra sense espais", async () => {
    const wrapper = muntar({ ...sessioAnna, role: "coordinator", user_name: "Carla" });
    await flushPromises();
    expect(wrapper.text()).toContain("Encara no hi ha espais");
    expect(wrapper.text()).not.toContain("Defineix el primer espai");
    expect(wrapper.text()).not.toContain("Convida coordinadors");
  });

  it("llista els espais de l’entitat quan n’hi ha", async () => {
    const wrapper = muntar(sessioAnna, {
      ...apiBuit,
      llistar: async () => [
        {
          id: "s1",
          entity_id: "e1",
          name: "Sala Pau Casals",
          capacity: 40,
          equipment: null,
          active: true,
          windows: finestresPerDefecte(),
        },
      ],
    });
    await flushPromises();
    expect(wrapper.text()).toContain("Sala Pau Casals");
    expect(wrapper.text()).toContain("Aforament: 40");
    expect(wrapper.text()).toContain("Aquest espai no té equipament");
    expect(wrapper.text()).toContain("Disponibilitat: Tots els dies 08:00–22:00");
    expect(wrapper.text()).toContain("Editar");
    expect(wrapper.get('a[href="/calendari"]').text()).toContain("Sala Pau Casals");
    expect(wrapper.find('a[href="/calendari?espai=s1"]').exists()).toBe(false);
    expect(wrapper.find("#buit-titol").exists()).toBe(false);
    expect(wrapper.find("#llista-titol").exists()).toBe(true);
    expect(wrapper.text()).not.toContain("Veure tots els espais");
  });

  it("mostra l’equipament a la targeta quan n’hi ha", async () => {
    const wrapper = muntar(sessioAnna, {
      ...apiBuit,
      llistar: async () => [
        {
          id: "s1",
          entity_id: "e1",
          name: "Sala d’assaig",
          capacity: 20,
          equipment: "piano, llums",
          active: true,
          windows: finestresPerDefecte(),
        },
      ],
    });
    await flushPromises();
    expect(wrapper.text()).toContain("Equipament: piano, llums");
    expect(wrapper.text()).not.toContain("Aquest espai no té equipament");
  });

  it("mostra l’error i no l’empty state si la llista falla", async () => {
    const wrapper = muntar(sessioAnna, {
      ...apiBuit,
      llistar: async () => {
        throw new ApiError("No s’han pogut carregar els espais.", 500);
      },
    });
    await flushPromises();
    expect(wrapper.text()).toContain("No s’han pogut carregar els espais.");
    expect(wrapper.text()).not.toContain("Defineix el primer espai");
    expect(wrapper.text()).not.toContain("Encara no heu definit cap espai");
  });
});
