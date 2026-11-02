import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import LandingPage from "./LandingPage.vue";

describe("LandingPage", () => {
  it("no promet un avís immediat ni un bloqueig d’aforament", () => {
    const wrapper = mount(LandingPage);
    expect(wrapper.text()).toContain("Mira les estadístiques de cada espai");
    expect(wrapper.text()).toContain("rep un avís a l’app i per correu");
    expect(wrapper.text()).toContain("avisa i igualment es pot desar");
    expect(wrapper.text()).not.toContain("ho veu a l’acte");
    expect(wrapper.text()).not.toContain("Anàlisi");
    expect(wrapper.text()).not.toContain("controlar");
  });
});
