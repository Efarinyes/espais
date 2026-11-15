import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import PoliticaCookiesView from "./PoliticaCookiesView.vue";

describe("PoliticaCookiesView", () => {
  it("descriu només les tecnologies pròpies que Espais fa servir", () => {
    const wrapper = mount(PoliticaCookiesView);
    const text = wrapper.text();
    expect(wrapper.get("h1").text()).toBe("Política de cookies");
    for (const nom of ["espais.mode", "espais.aparenca", "espais.sessio", "espais.avis-cookies", "service worker"]) {
      expect(text).toContain(nom);
    }
    expect(text).toContain("7 dies");
    expect(text).toContain("Eduard Farinyes");
    expect(text).toContain("No conté la contrasenya ni el correu");
    expect(text).toContain("cookies de tercers");
    expect(text).not.toContain("Google");
    expect(text).not.toMatch(/@/);
    expect(text).not.toMatch(/\b\d{8}[A-Z]\b/);
  });

  it("explica que no hi ha consentiment per donar ni per retirar", () => {
    const text = mount(PoliticaCookiesView).text();
    expect(text).toContain("No hi ha botó d’acceptar ni de rebutjar");
    expect(text).toContain("Tancar l’avís no és un consentiment");
    expect(text).toContain("No hi ha un consentiment per retirar");
    expect(text).toContain("no hi ha consentiment per renovar");
    expect(text).not.toContain("Accepta les cookies");
  });
});
