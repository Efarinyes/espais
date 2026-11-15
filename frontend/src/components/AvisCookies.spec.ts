import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";

import { CLAU_AVIS_COOKIES } from "../composables/useAvisCookies";
import AvisCookies from "./AvisCookies.vue";

function muntar() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { template: "<div />" } },
      { path: "/politica-de-cookies", name: "politica-cookies", component: { template: "<p>politica</p>" } },
    ],
  });
  return { router, wrapper: mount(AvisCookies, { global: { plugins: [router] } }) };
}

describe("AvisCookies", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("a la primera visita informa i enllaça la política, sense acceptar ni rebutjar", () => {
    const { wrapper } = muntar();
    const avis = wrapper.get("#nota-funcio");
    expect(avis.text()).toContain("No mesurem visites ni fem servir cookies de tercers");
    expect(avis.get("a").text()).toBe("Política de cookies");
    expect(avis.get("a").attributes("href")).toBe("/politica-de-cookies");
    expect(avis.get("button").text()).toBe("Tanca l’avís");
    expect(avis.text()).not.toContain("Accepta");
    expect(avis.text()).not.toContain("Rebutja");
    expect(avis.attributes("id")).not.toMatch(/cookie/i);
    expect(avis.attributes("class") ?? "").not.toMatch(/cookie/i);
    expect(avis.get("h2").attributes("id")).not.toMatch(/cookie/i);
    for (const node of avis.findAll("a, button")) {
      expect(node.attributes("class") ?? "").not.toMatch(/cookie/i);
      expect(node.attributes("id") ?? "").not.toMatch(/cookie/i);
    }
    expect(localStorage.getItem(CLAU_AVIS_COOKIES)).toBeNull();
  });

  it("obrir la política no desa cap decisió", async () => {
    const { wrapper, router } = muntar();
    await wrapper.get("a").trigger("click");
    await router.isReady();
    expect(router.currentRoute.value.path).toBe("/politica-de-cookies");
    expect(localStorage.getItem(CLAU_AVIS_COOKIES)).toBeNull();
  });

  it("tancar amaga l’avís i el manté tancat en tornar a muntar", async () => {
    const { wrapper } = muntar();
    await wrapper.get("button").trigger("click");
    expect(wrapper.find("#nota-funcio").exists()).toBe(false);
    expect(localStorage.getItem(CLAU_AVIS_COOKIES)).toBe("tancat");
    const segona = muntar();
    expect(segona.wrapper.find("#nota-funcio").exists()).toBe(false);
  });
});
