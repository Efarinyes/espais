import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";

import LandingPage from "./LandingPage.vue";

function muntar() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: LandingPage },
      { path: "/politica-de-cookies", component: { template: "<p>politica</p>" } },
    ],
  });
  return mount(LandingPage, { global: { plugins: [router] } });
}

describe("LandingPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("no promet un avís immediat ni un bloqueig d’aforament", () => {
    const wrapper = muntar();
    expect(wrapper.text()).toContain("Mira les estadístiques de cada espai");
    expect(wrapper.text()).toContain("rep un avís a l’app i per correu");
    expect(wrapper.text()).toContain("avisa i igualment es pot desar");
    expect(wrapper.text()).not.toContain("ho veu a l’acte");
    expect(wrapper.text()).not.toContain("Anàlisi");
    expect(wrapper.text()).not.toContain("controlar");
  });

  it("mostra l’avís de cookies amb enllaç a la política", () => {
    const avis = muntar().get("#avis-cookies");
    expect(avis.get("a").attributes("href")).toBe("/politica-de-cookies");
    expect(avis.get("button").text()).toBe("Tanca l’avís");
  });
});
